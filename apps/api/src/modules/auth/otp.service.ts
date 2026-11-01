import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { currentRequestContext } from '../../common/context/request-context';
import { Env } from '../../config/env';
import { SmsProvider } from '../../notifications/sms/sms.provider';
import { hmac, randomCode, safeEqualHex } from './crypto';
import { AuthOtp, OtpPurpose } from './entities/auth-otp.entity';

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 30;

const MESSAGES: Record<OtpPurpose, (code: string) => string> = {
  LOGIN: (code) => `App Car: seu código de acesso é ${code}. Não compartilhe.`,
  PHONE_VERIFY: (code) => `App Car: seu código de confirmação é ${code}. Não compartilhe.`,
  PHONE_CHANGE: (code) => `App Car: seu código para confirmar este celular é ${code}. Não compartilhe.`,
  ACCOUNT_DELETE: (code) => `App Car: seu código para EXCLUIR sua conta é ${code}. Se não foi você, ignore.`,
};

interface IssueOptions {
  userId: string;
  purpose: OtpPurpose;
  phone: string;
  vehicleId?: string | null;
}

@Injectable()
export class OtpService {
  private readonly secret: string;
  private readonly webHost: string;

  constructor(
    @InjectRepository(AuthOtp) private readonly otps: Repository<AuthOtp>,
    private readonly sms: SmsProvider,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
    this.webHost = new URL(config.get('WEB_URL', { infer: true })).host;
  }

  async issue({ userId, purpose, phone, vehicleId = null }: IssueOptions) {
    await this.otps.update({ userId, purpose, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) }, { expiresAt: new Date() });

    const id = randomUUID();
    const code = randomCode();
    await this.otps.insert({
      id,
      userId,
      purpose,
      vehicleId,
      targetPhone: phone,
      codeHash: hmac(this.secret, `${id}:${code}`),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      attempts: 0,
      consumedAt: null,
      ip: currentRequestContext().ip,
    });
    await this.sms.send(phone, `${MESSAGES[purpose](code)}\n\n@${this.webHost} #${code}`);
  }

  async verify(userId: string, purpose: OtpPurpose, code: string): Promise<AuthOtp> {
    const otp = await this.otps.findOne({
      where: { userId, purpose, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw expired();

    if (!safeEqualHex(otp.codeHash, hmac(this.secret, `${otp.id}:${code}`))) {
      const attempts = otp.attempts + 1;
      const left = OTP_MAX_ATTEMPTS - attempts;
      await this.otps.update({ id: otp.id }, left > 0 ? { attempts } : { attempts, expiresAt: new Date() });
      if (left <= 0) throw expired();
      throw new HttpException(
        { statusCode: 401, message: `Código incorreto. Restam ${left} ${left === 1 ? 'tentativa' : 'tentativas'}.`, attemptsLeft: left },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.otps.update({ id: otp.id }, { consumedAt: new Date() });
    return otp;
  }
}

function expired() {
  return new HttpException(
    { statusCode: 401, message: 'Código expirado. Peça um novo código.', attemptsLeft: 0 },
    HttpStatus.UNAUTHORIZED,
  );
}

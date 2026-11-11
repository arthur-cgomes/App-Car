import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { maskBrPhone, maskEmail, type PinChannel } from '@monitoring-car/shared';
import { randomUUID } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { currentRequestContext } from '../../common/context/request-context';
import { Env } from '../../config/env';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { MailProvider } from '../../notifications/mail/mail.provider';
import { codeEmail } from '../../notifications/mail/templates';
import { SmsProvider } from '../../notifications/sms/sms.provider';
import { User } from '../users/user.entity';
import { hmac, randomCode, safeEqualHex } from './crypto';
import { AuthOtp, OtpPurpose } from './entities/auth-otp.entity';

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 30;
const OTP_PER_TARGET_PER_HOUR = 5;

const SMS_TEXT: Record<OtpPurpose, (code: string) => string> = {
  LOGIN: (code) => `VW Polo: seu PIN de acesso é ${code}. Não compartilhe.`,
  EMAIL_VERIFY: (code) => `VW Polo: seu código de confirmação é ${code}. Não compartilhe.`,
  PHONE_VERIFY: (code) => `VW Polo: seu código de confirmação é ${code}. Não compartilhe.`,
  PHONE_CHANGE: (code) => `VW Polo: seu código para confirmar este celular é ${code}. Não compartilhe.`,
  ACCOUNT_DELETE: (code) => `VW Polo: seu código para EXCLUIR sua conta é ${code}. Se não foi você, ignore.`,
};

const EMAIL_CONTENT: Record<OtpPurpose, { subject: string; title: string; intro: string; footnote: string }> = {
  LOGIN: {
    subject: 'VW Polo: seu PIN de acesso',
    title: 'Seu PIN de acesso',
    intro: 'Use este PIN para entrar no VW Polo com a placa do seu veículo.',
    footnote: 'O PIN vale por 5 minutos. Se você não pediu, ignore este e-mail: ninguém entra na sua conta sem ele.',
  },
  EMAIL_VERIFY: {
    subject: 'VW Polo: confirme seu e-mail',
    title: 'Confirme seu e-mail',
    intro: 'Falta pouco! Digite este código no VW Polo para confirmar seu e-mail.',
    footnote: 'O código vale por 5 minutos. Se você não criou uma conta no VW Polo, ignore este e-mail.',
  },
  PHONE_VERIFY: {
    subject: 'VW Polo: confirme seu celular',
    title: 'Confirme seu celular',
    intro: 'Digite este código no VW Polo para confirmar seu celular.',
    footnote: 'O código vale por 5 minutos. Não compartilhe com ninguém.',
  },
  PHONE_CHANGE: {
    subject: 'VW Polo: confirme seu novo celular',
    title: 'Confirme seu novo celular',
    intro: 'Digite este código no VW Polo para confirmar a troca do seu celular.',
    footnote: 'O código vale por 5 minutos. Se não foi você, troque sua senha.',
  },
  ACCOUNT_DELETE: {
    subject: 'VW Polo: código para excluir sua conta',
    title: 'Excluir sua conta',
    intro: 'Use este código para confirmar a exclusão da sua conta. Seus dados deixam de aparecer na hora e são apagados de vez em 30 dias.',
    footnote: 'Se não foi você, ignore este e-mail e troque sua senha.',
  },
};

export interface Delivery {
  channel: PinChannel;
  target: string;
  sentTo: string;
}

interface IssueOptions extends Delivery {
  userId: string;
  purpose: OtpPurpose;
  vehicleId?: string | null;
}

type DeliveryUser = Pick<User, 'email' | 'emailVerifiedAt' | 'phone' | 'phoneVerifiedAt' | 'pinChannel'>;

@Injectable()
export class OtpService {
  private readonly secret: string;
  private readonly webHost: string;
  private readonly webUrl: string;

  constructor(
    @InjectRepository(AuthOtp) private readonly otps: Repository<AuthOtp>,
    private readonly sms: SmsProvider,
    private readonly mail: MailProvider,
    private readonly limiter: RateLimiter,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
    this.webUrl = config.get('WEB_URL', { infer: true });
    this.webHost = new URL(this.webUrl).host;
  }

  get smsAvailable() {
    return this.sms.available;
  }

  email(address: string): Delivery {
    return { channel: 'EMAIL', target: address, sentTo: maskEmail(address) };
  }

  phone(e164: string): Delivery {
    return { channel: 'SMS', target: e164, sentTo: maskBrPhone(e164) };
  }

  deliveryFor(user: DeliveryUser): Delivery | null {
    if (user.pinChannel === 'SMS' && this.sms.available && user.phone && user.phoneVerifiedAt) return this.phone(user.phone);
    if (user.emailVerifiedAt) return this.email(user.email);
    return null;
  }

  async issue({ userId, purpose, channel, target, vehicleId = null }: IssueOptions) {
    await this.limiter.consume(`otp-target:${target}`, OTP_PER_TARGET_PER_HOUR, 3600, () => 'Muitos códigos enviados. Tente novamente mais tarde.');
    await this.otps.update({ userId, purpose, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) }, { expiresAt: new Date() });

    const id = randomUUID();
    const code = randomCode();
    await this.otps.insert({
      id,
      userId,
      purpose,
      vehicleId,
      channel,
      target,
      codeHash: hmac(this.secret, `${id}:${code}`),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      attempts: 0,
      consumedAt: null,
      ip: currentRequestContext().ip,
    });

    if (channel === 'SMS') {
      await this.sms.send(target, `${SMS_TEXT[purpose](code)}\n\n@${this.webHost} #${code}`);
      return;
    }
    await this.mail.send({ to: target, ...codeEmail({ ...EMAIL_CONTENT[purpose], code, webUrl: this.webUrl }) });
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

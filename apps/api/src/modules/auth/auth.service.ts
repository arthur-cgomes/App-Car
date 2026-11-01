import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isValidCpf, maskBrPhone, normalizeCpf } from '@monitoring-car/shared';
import type { Request, Response } from 'express';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { currentRequestContext } from '../../common/context/request-context';
import { Env } from '../../config/env';
import { RateLimiter, tooManyRequests } from '../../infra/redis/rate-limiter';
import { MailProvider } from '../../notifications/mail/mail.provider';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { randomToken, sha256 } from './crypto';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OTP_RESEND_SECONDS, OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_SECONDS = 15 * 60;
const RESET_TTL_SECONDS = 30 * 60;
const PIN_UNAVAILABLE = 'Não foi possível enviar o código para esta placa.';

const resendMessage = (seconds: number) => `Aguarde ${seconds} s para pedir um novo código.`;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(PasswordResetToken) private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly otps: OtpService,
    private readonly limiter: RateLimiter,
    private readonly mail: MailProvider,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto, response: Response) {
    if (await this.users.exists({ where: { email: dto.email } })) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }
    if (dto.cpf && (await this.users.exists({ where: { cpf: dto.cpf } }))) {
      throw new ConflictException('Já existe uma conta com este CPF.');
    }
    if (await this.users.exists({ where: { phone: dto.phone, phoneVerifiedAt: Not(IsNull()) } })) {
      throw new ConflictException('Este celular já está em uso em outra conta.');
    }

    const user = await this.users.save(
      this.users.create({
        name: dto.name,
        email: dto.email,
        cpf: dto.cpf ?? null,
        phone: dto.phone,
        passwordHash: await this.passwords.hash(dto.password),
        termsAcceptedAt: new Date(),
      }),
    );
    await this.audit.logSecurityEvent('ACCOUNT_CREATED', {}, user.id);
    await this.sessions.start(response, user.id);
    await this.limiter.cooldown(`phone-verify:${user.id}`, OTP_RESEND_SECONDS, resendMessage);
    await this.otps.issue({ userId: user.id, purpose: 'PHONE_VERIFY', phone: dto.phone });
    return { user: toSessionUser(user), maskedPhone: maskBrPhone(dto.phone), resendIn: OTP_RESEND_SECONDS };
  }

  async login(dto: LoginDto, response: Response) {
    const key = `login-fail:${loginKey(dto.login)}`;
    const failures = await this.limiter.count(key);
    if (failures.count >= LOGIN_MAX_FAILURES) {
      const minutes = Math.max(1, Math.ceil(failures.ttl / 60));
      throw tooManyRequests(`Muitas tentativas. Tente novamente em ${minutes} min.`, failures.ttl);
    }

    const user = await this.findByLogin(dto.login);
    if (!(await this.passwords.verify(user?.passwordHash, dto.password)) || !user) {
      await this.limiter.hit(key, LOGIN_MAX_FAILURES, LOGIN_LOCK_SECONDS);
      await this.audit.logSecurityEvent('LOGIN_FAILED', { method: 'PASSWORD' }, user?.id);
      throw new UnauthorizedException('E-mail/CPF ou senha incorretos.');
    }

    await this.limiter.reset(key);
    await this.sessions.start(response, user.id);
    await this.audit.logSecurityEvent('LOGIN', { method: 'PASSWORD' }, user.id);
    return { user: toSessionUser(user) };
  }

  async requestPin(plate: string) {
    const { ip } = currentRequestContext();
    await this.limiter.consume(`pin-ip:${ip}`, 10, 3600, () => 'Muitas tentativas. Tente novamente mais tarde.');

    const owner = await this.pinOwner(plate);
    if (!owner) throw new BadRequestException(PIN_UNAVAILABLE);

    await this.limiter.cooldown(`pin-resend:${plate}`, OTP_RESEND_SECONDS, resendMessage);
    await this.limiter.consume(`pin-plate:${plate}`, 3, 3600, () => 'Muitos códigos pedidos para esta placa. Tente novamente mais tarde.');
    await this.otps.issue({ userId: owner.user.id, purpose: 'LOGIN', phone: owner.user.phone!, vehicleId: owner.vehicleId });
    await this.audit.logSecurityEvent('PIN_SENT', { plate }, owner.user.id);
    return { maskedPhone: maskBrPhone(owner.user.phone!), resendIn: OTP_RESEND_SECONDS };
  }

  async verifyPin(plate: string, code: string, response: Response) {
    const owner = await this.pinOwner(plate);
    if (!owner) throw new BadRequestException(PIN_UNAVAILABLE);
    try {
      await this.otps.verify(owner.user.id, 'LOGIN', code);
    } catch (error) {
      await this.audit.logSecurityEvent('LOGIN_FAILED', { method: 'PIN', plate }, owner.user.id);
      throw error;
    }
    await this.sessions.start(response, owner.user.id);
    await this.audit.logSecurityEvent('LOGIN', { method: 'PIN', plate }, owner.user.id);
    return { user: toSessionUser(owner.user) };
  }

  async sendPhoneCode(userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (!user.phone) throw new BadRequestException('Cadastre um celular primeiro.');
    if (user.phoneVerifiedAt) throw new BadRequestException('Este celular já está confirmado.');
    await this.limiter.cooldown(`phone-verify:${userId}`, OTP_RESEND_SECONDS, resendMessage);
    await this.otps.issue({ userId, purpose: 'PHONE_VERIFY', phone: user.phone });
    return { maskedPhone: maskBrPhone(user.phone), resendIn: OTP_RESEND_SECONDS };
  }

  async verifyPhone(userId: string, code: string) {
    const otp = await this.otps.verify(userId, 'PHONE_VERIFY', code);
    const taken = await this.users.exists({
      where: { phone: otp.targetPhone, phoneVerifiedAt: Not(IsNull()), id: Not(userId) },
    });
    if (taken) throw new ConflictException('Este celular já está em uso em outra conta.');

    const user = await this.users.findOneByOrFail({ id: userId });
    user.phone = otp.targetPhone;
    user.phoneVerifiedAt = new Date();
    await this.users.save(user);
    await this.audit.logSecurityEvent('PHONE_VERIFIED', {}, userId);
    return { phoneVerified: true };
  }

  async forgotPassword(login: string) {
    const { ip } = currentRequestContext();
    await this.limiter.consume(`forgot-ip:${ip}`, 10, 3600, () => 'Muitas tentativas. Tente novamente mais tarde.');
    const user = await this.findByLogin(login);
    if (user && (await this.limiter.hit(`forgot-user:${user.id}`, 3, 3600)).allowed) {
      await this.sendPasswordLink(user);
    }
    return { sent: true };
  }

  async sendPasswordLinkTo(userId: string) {
    await this.limiter.consume(`forgot-user:${userId}`, 3, 3600, () => 'Muitos links enviados. Tente novamente mais tarde.');
    await this.sendPasswordLink(await this.users.findOneByOrFail({ id: userId }));
    return { sent: true };
  }

  async resetPassword(token: string, password: string) {
    const reset = await this.resetTokens.findOne({
      where: { tokenHash: sha256(token), usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (!reset) throw new BadRequestException('Este link expirou. Peça um novo em "Esqueci minha senha".');

    const user = await this.users.findOneByOrFail({ id: reset.userId });
    user.passwordHash = await this.passwords.hash(password);
    await this.users.save(user);
    await this.resetTokens.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });
    await this.sessions.endAll(user.id);
    await this.audit.logSecurityEvent('PASSWORD_CHANGED', {}, user.id);
    return { changed: true };
  }

  refresh(request: Request, response: Response) {
    return this.sessions.rotate(request, response);
  }

  logout(request: Request, response: Response) {
    return this.sessions.end(request, response);
  }

  private async sendPasswordLink(user: User) {
    const token = randomToken();
    await this.resetTokens.insert({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000),
      usedAt: null,
    });
    const link = `${this.config.get('WEB_URL', { infer: true })}/nova-senha?token=${token}`;
    await this.mail.send({
      to: user.email,
      subject: 'App Car: redefinir sua senha',
      text: `Olá, ${user.name}.\n\nPara criar uma nova senha, acesse:\n${link}\n\nO link vale por 30 minutos. Se não foi você, ignore este e-mail.`,
      html: `<p>Olá, ${escapeHtml(user.name)}.</p><p>Para criar uma nova senha, <a href="${link}">toque aqui</a>.</p><p>O link vale por 30 minutos. Se não foi você, ignore este e-mail.</p>`,
    });
    await this.audit.logSecurityEvent('PASSWORD_RESET_REQUESTED', {}, user.id);
  }

  private findByLogin(login: string) {
    const select = { id: true, name: true, email: true, phone: true, passwordHash: true } as const;
    if (login.includes('@')) return this.users.findOne({ where: { email: login.toLowerCase() }, select });
    const cpf = normalizeCpf(login);
    return isValidCpf(cpf) ? this.users.findOne({ where: { cpf }, select }) : Promise.resolve(null);
  }

  private async pinOwner(plate: string) {
    const vehicle = await this.vehicles.findOne({ where: { plate, active: true }, relations: { owner: true } });
    const user = vehicle?.owner;
    if (!vehicle || !user?.phone || !user.phoneVerifiedAt || !user.smsLoginEnabled) return null;
    return { user, vehicleId: vehicle.id };
  }
}

function loginKey(login: string) {
  return login.includes('@') ? login.toLowerCase() : normalizeCpf(login);
}

function toSessionUser(user: Pick<User, 'id' | 'name' | 'email'>): SessionUser {
  return { id: user.id, name: user.name, email: user.email };
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

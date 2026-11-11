import { BadRequestException, ConflictException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { maskEmail } from '@monitoring-car/shared';
import type { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { currentRequestContext } from '../../common/context/request-context';
import { Env } from '../../config/env';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { REDIS } from '../../infra/redis/redis.constants';
import { MailProvider } from '../../notifications/mail/mail.provider';
import { codeEmail } from '../../notifications/mail/templates';
import { User } from '../users/user.entity';
import { hmac, randomCode, safeEqualHex } from './crypto';

export const SIGNUP_CODE_TTL_SECONDS = 10 * 60;
export const SIGNUP_TOKEN_TTL_SECONDS = 30 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 30;
const EXPIRED = 'Código expirado. Peça um novo código.';
const SIGNUP_EXPIRED = 'Sua confirmação de e-mail expirou. Comece o cadastro de novo.';

const resendMessage = (seconds: number) => `Aguarde ${seconds} s para pedir um novo código.`;
const codeKey = (email: string) => `signup-code:${email}`;

@Injectable()
export class SignupService {
  private readonly secret: string;
  private readonly tokenSecret: string;
  private readonly webUrl: string;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly limiter: RateLimiter,
    private readonly mail: MailProvider,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
    this.tokenSecret = `${this.secret}:signup`;
    this.webUrl = config.get('WEB_URL', { infer: true });
  }

  async start(email: string) {
    const { ip } = currentRequestContext();
    await this.limiter.consume(`signup-ip:${ip}`, 10, 3600, () => 'Muitas tentativas. Tente novamente mais tarde.');
    if (await this.users.exists({ where: { email } })) throw new ConflictException('Já existe uma conta com este e-mail.');
    await this.limiter.cooldown(`signup-resend:${email}`, RESEND_SECONDS, resendMessage);
    await this.limiter.consume(`signup-email:${email}`, 5, 3600, () => 'Muitos códigos enviados. Tente novamente mais tarde.');

    const code = randomCode();
    await this.mail.send({
      to: email,
      ...codeEmail({
        subject: 'VW Polo: confirme seu e-mail',
        title: 'Confirme seu e-mail',
        intro: 'Falta pouco! Digite este código no VW Polo para continuar o seu cadastro.',
        code,
        footnote: 'O código vale por 10 minutos. Se você não está criando uma conta no VW Polo, ignore este e-mail.',
        webUrl: this.webUrl,
      }),
    });
    await this.redis
      .multi()
      .del(codeKey(email))
      .hset(codeKey(email), { hash: hmac(this.secret, `signup:${email}:${code}`), attempts: 0 })
      .expire(codeKey(email), SIGNUP_CODE_TTL_SECONDS)
      .exec();
    return { channel: 'EMAIL' as const, sentTo: maskEmail(email), resendIn: RESEND_SECONDS };
  }

  async verify(email: string, code: string) {
    const key = codeKey(email);
    const hash = await this.redis.hget(key, 'hash');
    if (!hash) throw expired();
    const attempts = await this.redis.hincrby(key, 'attempts', 1);
    if (attempts > MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw expired();
    }
    if (!safeEqualHex(hash, hmac(this.secret, `signup:${email}:${code}`))) {
      const left = MAX_ATTEMPTS - attempts;
      if (left <= 0) {
        await this.redis.del(key);
        throw expired();
      }
      throw new HttpException(
        { statusCode: 401, message: `Código incorreto. Restam ${left} ${left === 1 ? 'tentativa' : 'tentativas'}.`, attemptsLeft: left },
        HttpStatus.UNAUTHORIZED,
      );
    }
    await this.redis.del(key);
    const signupToken = await this.jwt.signAsync({ email, typ: 'signup' }, { secret: this.tokenSecret, expiresIn: SIGNUP_TOKEN_TTL_SECONDS });
    return { signupToken, expiresIn: SIGNUP_TOKEN_TTL_SECONDS };
  }

  async verifiedEmail(signupToken: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ email?: string; typ?: string }>(signupToken, { secret: this.tokenSecret });
      if (payload.typ !== 'signup' || !payload.email) throw new Error('token inválido');
      return payload.email;
    } catch {
      throw new BadRequestException(SIGNUP_EXPIRED);
    }
  }
}

function expired() {
  return new HttpException({ statusCode: 401, message: EXPIRED, attemptsLeft: 0 }, HttpStatus.UNAUTHORIZED);
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { IsNull, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
  SESSION_HINT_COOKIE,
} from '../../common/auth/auth-user';
import { currentRequestContext } from '../../common/context/request-context';
import { Env } from '../../config/env';
import { randomToken, sha256 } from './crypto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  async start(response: Response, userId: string, familyId: string = randomUUID()) {
    const refreshToken = randomToken();
    const { ip, userAgent } = currentRequestContext();
    await this.tokens.insert({
      userId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      revokedAt: null,
      ip,
      userAgent,
    });
    const accessToken = await this.jwt.signAsync({ sub: userId }, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
    this.setCookies(response, accessToken, refreshToken);
  }

  async rotate(request: Request, response: Response) {
    const presented = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const current = presented ? await this.tokens.findOne({ where: { tokenHash: sha256(presented) } }) : null;
    if (!current || current.expiresAt < new Date()) {
      this.clearCookies(response);
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }
    if (current.revokedAt) {
      await this.tokens.update({ familyId: current.familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
      await this.audit.logSecurityEvent('REFRESH_TOKEN_REUSE', { familyId: current.familyId }, current.userId);
      this.clearCookies(response);
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }
    await this.tokens.update({ id: current.id }, { revokedAt: new Date() });
    await this.start(response, current.userId, current.familyId);
    return current.userId;
  }

  async end(request: Request, response: Response) {
    const presented = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (presented) {
      await this.tokens.update({ tokenHash: sha256(presented), revokedAt: IsNull() }, { revokedAt: new Date() });
    }
    this.clearCookies(response);
  }

  async endAll(userId: string) {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private cookieBase(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.get('NODE_ENV', { infer: true }) === 'production' };
  }

  private setCookies(response: Response, accessToken: string, refreshToken: string) {
    const base = this.cookieBase();
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...base, path: '/', maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 });
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      path: this.config.get('REFRESH_COOKIE_PATH', { infer: true }),
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
    response.cookie(SESSION_HINT_COOKIE, '1', { ...base, path: '/', maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000 });
  }

  private clearCookies(response: Response) {
    const base = this.cookieBase();
    response.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: '/' });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: this.config.get('REFRESH_COOKIE_PATH', { infer: true }) });
    response.clearCookie(SESSION_HINT_COOKIE, { ...base, path: '/' });
  }
}

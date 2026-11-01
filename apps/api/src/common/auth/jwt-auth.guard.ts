import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { RequestContextStore } from '../context/request-context';
import { API_KEY_HEADER, ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { IS_API_KEY_KEY } from '../decorators/api-key-auth.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ACCESS_TOKEN_COOKIE, AccessTokenPayload, AuthUser } from './auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly cls: ClsService<RequestContextStore>,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (this.reflector.getAllAndOverride<boolean>(IS_API_KEY_KEY, [context.getHandler(), context.getClass()])) {
      const header = request.headers[API_KEY_HEADER];
      const userId = await this.apiKeys.authenticate(typeof header === 'string' ? header : undefined);
      request.user = { id: userId };
      this.cls.set('userId', userId);
      return true;
    }

    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub };
      this.cls.set('userId', payload.sub);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (fromCookie) return fromCookie;
    const [type, value] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? value : undefined;
  }
}

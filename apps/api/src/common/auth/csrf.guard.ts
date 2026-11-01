import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_API_KEY_KEY } from '../decorators/api-key-auth.decorator';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'placar';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (this.reflector.getAllAndOverride<boolean>(IS_API_KEY_KEY, [context.getHandler(), context.getClass()])) return true;
    if (request.headers[CSRF_HEADER] === CSRF_HEADER_VALUE) return true;
    throw new ForbiddenException('Requisição sem o cabeçalho de segurança.');
  }
}

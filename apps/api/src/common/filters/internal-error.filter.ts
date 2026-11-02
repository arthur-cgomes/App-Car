import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

export const INTERNAL_ERROR = 'Erro interno no servidor.';

@Catch()
export class InternalErrorFilter extends BaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) return super.catch(exception, host);
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;
    response.status(500).json({ statusCode: 500, message: INTERNAL_ERROR });
  }
}

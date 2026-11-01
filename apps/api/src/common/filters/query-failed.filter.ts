import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

const PG_UNIQUE_VIOLATION = '23505';

@Catch(QueryFailedError)
export class QueryFailedFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    if (exception.code === PG_UNIQUE_VIOLATION) {
      return super.catch(new ConflictException('Registro duplicado'), host);
    }
    return super.catch(exception, host);
  }
}

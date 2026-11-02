import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { InternalErrorFilter } from './internal-error.filter';

const PG_UNIQUE_VIOLATION = '23505';

@Catch(QueryFailedError)
export class QueryFailedFilter extends InternalErrorFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    if (exception.code === PG_UNIQUE_VIOLATION) {
      return super.catch(new ConflictException('Registro duplicado'), host);
    }
    return super.catch(exception, host);
  }
}

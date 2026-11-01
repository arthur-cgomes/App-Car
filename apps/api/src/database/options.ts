import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { AuditSubscriber } from '../audit/audit.subscriber';
import { ENTITIES } from './entities';
import { AppNamingStrategy } from './naming.strategy';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: ENTITIES,
    subscribers: [AuditSubscriber],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    namingStrategy: new AppNamingStrategy(),
    uuidExtension: 'pgcrypto',
    synchronize: false,
  };
}

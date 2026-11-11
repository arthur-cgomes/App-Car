import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { AuditModule } from './audit/audit.module';
import { CsrfGuard } from './common/auth/csrf.guard';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { InternalErrorFilter } from './common/filters/internal-error.filter';
import { PayloadTooLargeFilter } from './common/filters/payload-too-large.filter';
import { QueryFailedFilter } from './common/filters/query-failed.filter';
import { Env, validateEnv } from './config/env';
import { buildDataSourceOptions } from './database/options';
import { HealthController } from './health/health.controller';
import { RedisModule } from './infra/redis/redis.module';
import { StorageModule } from './infra/storage/storage.module';
import { AccountModule } from './modules/account/account.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmergencyContactsModule } from './modules/emergency-contacts/emergency-contacts.module';
import { FipeModule } from './modules/fipe/fipe.module';
import { InsurancesModule } from './modules/insurances/insurances.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FilesModule } from './modules/files/files.module';
import { PlateLookupModule } from './modules/plate-lookup/plate-lookup.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TiresModule } from './modules/tires/tires.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => {
          const header = req.headers['x-request-id'];
          return typeof header === 'string' && REQUEST_ID_PATTERN.test(header) ? header : randomUUID();
        },
        setup: (cls, req: Request) => {
          cls.set('ip', req.ip);
          cls.set('userAgent', req.headers['user-agent']?.slice(0, 512));
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ScheduleModule.forRoot(),
    AuditModule,
    RedisModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    TiresModule,
    AccountModule,
    UsersModule,
    PlateLookupModule,
    VehiclesModule,
    FilesModule,
    ExpensesModule,
    RemindersModule,
    DashboardModule,
    FipeModule,
    DocumentsModule,
    InsurancesModule,
    EmergencyContactsModule,
    ApiKeysModule,
    IntegrationsModule,
    ReportsModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
    { provide: APP_FILTER, useClass: QueryFailedFilter },
    { provide: APP_FILTER, useClass: PayloadTooLargeFilter },
  ],
})
export class AppModule {}

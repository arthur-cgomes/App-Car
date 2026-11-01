import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../src/common/auth/csrf.guard';
import { REDIS } from '../src/infra/redis/redis.constants';
import { MailMessage, MailProvider } from '../src/notifications/mail/mail.provider';
import { ConsoleSmsProvider } from '../src/notifications/sms/console-sms.provider';
import { SmsProvider } from '../src/notifications/sms/sms.provider';

export const CSRF = { [CSRF_HEADER]: CSRF_HEADER_VALUE };

export async function createTestApp() {
  const mail: MailMessage[] = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailProvider)
    .useValue({ send: async (message: MailMessage) => void mail.push(message) })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  const [{ current_database: database }] = await dataSource.query('SELECT current_database()');
  if (!database.endsWith('_test')) {
    throw new Error(`Recusando limpar o banco "${database}": testes só rodam em bancos *_test`);
  }
  await dataSource.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await dataSource.runMigrations();

  const redis = app.get<Redis>(REDIS);
  await redis.flushdb();

  return { app, dataSource, redis, mail, sms: app.get(SmsProvider) as ConsoleSmsProvider };
}

export function lastCode(sms: ConsoleSmsProvider, phone: string) {
  const message = sms.lastTo(phone);
  if (!message) throw new Error(`Nenhum SMS para ${phone}`);
  return /(\d{6})/.exec(message.text)![1];
}

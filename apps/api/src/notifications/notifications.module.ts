import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { MailProvider } from './mail/mail.provider';
import { ConsoleSmsProvider } from './sms/console-sms.provider';
import { SmsProvider } from './sms/sms.provider';
import { SmsDevSmsProvider } from './sms/smsdev-sms.provider';

@Global()
@Module({
  providers: [
    MailProvider,
    {
      provide: SmsProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('SMS_PROVIDER', { infer: true }) === 'smsdev'
          ? new SmsDevSmsProvider(config.get('SMSDEV_KEY', { infer: true })!)
          : new ConsoleSmsProvider(),
    },
  ],
  exports: [MailProvider, SmsProvider],
})
export class NotificationsModule {}

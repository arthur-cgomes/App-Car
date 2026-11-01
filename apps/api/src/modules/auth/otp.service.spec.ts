import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { MailProvider } from '../../notifications/mail/mail.provider';
import { ConsoleSmsProvider } from '../../notifications/sms/console-sms.provider';
import { DisabledSmsProvider } from '../../notifications/sms/disabled-sms.provider';
import { SmsProvider } from '../../notifications/sms/sms.provider';
import { AuthOtp } from './entities/auth-otp.entity';
import { OtpService } from './otp.service';

const config = { get: (key: string) => (key === 'WEB_URL' ? 'https://appcar.arthurgomes.dev' : 'segredo') } as unknown as ConfigService<never, true>;
const service = (sms: SmsProvider) =>
  new OtpService({} as Repository<AuthOtp>, sms, {} as MailProvider, {} as RateLimiter, config as never);

const user = {
  email: 'marina@email.com',
  emailVerifiedAt: new Date(),
  phone: '+5521987654821',
  phoneVerifiedAt: new Date(),
  pinChannel: 'SMS' as const,
};

describe('OtpService.deliveryFor', () => {
  it('usa SMS quando o usuário escolheu SMS, o SMS está ativo e o celular está confirmado', () => {
    expect(service(new ConsoleSmsProvider()).deliveryFor(user)).toEqual({ channel: 'SMS', target: '+5521987654821', sentTo: '(21) •••••-4821' });
  });

  it('com o SMS desligado, envia por e-mail mesmo para quem escolheu SMS', () => {
    const otps = service(new DisabledSmsProvider());
    expect(otps.smsAvailable).toBe(false);
    expect(otps.deliveryFor(user)).toEqual({ channel: 'EMAIL', target: 'marina@email.com', sentTo: 'ma••••@email.com' });
  });

  it('cai para o e-mail quando o celular não está confirmado e não envia nada sem e-mail confirmado', () => {
    const otps = service(new ConsoleSmsProvider());
    expect(otps.deliveryFor({ ...user, phoneVerifiedAt: null })?.channel).toBe('EMAIL');
    expect(otps.deliveryFor({ ...user, pinChannel: 'EMAIL', emailVerifiedAt: null })).toBeNull();
  });

  it('o provedor desligado recusa qualquer envio de SMS', async () => {
    await expect(new DisabledSmsProvider().send()).rejects.toThrow('O envio por SMS ainda não está disponível.');
  });
});

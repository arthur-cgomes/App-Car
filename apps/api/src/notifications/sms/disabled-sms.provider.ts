import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SmsProvider } from './sms.provider';

@Injectable()
export class DisabledSmsProvider extends SmsProvider {
  override readonly available = false;

  async send(): Promise<void> {
    throw new ServiceUnavailableException('O envio por SMS ainda não está disponível.');
  }
}

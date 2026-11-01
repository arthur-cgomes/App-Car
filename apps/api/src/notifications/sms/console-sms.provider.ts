import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms.provider';

@Injectable()
export class ConsoleSmsProvider extends SmsProvider {
  private readonly logger = new Logger('SMS');
  readonly sent: { to: string; text: string }[] = [];

  async send(to: string, text: string) {
    this.sent.push({ to, text });
    this.logger.log(`Para ${to}: ${text}`);
  }

  lastTo(to: string) {
    return [...this.sent].reverse().find((message) => message.to === to);
  }
}

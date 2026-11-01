import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Env } from '../../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailProvider {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.transport = createTransport(config.get('SMTP_URL', { infer: true }));
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async send(message: MailMessage) {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

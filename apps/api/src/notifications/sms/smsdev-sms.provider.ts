import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SmsProvider } from './sms.provider';

interface SmsDevResult {
  situacao: 'OK' | 'ERRO';
  codigo: string;
  id?: string;
  descricao: string;
}

export function toGsmText(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

@Injectable()
export class SmsDevSmsProvider extends SmsProvider {
  private readonly logger = new Logger('SMSDev');

  constructor(private readonly key: string) {
    super();
  }

  async send(to: string, text: string) {
    let result: SmsDevResult | undefined;
    try {
      const response = await fetch('https://api.smsdev.com.br/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: this.key, type: 9, number: to.replace(/\D/g, ''), msg: toGsmText(text) }]),
        signal: AbortSignal.timeout(8000),
      });
      [result] = (await response.json()) as SmsDevResult[];
    } catch (error) {
      this.logger.error(`Falha ao chamar o SMSDev: ${(error as Error).message}`);
    }
    if (result?.situacao !== 'OK') {
      if (result) this.logger.error(`SMSDev recusou o envio (${result.codigo}): ${result.descricao}`);
      throw new ServiceUnavailableException('Não foi possível enviar o SMS agora. Tente novamente.');
    }
  }
}

import { toGsmText } from './smsdev-sms.provider';

describe('SMSDev', () => {
  it('remove acentos para o SMS caber em 160 caracteres', () => {
    expect(toGsmText('VW Polo: seu código de acesso é 123456. Não compartilhe.')).toBe(
      'VW Polo: seu codigo de acesso e 123456. Nao compartilhe.',
    );
  });
});

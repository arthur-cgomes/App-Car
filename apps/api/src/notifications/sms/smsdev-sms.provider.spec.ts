import { toGsmText } from './smsdev-sms.provider';

describe('SMSDev', () => {
  it('remove acentos para o SMS caber em 160 caracteres', () => {
    expect(toGsmText('App Car: seu código de acesso é 123456. Não compartilhe.')).toBe(
      'App Car: seu codigo de acesso e 123456. Nao compartilhe.',
    );
  });
});

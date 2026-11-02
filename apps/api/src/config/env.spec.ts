import { validateEnv } from './env';

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://appcar:x@postgres:5432/appcar',
  JWT_SECRET: 'x'.repeat(40),
  SMS_PROVIDER: 'disabled',
  STORAGE_PROVIDER: 's3',
};

describe('validateEnv em produção', () => {
  it('recusa a consulta de placa simulada', () => {
    expect(() => validateEnv({ ...base, PLATE_PROVIDER: 'mock' })).toThrow('consulta simulada de placa');
    expect(() => validateEnv(base)).toThrow('consulta simulada de placa');
  });

  it('aceita sem consulta de placa e sem SMS', () => {
    expect(validateEnv({ ...base, PLATE_PROVIDER: 'none' })).toMatchObject({ PLATE_PROVIDER: 'none', SMS_PROVIDER: 'disabled' });
  });
});

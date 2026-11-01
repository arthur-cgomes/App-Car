import { describe, expect, it } from 'vitest';
import { maskEmail } from './email';

describe('email', () => {
  it('mascara o usuário e mantém o domínio', () => {
    expect(maskEmail('arthur@gmail.com')).toBe('ar••••@gmail.com');
    expect(maskEmail('motorista.p0wdv1@appcar.test')).toBe('mo••••••@appcar.test');
    expect(maskEmail('ab@x.com')).toBe('a•••@x.com');
    expect(maskEmail('sem-arroba')).toBe('sem-arroba');
  });
});

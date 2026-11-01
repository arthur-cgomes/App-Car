import { describe, expect, it } from 'vitest';
import { isStrongPassword } from './password';

describe('política de senha', () => {
  it('exige 8+ caracteres, maiúscula, número e caractere especial', () => {
    expect(isStrongPassword('Senha@123')).toBe(true);
    expect(isStrongPassword('Ação#2026')).toBe(true);
    expect(isStrongPassword('senha@123')).toBe(false);
    expect(isStrongPassword('Senha@abc')).toBe(false);
    expect(isStrongPassword('Senha1234')).toBe(false);
    expect(isStrongPassword('Se@1')).toBe(false);
  });
});

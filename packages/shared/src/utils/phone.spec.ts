import { describe, expect, it } from 'vitest';
import { formatBrPhone, formatBrPhoneInput, maskBrPhone, normalizeBrMobile } from './phone';

describe('phone', () => {
  it('normaliza celulares para E.164', () => {
    expect(normalizeBrMobile('(21) 98765-4821')).toBe('+5521987654821');
    expect(normalizeBrMobile('+55 21 98765-4821')).toBe('+5521987654821');
    expect(normalizeBrMobile('(21) 3765-4821')).toBeNull();
    expect(normalizeBrMobile('123')).toBeNull();
  });

  it('formata e mascara como no design', () => {
    expect(formatBrPhone('+5521987654821')).toBe('(21) 98765-4821');
    expect(maskBrPhone('+5521987654821')).toBe('(21) •••••-4821');
    expect(formatBrPhoneInput('2198765')).toBe('(21) 98765');
  });
});

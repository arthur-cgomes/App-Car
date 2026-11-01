import { buildChanges, buildSnapshot, REDACTED } from './audit-diff';

describe('audit-diff', () => {
  const ignored = new Set(['passwordHash']);

  it('registra apenas campos alterados, ignorando colunas técnicas', () => {
    const before = { name: 'Gol', odometer: 1000, version: 1, updatedAt: new Date('2026-01-01') };
    const after = { name: 'Gol', odometer: 1500, version: 2, updatedAt: new Date('2026-02-01') };
    expect(buildChanges(before, after, Object.keys(after), ignored)).toEqual({
      odometer: { from: 1000, to: 1500 },
    });
  });

  it('mascara campos sensíveis', () => {
    const changes = buildChanges({ passwordHash: 'a' }, { passwordHash: 'b' }, ['passwordHash'], ignored);
    expect(changes).toEqual({ passwordHash: { from: REDACTED, to: REDACTED } });
  });

  it('serializa datas e omite campos sensíveis do snapshot', () => {
    const snapshot = buildSnapshot(
      { email: 'a@b.com', passwordHash: 'x', createdAt: new Date('2026-01-01T00:00:00Z') },
      ['email', 'passwordHash', 'createdAt'],
      ignored,
    );
    expect(snapshot).toEqual({ email: 'a@b.com', createdAt: '2026-01-01T00:00:00.000Z' });
  });
});

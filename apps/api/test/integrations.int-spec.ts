import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { Vehicle } from '../src/modules/vehicles/vehicle.entity';
import { CSRF, createTestApp } from './helpers';

describe('API de integração e custos de manutenção (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;
  let polo: string;
  let key: string;

  const server = () => app.getHttpServer();
  const fuel = (body: object, apiKey = key) => request(server()).post('/v1/integrations/fuel-expenses').set({ 'X-Api-Key': apiKey }).send(body);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const users = dataSource.getRepository(User);
    const alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    const bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
    polo = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 108000 })).body.id;
    await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'ARG1B22', currentOdometer: 5000 });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('chaves de API', () => {
    it('cria a chave, mostra o segredo uma única vez e lista só o prefixo', async () => {
      const created = await request(server()).post('/v1/me/api-keys').set(asAlice).send({ name: 'App de abastecimento' }).expect(201);
      key = created.body.key;
      expect(key).toMatch(/^ac_live_[\w-]{32}$/);
      expect(created.body.prefix).toBe(key.slice(0, 12));

      const list = await request(server()).get('/v1/me/api-keys').set(asAlice).expect(200);
      expect(list.body).toEqual([expect.objectContaining({ name: 'App de abastecimento', prefix: key.slice(0, 12), lastUsedAt: null })]);
      expect(JSON.stringify(list.body)).not.toContain(key);
      expect((await request(server()).get('/v1/me/api-keys').set(asBob).expect(200)).body).toEqual([]);
    });

    it('recusa chave ausente, inválida e o cookie de sessão no lugar da chave', async () => {
      await request(server()).post('/v1/integrations/fuel-expenses').send({}).expect(401);
      await fuel({}, 'ac_live_errada').expect(401);
      await request(server()).post('/v1/integrations/fuel-expenses').set(asAlice).send({}).expect(401);
    });
  });

  describe('abastecimento enviado por outro app', () => {
    it('lança no veículo ativo com estabelecimento, valor, data e hora', async () => {
      const res = await fuel({ establishment: ' Posto Shell Barra ', amount: 189.9, occurredAt: '2026-10-31T23:40:00-03:00', liters: 32.5, fullTank: true, odometer: 108650 }).expect(201);
      expect(res.body.duplicate).toBe(false);
      expect(res.body.expense).toMatchObject({
        vehicleId: expect.any(String),
        category: 'FUEL',
        establishment: 'Posto Shell Barra',
        description: 'Posto Shell Barra',
        amountCents: 18990,
        date: '2026-10-31',
        occurredAt: '2026-11-01T02:40:00.000Z',
        source: 'API',
        fuel: { liters: 32.5, fullTank: true },
      });
      expect((await dataSource.getRepository(Vehicle).findOneByOrFail({ plate: 'ARG1B22' })).id).toBe(res.body.expense.vehicleId);
    });

    it('escolhe o veículo pela placa e atualiza o odômetro', async () => {
      const res = await fuel({ establishment: 'Ipiranga Centro', amount: 100, occurredAt: '2026-11-01T08:00:00Z', plate: 'rio-2a18', odometer: 108700 }).expect(201);
      expect(res.body.expense.vehicleId).toBe(polo);
      expect((await dataSource.getRepository(Vehicle).findOneByOrFail({ id: polo })).currentOdometer).toBe(108700);
      await fuel({ establishment: 'Posto', amount: 10, occurredAt: '2026-11-01T08:00:00Z', plate: 'ZZZ9Z99' }).expect(422);
    });

    it('não duplica quando o mesmo externalId é reenviado', async () => {
      const body = { establishment: 'BR Mania', amount: 50.25, occurredAt: '2026-11-01T09:15:00-03:00', plate: 'RIO2A18', externalId: 'nota-123' };
      const first = await fuel(body).expect(201);
      const again = await fuel(body).expect(200);
      expect(again.body).toEqual({ duplicate: true, expense: first.body.expense });
    });

    it('valida os campos', async () => {
      const res = await fuel({ establishment: '', amount: 10.555, occurredAt: '2026-11-01 10:00' }).expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'Informe o nome do estabelecimento.',
          'Informe o valor em reais com até 2 casas decimais.',
          'Informe a data e hora com o fuso (ex.: 2026-11-01T14:32:00-03:00).',
        ]),
      );
      await fuel({ establishment: 'Posto', amount: 10, occurredAt: '2099-01-01T10:00:00Z' }).expect(400);
      await fuel({ establishment: 'Posto', amount: 10, occurredAt: '2026-11-01T10:00:00Z', userId: 'x' }).expect(400);
    });

    it('chave revogada deixa de funcionar', async () => {
      const [{ id }] = (await request(server()).get('/v1/me/api-keys').set(asAlice)).body;
      await request(server()).delete(`/v1/me/api-keys/${id}`).set(asBob).expect(404);
      await request(server()).delete(`/v1/me/api-keys/${id}`).set(asAlice).expect(204);
      await fuel({ establishment: 'Posto', amount: 10, occurredAt: '2026-11-01T10:00:00Z' }).expect(401);
    });
  });

  describe('manutenção com peças e mão de obra', () => {
    const base = () => `/v1/vehicles/${polo}/expenses`;

    it('guarda peças e mão de obra quando somam o total', async () => {
      const res = await request(server())
        .post(base())
        .set(asAlice)
        .send({ category: 'MAINTENANCE', amountCents: 48900, partsCents: 30000, laborCents: 18900, date: '2026-10-20', establishment: 'Oficina do Zé' })
        .expect(201);
      expect(res.body).toMatchObject({ partsCents: 30000, laborCents: 18900, establishment: 'Oficina do Zé', source: 'MANUAL' });

      const wrong = await request(server()).post(base()).set(asAlice).send({ category: 'MAINTENANCE', amountCents: 100, partsCents: 30, laborCents: 30, date: '2026-10-20' }).expect(400);
      expect(wrong.body.message).toBe('O valor total deve ser a soma de peças e mão de obra.');

      const other = await request(server()).post(base()).set(asAlice).send({ category: 'OTHER', amountCents: 100, partsCents: 100, date: '2026-10-20' }).expect(201);
      expect(other.body).toMatchObject({ partsCents: null, laborCents: null });
    });

    it('relatório soma peças (categoria Peças + peças das manutenções) e mão de obra', async () => {
      await request(server()).post(base()).set(asAlice).send({ category: 'PARTS', partSystem: 'BRAKES', amountCents: 25000, date: '2026-10-21' }).expect(201);
      await request(server()).post(base()).set(asAlice).send({ category: 'MAINTENANCE', amountCents: 9000, date: '2026-10-22' }).expect(201);
      const report = await request(server()).get(`/v1/vehicles/${polo}/reports?from=2026-10-01&to=2026-10-31`).set(asAlice).expect(200);
      expect(report.body.costs).toEqual({ partsCents: 30000 + 25000, laborCents: 18900, maintenanceUnsplitCents: 9000 });
    });
  });
});

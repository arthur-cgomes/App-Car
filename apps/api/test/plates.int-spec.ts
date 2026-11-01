import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PlateLookup } from '../src/modules/plate-lookup/entities/plate-lookup.entity';
import { User } from '../src/modules/users/user.entity';
import { CSRF, createTestApp } from './helpers';

describe('Consulta de placa e veículos (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let redis: Redis;
  let alice: User;
  let bob: User;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, dataSource, redis } = await createTestApp());
    const users = dataSource.getRepository(User);
    alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('consulta', () => {
    it('retorna dados do veículo, débitos e total em aberto', async () => {
      const res = await request(server()).post('/v1/plates/rio-2a18/lookup').set(asAlice).expect(200);
      expect(res.body).toMatchObject({
        plate: 'RIO2A18',
        vehicle: { brand: 'Volkswagen', model: 'Polo Highline 1.0 200 TSI', yearFab: 2019, municipality: 'Rio de Janeiro', uf: 'RJ', restrictions: 'Sem restrições' },
        openCents: 13016,
      });
      expect(res.body.debts).toHaveLength(3);
      expect(res.body.debts[2]).toMatchObject({ description: 'Multa · velocidade', status: 'OPEN', amountCents: 13016 });
      expect(res.body.debts[0].description).toBe(`IPVA ${new Date().getFullYear()}`);
    });

    it('só aceita POST com o cabeçalho anti-CSRF (um link de outro site não dispara consultas pagas)', async () => {
      const { Authorization } = asAlice;
      await request(server()).get('/v1/plates/RIO2A18/lookup').set({ Authorization }).expect(404);
      await request(server()).post('/v1/plates/RIO2A18/lookup').set({ Authorization }).expect(403);
      await request(server()).post('/v1/plates/RIO2A18/vehicle').set({ Authorization }).expect(403);
    });

    it('valida a placa e responde 404 para placa inexistente', async () => {
      const invalid = await request(server()).post('/v1/plates/ABC/lookup').set(asAlice).expect(400);
      expect(invalid.body.message).toBe('Placa inválida. Use ABC1D23 ou ABC1234.');
      const missing = await request(server()).post('/v1/plates/ZZZ1A11/lookup').set(asAlice).expect(404);
      expect(missing.body.message).toBe('Não encontramos dados para esta placa.');
    });

    it('usa o cache: repetir a consulta não chama o provedor de novo', async () => {
      await request(server()).post('/v1/plates/RIO2A18/lookup').set(asAlice).expect(200);
      expect(await dataSource.getRepository(PlateLookup).count({ where: { plate: 'RIO2A18' } })).toBe(2);
    });

    it('guarda as últimas 4 placas consultadas, da mais recente para a mais antiga', async () => {
      for (const plate of ['AAA1A11', 'BBB2B22', 'CCC3C33', 'RIO2A18']) {
        await request(server()).post(`/v1/plates/${plate}/lookup`).set(asAlice).expect(200);
      }
      const res = await request(server()).get('/v1/plates/history').set(asAlice).expect(200);
      expect(res.body).toEqual(['RIO2A18', 'CCC3C33', 'BBB2B22', 'AAA1A11']);
      const other = await request(server()).get('/v1/plates/history').set(asBob).expect(200);
      expect(other.body).toEqual([]);
    });

    it('limita as consultas pagas por dia, mas respostas do cache continuam liberadas', async () => {
      await redis.set(`rl:plate-lookup:${alice.id}`, '10', 'EX', 3600);
      const res = await request(server()).post('/v1/plates/DDD4D44/lookup').set(asAlice).expect(429);
      expect(res.body.message).toBe('Você atingiu o limite de consultas de hoje. Tente novamente amanhã.');
      await request(server()).post('/v1/plates/RIO2A18/lookup').set(asAlice).expect(200);
      await redis.del(`rl:plate-lookup:${alice.id}`);
    });
  });

  describe('veículos', () => {
    let first: string;
    let second: string;

    it('cadastra pela placa com os dados da consulta e torna o veículo ativo', async () => {
      const res = await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 38420 }).expect(201);
      first = res.body.id;
      expect(res.body).toMatchObject({ plate: 'RIO2A18', brand: 'Volkswagen', model: 'Polo Highline 1.0 200 TSI', color: 'Prata', currentOdometer: 38420 });
      const me = await request(server()).get('/v1/me').set(asAlice).expect(200);
      expect(me.body.activeVehicleId).toBe(first);
    });

    it('ignora marca/modelo enviados pelo cliente', async () => {
      await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'BRA4E21', brand: 'Ferrari' }).expect(400);
    });

    it('explica quando a placa já está cadastrada', async () => {
      const mine = await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18' }).expect(409);
      expect(mine.body.message).toBe('Este veículo já está na sua conta.');
      const theirs = await request(server()).post('/v1/vehicles').set(asBob).send({ plate: 'RIO2A18' }).expect(409);
      expect(theirs.body.message).toBe('Esta placa já está cadastrada em outra conta.');
      const missing = await request(server()).post('/v1/vehicles').set(asBob).send({ plate: 'ZZZ9Z99' }).expect(404);
      expect(missing.body.message).toBe('Não encontramos dados para esta placa.');
    });

    it('lista em ordem de cadastro e troca o veículo ativo', async () => {
      second = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'BRA4E21' }).expect(201)).body.id;
      const list = await request(server()).get('/v1/vehicles').set(asAlice).expect(200);
      expect(list.body.map((v: { plate: string }) => v.plate)).toEqual(['RIO2A18', 'BRA4E21']);

      await request(server()).post(`/v1/vehicles/${first}/activate`).set(asAlice).expect(200);
      expect((await request(server()).get('/v1/me').set(asAlice)).body.activeVehicleId).toBe(first);
      await request(server()).post(`/v1/vehicles/${first}/activate`).set(asBob).expect(404);
    });

    it('ao remover o veículo ativo, o outro assume', async () => {
      await request(server()).delete(`/v1/vehicles/${first}`).set(asAlice).expect(204);
      expect((await request(server()).get('/v1/me').set(asAlice)).body.activeVehicleId).toBe(second);
    });
  });
});

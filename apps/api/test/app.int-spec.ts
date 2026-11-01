import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { User } from '../src/modules/users/user.entity';
import { Vehicle } from '../src/modules/vehicles/vehicle.entity';
import { CSRF, createTestApp } from './helpers';

describe('Fundação da API (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let alice: User;
  let bob: User;
  let aliceToken: string;
  let bobToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}`, ...CSRF });
  const auditFor = (entity: string, entityId: string) =>
    dataSource.getRepository(AuditLog).find({ where: { entity, entityId }, order: { createdAt: 'ASC' } });

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());

    const users = dataSource.getRepository(User);
    alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'hash-a' }));
    bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'hash-b' }));

    const jwt = app.get(JwtService);
    aliceToken = jwt.sign({ sub: alice.id });
    bobToken = jwt.sign({ sub: bob.id });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('health é público', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('rotas exigem token', async () => {
    await request(app.getHttpServer()).get('/v1/vehicles').expect(401);
  });

  it('aceita o token pelo cookie httpOnly', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Cookie', `access_token=${aliceToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: alice.id, email: 'alice@test.dev' });
    expect(res.body.passwordHash).toBeUndefined();
  });

  describe('veículos: @CurrentUser, BaseEntity e auditoria', () => {
    let vehicleId: string;

    it('cria com dono e autoria vindos do token, placa normalizada', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/vehicles')
        .set(auth(aliceToken))
        .send({ plate: 'abc-1d23' })
        .expect(201);

      vehicleId = res.body.id;
      expect(res.body).toMatchObject({
        plate: 'ABC1D23',
        brand: expect.any(String),
        ownerId: alice.id,
        createdBy: alice.id,
        updatedBy: alice.id,
        version: 1,
        deletedAt: null,
      });
    });

    it('rejeita ownerId/userId enviados pelo cliente', async () => {
      await request(app.getHttpServer())
        .post('/v1/vehicles')
        .set(auth(bobToken))
        .send({ plate: 'XYZ9876', ownerId: alice.id })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/v1/vehicles/${vehicleId}`)
        .set(auth(aliceToken))
        .send({ userId: bob.id })
        .expect(400);
    });

    it('placa ativa pertence a um só dono (409)', async () => {
      await request(app.getHttpServer())
        .post('/v1/vehicles')
        .set(auth(bobToken))
        .send({ plate: 'ABC1D23' })
        .expect(409);
    });

    it('veículo de outro usuário responde 404', async () => {
      const server = app.getHttpServer();
      await request(server).get(`/v1/vehicles/${vehicleId}`).set(auth(bobToken)).expect(404);
      await request(server).patch(`/v1/vehicles/${vehicleId}`).set(auth(bobToken)).send({ currentOdometer: 10 }).expect(404);
      await request(server).delete(`/v1/vehicles/${vehicleId}`).set(auth(bobToken)).expect(404);
      await request(server).get(`/v1/vehicles/${vehicleId}/history`).set(auth(bobToken)).expect(404);
      const list = await request(server).get('/v1/vehicles').set(auth(bobToken)).expect(200);
      expect(list.body).toEqual([]);
    });

    it('atualização gera log com apenas os campos alterados e o contexto da requisição', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/vehicles/${vehicleId}`)
        .set(auth(aliceToken))
        .set('X-Request-Id', 'req-teste-123')
        .set('User-Agent', 'jest')
        .send({ currentOdometer: 1500 })
        .expect(200);
      expect(res.body).toMatchObject({ currentOdometer: 1500, updatedBy: alice.id, version: 2 });

      const history = await request(app.getHttpServer())
        .get(`/v1/vehicles/${vehicleId}/history`)
        .set(auth(aliceToken))
        .expect(200);
      expect(history.body.map((log: AuditLog) => log.action)).toEqual(['UPDATE', 'CREATE']);
      expect(history.body[0]).toMatchObject({
        entity: 'Vehicle',
        entityId: vehicleId,
        userId: alice.id,
        requestId: 'req-teste-123',
        userAgent: 'jest',
        changes: { currentOdometer: { from: 0, to: 1500 } },
      });
    });

    it('exclusão é soft delete e fica registrada', async () => {
      const server = app.getHttpServer();
      await request(server).delete(`/v1/vehicles/${vehicleId}`).set(auth(aliceToken)).expect(204);
      await request(server).get(`/v1/vehicles/${vehicleId}`).set(auth(aliceToken)).expect(404);

      const row = await dataSource.getRepository(Vehicle).findOne({ where: { id: vehicleId }, withDeleted: true });
      expect(row?.deletedAt).toBeInstanceOf(Date);

      const logs = await auditFor('Vehicle', vehicleId);
      expect(logs.map((log) => log.action)).toEqual(['CREATE', 'UPDATE', 'SOFT_DELETE']);
      expect(logs[2].userId).toBe(alice.id);
    });

    it('placa volta a ficar disponível após soft delete', async () => {
      await request(app.getHttpServer())
        .post('/v1/vehicles')
        .set(auth(bobToken))
        .send({ plate: 'ABC1D23' })
        .expect(201);
    });
  });

  it('campos sensíveis nunca vão para o audit_logs', async () => {
    const [created] = await auditFor('User', alice.id);
    expect(created.action).toBe('CREATE');
    expect(created.snapshot).toMatchObject({ email: 'alice@test.dev' });
    expect(created.snapshot).not.toHaveProperty('passwordHash');
  });

  it('audit_logs é append-only no banco', async () => {
    await expect(dataSource.query(`DELETE FROM audit_logs`)).rejects.toThrow(/append-only/);
  });
});

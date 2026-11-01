import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { User } from '../src/modules/users/user.entity';
import { CSRF, createTestApp } from './helpers';

describe('Cadastro manual do veículo e contatos de emergência (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;
  let vehicleId: string;
  let contacts: string;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const users = dataSource.getRepository(User);
    const alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    const bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('cadastro manual', () => {
    it('salva os dados digitados, sem consultar a placa nem importar débitos', async () => {
      const res = await request(server())
        .post('/v1/vehicles')
        .set(asAlice)
        .send({
          plate: 'man-1a23',
          currentOdometer: 108000,
          purchaseDate: '2021-03-15',
          manual: { brand: 'Volkswagen', model: ' Polo ', modelVersion: 'Highline 1.0 200 TSI', color: 'Prata', yearModel: 2019 },
        })
        .expect(201);
      vehicleId = res.body.id;
      expect(res.body).toMatchObject({
        plate: 'MAN1A23',
        brand: 'Volkswagen',
        model: 'Polo',
        modelVersion: 'Highline 1.0 200 TSI',
        color: 'Prata',
        yearModel: 2019,
        yearFab: null,
        municipality: null,
        fipeCode: null,
        purchaseDate: '2021-03-15',
        currentOdometer: 108000,
      });

      const reminders = (await request(server()).get(`/v1/vehicles/${vehicleId}/reminders`).set(asAlice).expect(200)).body.items;
      expect(reminders.map((r: { source: string }) => r.source)).toEqual(['AUTO_SERVICE']);
    });

    it('exige marca e modelo e valida a data da compra', async () => {
      const res = await request(server())
        .post('/v1/vehicles')
        .set(asAlice)
        .send({ plate: 'MAN2B34', purchaseDate: '2021-02-30', manual: { brand: '', model: '' } })
        .expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining(['Data da compra inválida.', 'manual.Informe a marca.', 'manual.Informe o modelo.']));
    });
  });

  describe('contatos de emergência', () => {
    beforeAll(() => {
      contacts = `/v1/vehicles/${vehicleId}/emergency-contacts`;
    });

    it('cadastra, lista na ordem dos tipos e audita', async () => {
      await request(server()).post(contacts).set(asAlice).send({ kind: 'HIGHWAY', name: 'Arteris Fluminense', phone: '0800 282 0040', notes: 'BR-101' }).expect(201);
      const insurer = await request(server()).post(contacts).set(asAlice).send({ kind: 'INSURANCE', name: ' Porto Seguro ', phone: '333 PORTO', notes: '  ' });
      expect(insurer.status).toBe(400);
      expect(insurer.body.message).toEqual(['Telefone inválido.']);

      const created = await request(server()).post(contacts).set(asAlice).send({ kind: 'INSURANCE', name: ' Porto Seguro ', phone: '0800 727 0800', notes: '  ' }).expect(201);
      expect(created.body).toMatchObject({ kind: 'INSURANCE', name: 'Porto Seguro', phone: '0800 727 0800', notes: null });

      const list = await request(server()).get(contacts).set(asAlice).expect(200);
      expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Porto Seguro', 'Arteris Fluminense']);

      const history = await dataSource.getRepository(AuditLog).find({ where: { entity: 'EmergencyContact', entityId: created.body.id } });
      expect(history.map((log) => log.action)).toEqual(['CREATE']);
    });

    it('edita, exclui e isola por dono', async () => {
      const [first] = (await request(server()).get(contacts).set(asAlice)).body;
      await request(server()).get(contacts).set(asBob).expect(404);
      await request(server()).patch(`${contacts}/${first.id}`).set(asBob).send({ kind: 'OTHER', name: 'Oficina', phone: '123' }).expect(404);

      const updated = await request(server())
        .patch(`${contacts}/${first.id}`)
        .set(asAlice)
        .send({ kind: 'INSURANCE', name: 'Porto Seguro Auto', phone: '(11) 3003-9303' })
        .expect(200);
      expect(updated.body).toMatchObject({ name: 'Porto Seguro Auto', phone: '(11) 3003-9303' });

      await request(server()).delete(`${contacts}/${first.id}`).set(asAlice).expect(204);
      expect((await request(server()).get(contacts).set(asAlice)).body).toHaveLength(1);
      await request(server()).post(contacts).set(asAlice).send({ kind: 'GUINCHO', name: 'Oficina', phone: '123' }).expect(400);
    });
  });
});

import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { User } from '../src/modules/users/user.entity';
import { Vehicle } from '../src/modules/vehicles/vehicle.entity';
import { CSRF, createTestApp } from './helpers';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 7)]);

describe('Gastos e fotos (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;
  let vehicleId: string;
  let base: string;

  const server = () => app.getHttpServer();
  const upload = (headers: Record<string, string>, content: Buffer, name = 'nota.jpg') =>
    request(server()).post('/v1/files').set(headers).attach('file', content, name);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const users = dataSource.getRepository(User);
    const alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    const bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
    vehicleId = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 38000 })).body.id;
    base = `/v1/vehicles/${vehicleId}/expenses`;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('fotos', () => {
    it('aceita imagem pelo conteúdo e entrega só para o dono', async () => {
      const res = await upload(asAlice, JPEG).expect(201);
      expect(res.body).toMatchObject({ mime: 'image/jpeg', size: JPEG.length });
      const download = await request(server()).get(`/v1/files/${res.body.id}`).set(asAlice).expect(200);
      expect(download.headers['content-type']).toBe('image/jpeg');
      expect(Buffer.compare(download.body, JPEG)).toBe(0);
      await request(server()).get(`/v1/files/${res.body.id}`).set(asBob).expect(404);
    });

    it('recusa arquivos que não são imagem nem PDF, mesmo com extensão .jpg', async () => {
      const res = await upload(asAlice, Buffer.from('PK\x03\x04 arquivo zip disfarçado'), 'falsa.jpg').expect(400);
      expect(res.body.message).toBe('Envie uma foto (JPEG, PNG, WebP ou HEIC) ou um PDF.');
    });
  });

  describe('gastos', () => {
    let fuelId: string;
    let photoA: string;
    let photoB: string;

    beforeAll(async () => {
      photoA = (await upload(asAlice, JPEG)).body.id;
      photoB = (await upload(asAlice, JPEG)).body.id;
    });

    it('lança abastecimento com litros, fotos e odômetro (que atualiza o carro)', async () => {
      const res = await request(server())
        .post(base)
        .set(asAlice)
        .send({
          category: 'FUEL',
          amountCents: 22920,
          date: '2026-10-28',
          description: 'Gasolina comum · 38,2 L',
          odometer: 38420,
          attachmentIds: [photoA, photoB],
          fuel: { liters: 38.2, fullTank: true },
        })
        .expect(201);
      fuelId = res.body.id;
      expect(res.body).toMatchObject({
        category: 'FUEL',
        partSystem: null,
        amountCents: 22920,
        date: '2026-10-28',
        attachments: [{ id: photoA }, { id: photoB }],
        fuel: { liters: 38.2, fullTank: true },
      });
      const vehicle = await dataSource.getRepository(Vehicle).findOneByOrFail({ id: vehicleId });
      expect(vehicle.currentOdometer).toBe(38420);
    });

    it('aplica as regras de categoria do design', async () => {
      const parts = await request(server()).post(base).set(asAlice).send({ category: 'PARTS', amountCents: 45990, date: '2026-10-18' }).expect(400);
      expect(parts.body.message).toBe('Escolha a classificação da peça.');

      const fine = await request(server())
        .post(base)
        .set(asAlice)
        .send({ category: 'FINES', partSystem: 'BRAKES', amountCents: 13016, date: '2026-10-15', fuel: { liters: 10 } })
        .expect(201);
      expect(fine.body).toMatchObject({ partSystem: null, fuel: null, description: 'Multas' });

      await request(server())
        .post(base)
        .set(asAlice)
        .send({ category: 'MAINTENANCE', partSystem: 'FILTERS', amountCents: 28900, date: '2026-10-22', description: 'Troca de óleo e filtro' })
        .expect(201);
      await request(server()).post(base).set(asAlice).send({ category: 'PARTS', partSystem: 'ELECTRICAL', amountCents: 45990, date: '2026-09-18' }).expect(201);

      const zero = await request(server()).post(base).set(asAlice).send({ category: 'OTHER', amountCents: 0, date: '2026-10-01' }).expect(400);
      expect(zero.body.message).toEqual(['Informe um valor maior que zero.']);
    });

    it('não deixa anexar fotos de outra pessoa', async () => {
      const bobPhoto = (await upload(asBob, JPEG)).body.id;
      const res = await request(server()).post(base).set(asAlice).send({ category: 'OTHER', amountCents: 2800, date: '2026-10-02', attachmentIds: [bobPhoto] }).expect(400);
      expect(res.body.message).toBe('Foto não encontrada. Envie novamente.');
    });

    it('filtra por mês, categoria e sistema da peça, e resume os meses', async () => {
      const october = await request(server()).get(`${base}?month=2026-10`).set(asAlice).expect(200);
      expect(october.body.map((e: { date: string }) => e.date)).toEqual(['2026-10-28', '2026-10-22', '2026-10-15']);
      const fuel = await request(server()).get(`${base}?category=FUEL`).set(asAlice).expect(200);
      expect(fuel.body).toHaveLength(1);
      const filters = await request(server()).get(`${base}?partSystem=FILTERS`).set(asAlice).expect(200);
      expect(filters.body[0].description).toBe('Troca de óleo e filtro');

      const months = await request(server()).get(`${base}/months`).set(asAlice).expect(200);
      expect(months.body).toEqual([
        { month: '2026-09', count: 1, totalCents: 45990 },
        { month: '2026-10', count: 3, totalCents: 22920 + 13016 + 28900 },
      ]);
    });

    it('edita: troca de categoria remove os litros e a lista de fotos é substituída', async () => {
      const res = await request(server())
        .patch(`${base}/${fuelId}`)
        .set(asAlice)
        .send({ category: 'OTHER', amountCents: 23000, attachmentIds: [photoB] })
        .expect(200);
      expect(res.body).toMatchObject({ category: 'OTHER', amountCents: 23000, fuel: null, attachments: [{ id: photoB }] });

      const history = await dataSource.getRepository(AuditLog).find({ where: { entity: 'Expense', entityId: fuelId, action: 'UPDATE' } });
      expect(history[0].changes).toMatchObject({ amountCents: { from: 22920, to: 23000 } });
    });

    it('isola os gastos por dono', async () => {
      await request(server()).get(base).set(asBob).expect(404);
      await request(server()).get(`${base}/${fuelId}`).set(asBob).expect(404);
      await request(server()).patch(`${base}/${fuelId}`).set(asBob).send({ amountCents: 1 }).expect(404);
      await request(server()).delete(`${base}/${fuelId}`).set(asBob).expect(404);
    });

    it('exclui (soft delete) e some das listas e do resumo de meses', async () => {
      await request(server()).delete(`${base}/${fuelId}`).set(asAlice).expect(204);
      await request(server()).get(`${base}/${fuelId}`).set(asAlice).expect(404);
      const months = await request(server()).get(`${base}/months`).set(asAlice).expect(200);
      expect(months.body.find((m: { month: string }) => m.month === '2026-10')).toEqual({ month: '2026-10', count: 2, totalCents: 13016 + 28900 });
    });
  });

  describe('odômetro do carro', () => {
    let carId: string;
    let carBase: string;
    const odometer = async () => (await dataSource.getRepository(Vehicle).findOneByOrFail({ id: carId })).currentOdometer;
    const serviceReminders = async () =>
      (await request(server()).get(`/v1/vehicles/${carId}/reminders`).set(asBob).expect(200)).body.items
        .filter((r: { source: string; doneAt: string | null }) => r.source === 'AUTO_SERVICE' && !r.doneAt)
        .map((r: { title: string }) => r.title);

    beforeAll(async () => {
      carId = (await request(server()).post('/v1/vehicles').set(asBob).send({ plate: 'KMS1A00', currentOdometer: 108000 })).body.id;
      carBase = `/v1/vehicles/${carId}/expenses`;
    });

    it('sobe com qualquer lançamento com km maior e ignora km menor', async () => {
      await request(server()).post(carBase).set(asBob).send({ category: 'OTHER', amountCents: 1000, date: '2026-10-01', odometer: 108500 }).expect(201);
      expect(await odometer()).toBe(108500);
      await request(server()).post(carBase).set(asBob).send({ category: 'OTHER', amountCents: 1000, date: '2026-09-01', odometer: 100000 }).expect(201);
      expect(await odometer()).toBe(108500);
    });

    it('corrigir o km digitado errado recalcula o carro e a próxima revisão', async () => {
      const typo = await request(server())
        .post(carBase)
        .set(asBob)
        .send({ category: 'MAINTENANCE', amountCents: 5000, date: '2026-10-20', odometer: 1_090_000 })
        .expect(201);
      expect(await odometer()).toBe(1_090_000);
      expect(await serviceReminders()).toEqual(['Revisão dos 110.000 km', 'Revisão dos 1.100.000 km']);

      await request(server()).patch(`${carBase}/${typo.body.id}`).set(asBob).send({ odometer: 109000 }).expect(200);
      expect(await odometer()).toBe(109000);
      expect(await serviceReminders()).toEqual(['Revisão dos 110.000 km']);

      await request(server()).delete(`${carBase}/${typo.body.id}`).set(asBob).expect(204);
      expect(await odometer()).toBe(108500);
    });

    it('nunca fica abaixo do km informado no cadastro ou na Ficha', async () => {
      const list = (await request(server()).get(carBase).set(asBob).expect(200)).body as { id: string; odometer: number }[];
      await request(server()).delete(`${carBase}/${list.find((e) => e.odometer === 108500)!.id}`).set(asBob).expect(204);
      expect(await odometer()).toBe(108000);

      await request(server()).patch(`/v1/vehicles/${carId}`).set(asBob).send({ currentOdometer: 95000 }).expect(200);
      expect(await odometer()).toBe(100000);
    });
  });
});

import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { addDays, todayInBrazil } from '../src/common/today';
import { addMonths as addMonthsIso } from '../src/modules/reminders/reminder-rules';
import { DailyRemindersJob } from '../src/modules/jobs/daily-reminders.job';
import { addMonths } from '../src/modules/reminders/reminder-rules';
import { User } from '../src/modules/users/user.entity';
import { CSRF, createTestApp } from './helpers';

interface ReminderBody {
  id: string;
  title: string;
  category: string;
  automatic: boolean;
  dueDate: string | null;
  dueOdometer: number | null;
  amountCents: number | null;
  doneAt: string | null;
}

describe('Lembretes e Resumo (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;
  let vehicleId: string;
  let base: string;
  const today = todayInBrazil();
  const year = Number(today.slice(0, 4));

  const server = () => app.getHttpServer();
  const list = async () => (await request(server()).get(base).set(asAlice).expect(200)).body as { kmPerDay: number | null; items: ReminderBody[] };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const users = dataSource.getRepository(User);
    const alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    const bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
    vehicleId = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 38420 })).body.id;
    base = `/v1/vehicles/${vehicleId}/reminders`;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('automáticos', () => {
    it('o veículo novo já nasce com multa em aberto, revisão por km e estimativa do IPVA', async () => {
      const items = (await list()).items.filter((r) => r.title !== 'Troca de óleo');
      expect(items.map((r) => r.title)).toEqual(['Pagar multa de velocidade', 'Revisão dos 40.000 km', `IPVA ${year + 1}`]);
      expect(items[0]).toMatchObject({ category: 'FINES', automatic: true, amountCents: 13016, dueDate: addDays(today, 10) });
      expect(items[1]).toMatchObject({ category: 'MAINTENANCE', dueOdometer: 40000 });
      expect(items[2]).toMatchObject({ category: 'DOCUMENTS', dueDate: `${year + 1}-01-31`, amountCents: 198540 });
    });

    it('não duplica ao consultar a placa de novo e não deixa excluir automáticos', async () => {
      await request(server()).post('/v1/plates/RIO2A18/lookup').set(asAlice).expect(200);
      const { items } = await list();
      expect(items).toHaveLength(4);
      const res = await request(server()).delete(`${base}/${items[0].id}`).set(asAlice).expect(400);
      expect(res.body.message).toBe('Lembretes automáticos não podem ser excluídos; marque como concluído.');
    });

    it('troca de óleo: vence por data ou km, segue o intervalo da Ficha e recomeça na última troca lançada', async () => {
      const oil = async () => (await list()).items.filter((r) => r.title === 'Troca de óleo' && !r.doneAt);
      expect(await oil()).toEqual([expect.objectContaining({ category: 'MAINTENANCE', automatic: true, dueOdometer: 48420, dueDate: addMonthsIso(today, 12) })]);

      const invalid = await request(server()).patch(`/v1/vehicles/${vehicleId}`).set(asAlice).send({ oilChangeIntervalKm: 7000 }).expect(400);
      expect(invalid.body.message).toContain('Escolha 6 meses ou 5 mil km, ou 1 ano ou 10 mil km.');
      await request(server()).patch(`/v1/vehicles/${vehicleId}`).set(asAlice).send({ oilChangeIntervalKm: 5000 }).expect(200);
      expect(await oil()).toEqual([expect.objectContaining({ dueOdometer: 43420, dueDate: addMonthsIso(today, 6) })]);

      const change = await request(server())
        .post(`/v1/vehicles/${vehicleId}/expenses`)
        .set(asAlice)
        .send({ category: 'MAINTENANCE', description: 'Troca de óleo e filtro', amountCents: 35000, date: today, odometer: 39000 })
        .expect(201);
      expect(await oil()).toEqual([expect.objectContaining({ dueOdometer: 44000, dueDate: addMonthsIso(today, 6) })]);

      await request(server()).delete(`/v1/vehicles/${vehicleId}/expenses/${change.body.id}`).set(asAlice).expect(204);
      await request(server()).patch(`/v1/vehicles/${vehicleId}`).set(asAlice).send({ oilChangeIntervalKm: 10000 }).expect(200);
      expect(await oil()).toEqual([expect.objectContaining({ dueOdometer: 48420, dueDate: addMonthsIso(today, 12) })]);
    });

    it('a revisão concluída dá lugar à próxima quando o odômetro passa dela', async () => {
      const service = (await list()).items.find((r) => r.dueOdometer === 40000)!;
      await request(server()).post(`${base}/${service.id}/done`).set(asAlice).expect(200);
      await request(server())
        .post(`/v1/vehicles/${vehicleId}/expenses`)
        .set(asAlice)
        .send({ category: 'FUEL', amountCents: 20000, date: today, odometer: 40150 })
        .expect(201);
      const titles = (await list()).items.filter((r) => !r.doneAt).map((r) => r.title);
      expect(titles).toContain('Revisão dos 50.000 km');
    });
  });

  describe('manuais', () => {
    let insurance: ReminderBody;

    it('exige data ou quilometragem', async () => {
      const res = await request(server()).post(base).set(asAlice).send({ title: 'Renovar seguro', category: 'INSURANCE' }).expect(400);
      expect(res.body.message).toBe('Informe uma data ou uma quilometragem.');
    });

    it('cria, conclui (gerando a próxima ocorrência) e reabre', async () => {
      const due = addDays(today, 120);
      insurance = (
        await request(server()).post(base).set(asAlice).send({ title: 'Renovar seguro', category: 'INSURANCE', dueDate: due, repeatMonths: 12 }).expect(201)
      ).body;
      expect(insurance).toMatchObject({ automatic: false, dueDate: due });

      await request(server()).post(`${base}/${insurance.id}/done`).set(asAlice).expect(200);
      const next = (await list()).items.find((r) => r.title === 'Renovar seguro' && !r.doneAt);
      expect(next?.dueDate).toBe(addMonths(due, 12));

      const reopened = await request(server()).post(`${base}/${insurance.id}/undo`).set(asAlice).expect(200);
      expect(reopened.body.doneAt).toBeNull();
    });

    it('isola os lembretes por dono', async () => {
      await request(server()).get(base).set(asBob).expect(404);
      await request(server()).post(`${base}/${insurance.id}/done`).set(asBob).expect(404);
      await request(server()).delete(`${base}/${insurance.id}`).set(asBob).expect(404);
    });

    it('exclui lembretes manuais', async () => {
      await request(server()).delete(`${base}/${insurance.id}`).set(asAlice).expect(204);
      expect((await list()).items.find((r) => r.id === insurance.id)).toBeUndefined();
    });
  });

  describe('Resumo', () => {
    it('soma o mês, compara com o anterior, calcula km rodados, custo por km e traz recentes e próximos', async () => {
      const month = today.slice(0, 7);
      const previous = addMonths(`${month}-01`, -1).slice(0, 7);
      const expenses = `/v1/vehicles/${vehicleId}/expenses`;
      await request(server()).post(expenses).set(asAlice).send({ category: 'FUEL', amountCents: 10000, date: `${previous}-10`, odometer: 39000 }).expect(201);
      await request(server()).post(expenses).set(asAlice).send({ category: 'FINES', amountCents: 13016, date: `${month}-01` }).expect(201);

      const res = await request(server()).get(`/v1/vehicles/${vehicleId}/summary?month=${month}`).set(asAlice).expect(200);
      expect(res.body).toMatchObject({
        month,
        totalCents: 20000 + 13016,
        previousCents: 10000,
        deltaPct: 230,
        kmDriven: 1150,
        costPerKmCents: Math.round(33016 / 1150),
        odometer: 40150,
        categories: [
          { code: 'FUEL', cents: 20000 },
          { code: 'FINES', cents: 13016 },
        ],
      });
      expect(res.body.months).toHaveLength(6);
      expect(res.body.months.at(-1)).toEqual({ month, cents: 33016 });
      expect(res.body.recent).toHaveLength(3);
      expect(res.body.upcoming.items[0].title).toBe('Pagar multa de velocidade');

      await request(server()).get(`/v1/vehicles/${vehicleId}/summary?month=2026-13`).set(asAlice).expect(400);
      await request(server()).get(`/v1/vehicles/${vehicleId}/summary?month=${month}`).set(asBob).expect(404);
    });
  });

  describe('job diário', () => {
    it('recalcula a revisão pelo odômetro e, às segundas, atualiza os débitos', async () => {
      const job = app.get(DailyRemindersJob);
      await dataSource.query(`UPDATE vehicles SET current_odometer = 50100 WHERE id = $1`, [vehicleId]);
      const monday = addDays(today, (8 - new Date(`${today}T12:00:00Z`).getUTCDay()) % 7 || 7);
      expect(await job.run(monday)).toEqual({ vehicles: 1, insurances: 0 });
      const titles = (await list()).items.filter((r) => !r.doneAt).map((r) => r.title);
      expect(titles).toContain('Revisão dos 60.000 km');
      expect(titles).toContain('Pagar multa de velocidade');
    });
  });
});

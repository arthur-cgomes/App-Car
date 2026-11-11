import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { todayInBrazil } from '../src/common/today';
import { FipeProvider } from '../src/modules/fipe/fipe-provider';
import { MockFipeProvider } from '../src/modules/fipe/mock-fipe.provider';
import { InsurancesService } from '../src/modules/insurances/insurances.service';
import { addMonths } from '../src/modules/reminders/reminder-rules';
import { User } from '../src/modules/users/user.entity';
import { CSRF, createTestApp } from './helpers';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF');

describe('Ficha do veículo (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;
  let vehicleId: string;
  let v: string;
  const today = todayInBrazil();

  const server = () => app.getHttpServer();
  const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  };

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    const users = dataSource.getRepository(User);
    const alice = await users.save(users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: 'x' }));
    const bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: 'x' }));
    const jwt = app.get(JwtService);
    asAlice = { Authorization: `Bearer ${jwt.sign({ sub: alice.id })}`, ...CSRF };
    asBob = { Authorization: `Bearer ${jwt.sign({ sub: bob.id })}`, ...CSRF };
    vehicleId = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 37000 })).body.id;
    v = `/v1/vehicles/${vehicleId}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('FIPE: busca uma vez por mês de referência e guarda no veículo', async () => {
    const provider = app.get(FipeProvider) as MockFipeProvider;
    const first = await request(server()).get(`${v}/fipe`).set(asAlice).expect(200);
    expect(first.body).toEqual({ available: true, manual: false, code: '005476-3', valueCents: 7932600, referenceMonth: today.slice(0, 7), ipvaEstimateCents: 317304 });
    await request(server()).get(`${v}/fipe`).set(asAlice).expect(200);
    expect(provider.calls).toBe(1);

    const other = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'BRA4E21' })).body.id;
    expect((await request(server()).get(`/v1/vehicles/${other}/fipe`).set(asAlice).expect(200)).body).toEqual({ available: false });
    await request(server()).get(`${v}/fipe`).set(asBob).expect(404);
  });

  it('FIPE pela placa quando o veículo não tem código FIPE, consultando a placa uma vez só', async () => {
    const provider = app.get(FipeProvider) as MockFipeProvider;
    const manual = { brand: 'Volkswagen', model: 'Polo' };
    const found = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'FIP3E21', manual })).body.id;
    const missing = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'SEM1F23', manual })).body.id;
    const before = provider.plateCalls;

    const res = await request(server()).get(`/v1/vehicles/${found}/fipe`).set(asAlice).expect(200);
    expect(res.body).toEqual({ available: true, manual: false, code: '005476-3', valueCents: 7932600, referenceMonth: today.slice(0, 7), ipvaEstimateCents: 317304 });
    await request(server()).get(`/v1/vehicles/${found}/fipe`).set(asAlice).expect(200);
    expect((await request(server()).get(v.replace(vehicleId, found)).set(asAlice).expect(200)).body).toMatchObject({ fipeCode: '005476-3', yearModel: 2019 });

    expect((await request(server()).get(`/v1/vehicles/${missing}/fipe`).set(asAlice).expect(200)).body).toEqual({ available: false });
    await request(server()).get(`/v1/vehicles/${missing}/fipe`).set(asAlice).expect(200);
    expect(provider.plateCalls - before).toBe(2);

    await request(server()).delete(`/v1/vehicles/${found}`).set(asAlice).expect(204);
    await request(server()).delete(`/v1/vehicles/${missing}`).set(asAlice).expect(204);
  });

  it('FIPE informada pelo usuário prevalece e pode voltar ao valor automático', async () => {
    const provider = app.get(FipeProvider) as MockFipeProvider;
    const manual = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'MAN4D56', manual: { brand: 'Fiat', model: 'Argo' } })).body.id;
    const fipe = `/v1/vehicles/${manual}/fipe`;
    expect((await request(server()).get(fipe).set(asAlice).expect(200)).body).toEqual({ available: false });

    const invalid = await request(server()).patch(`/v1/vehicles/${manual}`).set(asAlice).send({ fipeValueCents: 12.5 }).expect(400);
    expect(invalid.body.message).toContain('Informe o valor FIPE em reais.');

    await request(server()).patch(`/v1/vehicles/${manual}`).set(asAlice).send({ fipeValueCents: 6500000 }).expect(200);
    const calls = provider.plateCalls + provider.calls;
    expect((await request(server()).get(fipe).set(asAlice).expect(200)).body).toEqual({
      available: true,
      manual: true,
      code: null,
      valueCents: 6500000,
      referenceMonth: today.slice(0, 7),
      ipvaEstimateCents: 260000,
    });
    expect(provider.plateCalls + provider.calls).toBe(calls);
    const ipva = (await request(server()).get(`/v1/vehicles/${manual}/reminders`).set(asAlice).expect(200)).body.items.find(
      (r: { source: string }) => r.source === 'AUTO_IPVA',
    );
    expect(ipva).toMatchObject({ title: `IPVA ${+today.slice(0, 4) + 1}`, amountCents: 260000 });

    await request(server()).patch(`/v1/vehicles/${manual}`).set(asAlice).send({ fipeValueCents: null }).expect(200);
    expect((await request(server()).get(fipe).set(asAlice).expect(200)).body).toEqual({ available: false });
    await request(server()).patch(`/v1/vehicles/${manual}`).set(asBob).send({ fipeValueCents: 100000 }).expect(404);
    await request(server()).delete(`/v1/vehicles/${manual}`).set(asAlice).expect(204);
  });

  it('atualiza só a km do carro', async () => {
    const res = await request(server()).patch(v).set(asAlice).send({ currentOdometer: 41250 }).expect(200);
    expect(res.body.currentOdometer).toBe(41250);
  });

  describe('documentos', () => {
    let ipvaId: string;

    it('cadastra com PDF anexado e lista pendentes primeiro', async () => {
      const file = await request(server()).post('/v1/files').set(asAlice).attach('file', PDF, 'crlv.pdf').expect(201);
      expect(file.body.mime).toBe('application/pdf');
      await request(server()).post(`${v}/documents`).set(asAlice).send({ type: 'CRLV', year: 2026, fileId: file.body.id }).expect(201);
      ipvaId = (
        await request(server()).post(`${v}/documents`).set(asAlice).send({ type: 'IPVA', year: 2026, amountCents: 198540, dueDate: '2026-01-31' }).expect(201)
      ).body.id;
      const list = await request(server()).get(`${v}/documents`).set(asAlice).expect(200);
      expect(list.body.map((d: { type: string }) => d.type)).toEqual(['IPVA', 'CRLV']);
    });

    it('marcar como pago lança o gasto em Documentos', async () => {
      const paid = await request(server()).post(`${v}/documents/${ipvaId}/pay`).set(asAlice).send({ date: '2026-01-20' }).expect(200);
      expect(paid.body).toMatchObject({ paidAt: '2026-01-20', expenseId: expect.any(String) });
      const expenses = await request(server()).get(`${v}/expenses?category=DOCUMENTS`).set(asAlice).expect(200);
      expect(expenses.body[0]).toMatchObject({ description: 'IPVA 2026', amountCents: 198540, date: '2026-01-20' });

      const again = await request(server()).post(`${v}/documents/${ipvaId}/pay`).set(asAlice).send({}).expect(400);
      expect(again.body.message).toBe('Este documento já está pago.');
      const crlv = (await request(server()).get(`${v}/documents`).set(asAlice)).body.find((d: { type: string }) => d.type === 'CRLV');
      const noAmount = await request(server()).post(`${v}/documents/${crlv.id}/pay`).set(asAlice).send({}).expect(400);
      expect(noAmount.body.message).toBe('Informe o valor para marcar como pago.');
    });

    it('isola por dono', async () => {
      await request(server()).get(`${v}/documents`).set(asBob).expect(404);
      await request(server()).post(`${v}/documents/${ipvaId}/pay`).set(asBob).send({}).expect(404);
    });
  });

  describe('seguros', () => {
    let insuranceId: string;
    const reminders = async () =>
      (await request(server()).get(`${v}/reminders`).set(asAlice)).body.items.filter((r: { title: string }) => r.title === 'Renovar seguro');

    it('valida a vigência', async () => {
      const res = await request(server())
        .post(`${v}/insurances`)
        .set(asAlice)
        .send({ insurer: 'Porto Seguro', startDate: '2026-03-05', endDate: '2026-03-05' })
        .expect(400);
      expect(res.body.message).toBe('O fim da vigência deve ser depois do início.');
    });

    it('a apólice cria o lembrete de renovação, que acompanha edições e some na exclusão', async () => {
      insuranceId = (
        await request(server())
          .post(`${v}/insurances`)
          .set(asAlice)
          .send({ insurer: 'Porto Seguro', policyNumber: '123', startDate: '2026-03-05', endDate: '2027-03-05', premiumCents: 312400, installments: 10 })
          .expect(201)
      ).body.id;
      expect(await reminders()).toEqual([expect.objectContaining({ category: 'INSURANCE', dueDate: '2027-03-05', automatic: true })]);

      await request(server())
        .patch(`${v}/insurances/${insuranceId}`)
        .set(asAlice)
        .send({ insurer: 'Porto Seguro', startDate: '2026-03-05', endDate: '2027-04-10' })
        .expect(200);
      expect((await reminders())[0].dueDate).toBe('2027-04-10');

      await request(server()).delete(`${v}/insurances/${insuranceId}`).set(asAlice).expect(204);
      expect(await reminders()).toEqual([]);
    });

    it('valida as parcelas', async () => {
      const base = { insurer: 'Porto Seguro', startDate: '2026-03-05', endDate: '2027-03-05' };
      const send = (body: object) => request(server()).post(`${v}/insurances`).set(asAlice).send({ ...base, ...body }).expect(400);
      expect((await send({ installmentCents: 15550, firstInstallmentDate: today })).body.message).toBe('Informe o total de parcelas.');
      expect((await send({ installments: 24, firstInstallmentDate: today })).body.message).toBe('Informe o valor da parcela.');
      expect((await send({ installments: 24, installmentCents: 15550 })).body.message).toBe('Informe a data da parcela.');
      expect((await send({ installments: 12, installmentCents: 15550, firstInstallmentDate: today, firstInstallmentNumber: 13 })).body.message).toBe(
        'A parcela não pode passar do total de parcelas.',
      );
    });

    it('lança em Gastos as parcelas cuja data chegou, sem recriar as excluídas', async () => {
      const installments = async () =>
        (await request(server()).get(`${v}/expenses`).set(asAlice)).body
          .filter((expense: { source: string }) => expense.source === 'INSURANCE')
          .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
      const plan = { insurer: 'Porto Seguro', startDate: '2025-12-01', endDate: '2027-12-01', premiumCents: 373200, installments: 24, deductibleCents: 350000 };
      const id = (
        await request(server())
          .post(`${v}/insurances`)
          .set(asAlice)
          .send({ ...plan, installmentCents: 15550, firstInstallmentNumber: 11, firstInstallmentDate: addMonths(today, -2) })
          .expect(201)
      ).body.id;

      const first = await installments();
      expect(first.map((e: { description: string }) => e.description)).toEqual(['Seguro parcela 11/24', 'Seguro parcela 12/24', 'Seguro parcela 13/24']);
      expect(first[0]).toMatchObject({ category: 'INSURANCE', amountCents: 15550, establishment: 'Porto Seguro', date: addMonths(today, -2) });

      await request(server()).delete(`${v}/expenses/${first[1].id}`).set(asAlice).expect(204);
      await app.get(InsurancesService).syncAllInstallments(addMonths(today, 1));
      expect((await installments()).map((e: { description: string }) => e.description)).toEqual(['Seguro parcela 11/24', 'Seguro parcela 13/24', 'Seguro parcela 14/24']);

      await request(server())
        .patch(`${v}/insurances/${id}`)
        .set(asAlice)
        .send({ ...plan, installmentCents: 16000, firstInstallmentNumber: 12, firstInstallmentDate: addMonths(today, -1) })
        .expect(200);
      const edited = await installments();
      expect(edited.map((e: { description: string; amountCents: number }) => [e.description, e.amountCents])).toEqual([
        ['Seguro parcela 12/24', 16000],
        ['Seguro parcela 13/24', 16000],
      ]);

      await request(server()).delete(`${v}/insurances/${id}`).set(asAlice).expect(204);
      expect(await installments()).toHaveLength(2);
      for (const expense of edited) await request(server()).delete(`${v}/expenses/${expense.id}`).set(asAlice).expect(204);
    });
  });

  describe('pneus', () => {
    const t = () => `${v}/tires`;
    const setup = { brand: 'Pirelli', model: 'Cinturato P7', size: '205/50 R17 89V', installedOdometer: 30000, installedDate: '2024-03-12', spareSize: '175/70 R14 84T', spareYear: 2019 };

    it('começa vazio e cadastra o jogo com estepe, uma vez só', async () => {
      expect((await request(server()).get(t()).set(asAlice).expect(200)).body.tires).toEqual([]);
      await request(server()).get(t()).set(asBob).expect(404);
      const { body } = await request(server()).post(t()).set(asAlice).send(setup).expect(201);
      expect(body.tires.map((tire: { position: string }) => tire.position).sort()).toEqual(['DD', 'DE', 'EST', 'TD', 'TE']);
      expect(body.lastRotationKm).toBe(30000);
      await request(server()).post(t()).set(asAlice).send(setup).expect(400);
    });

    it('calibragem, ocorrência com custo e substituição viram histórico e gasto', async () => {
      const calibrated = await request(server()).post(`${t()}/pressure`).set(asAlice).send({ values: { DE: 33, EST: 29 } }).expect(201);
      expect(calibrated.body.tires.find((tire: { position: string }) => tire.position === 'EST').pressurePsi).toBe(29);
      await request(server()).post(`${t()}/pressure`).set(asAlice).send({ values: { DE: 5 } }).expect(400);

      await request(server()).post(`${t()}/occurrences`).set(asAlice).send({ position: 'TD', damageType: 'Prego', severity: 'Leve', repaired: false, costCents: 4000, notes: 'Borracharia do Zé' }).expect(201);
      await request(server()).post(`${t()}/replacements`).set(asAlice).send({ position: 'DE', brand: 'Pirelli', model: 'Cinturato P7', size: '205/50 R17 89V', priceCents: 68900 }).expect(201);
      const spent = (await request(server()).get(`${v}/expenses`).set(asAlice)).body.filter((expense: { source: string }) => expense.source === 'TIRE');
      expect(spent.map((expense: { description: string; category: string }) => [expense.description, expense.category]).sort()).toEqual([
        ['Pneu novo · DE', 'TIRES'],
        ['Prego · TD', 'TIRES'],
      ]);
      for (const expense of spent) await request(server()).delete(`${v}/expenses/${expense.id}`).set(asAlice).expect(204);

      const { body } = await request(server()).get(t()).set(asAlice);
      const td = body.tires.find((tire: { position: string }) => tire.position === 'TD');
      const event = td.events.find((item: { kind: string }) => item.kind === 'DAMAGE');
      await request(server()).post(`${t()}/occurrences/${event.id}/repaired`).set(asAlice).expect(201);
      expect(body.tires.find((tire: { position: string }) => tire.position === 'DE').number).toBe(5);
    });

    it('o rodízio troca posições, soma a km e atualiza o lembrete', async () => {
      const before = (await request(server()).get(t()).set(asAlice)).body;
      const at = (position: string) => before.tires.find((tire: { position: string }) => tire.position === position);
      await request(server()).post(`${t()}/rotations`).set(asAlice).send({ kind: 'SUGGESTED', odometer: 40000, positions: { DE: at('DE').id, DD: at('DD').id, TE: at('TE').id, TD: at('DE').id } }).expect(400);
      const odometer = before.odometer + 100;
      const { body } = await request(server())
        .post(`${t()}/rotations`)
        .set(asAlice)
        .send({ kind: 'SUGGESTED', odometer, positions: { DE: at('TD').id, DD: at('TE').id, TE: at('DE').id, TD: at('DD').id } })
        .expect(201);
      expect(body.tires.find((tire: { id: string }) => tire.id === at('TD').id).position).toBe('DE');
      expect(body.lastRotationKm).toBe(odometer);
      expect(body.rotations[0]).toMatchObject({ kind: 'SUGGESTED', odometer });
      const reminders = (await request(server()).get(`${v}/reminders`).set(asAlice)).body.items;
      expect(reminders.filter((r: { title: string; doneAt: string | null }) => r.title === 'Rodízio de pneus' && !r.doneAt)).toEqual([expect.objectContaining({ dueOdometer: odometer + 15000 })]);
    });
  });

  it('consumo: média de km/l pelos tanques cheios e preço médio por litro', async () => {
    const fuel = (date: string, odometer: number, liters: number, fullTank: boolean, amountCents: number) =>
      request(server()).post(`${v}/expenses`).set(asAlice).send({ category: 'FUEL', amountCents, date, odometer, fuel: { liters, fullTank } }).expect(201);
    await fuel('2026-09-01', 37010, 36.4, true, 21840);
    await fuel('2026-09-24', 37400, 15, false, 9000);
    await fuel('2026-10-10', 37790, 35, true, 21000);
    const stats = await request(server()).get(`${v}/fuel-stats`).set(asAlice).expect(200);
    expect(stats.body).toMatchObject({ averageKmPerLiter: 15.6, averagePricePerLiterCents: 600, totalLiters: 86.4 });
    expect(stats.body.fills[0]).toMatchObject({ date: '2026-10-10', kmPerLiter: 15.6 });
  });

  describe('relatórios', () => {
    const query = 'from=2026-01-01&to=2026-12-31';

    it('resume por categoria e por mês', async () => {
      const res = await request(server()).get(`${v}/reports?${query}`).set(asAlice).expect(200);
      expect(res.body).toMatchObject({ totalCents: 198540 + 21840 + 9000 + 21000, count: 4, vehicle: { plate: 'RIO2A18', name: 'Volkswagen Polo Highline 1.0 200 TSI' } });
      expect(res.body.byCategory[0]).toMatchObject({ code: 'DOCUMENTS', name: 'Documentos', cents: 198540, count: 1 });
      expect(res.body.byMonth.map((m: { month: string }) => m.month)).toEqual(['2026-01', '2026-09', '2026-10']);
    });

    it('exporta CSV para Excel em português', async () => {
      const res = await request(server()).get(`${v}/reports?${query}&format=csv`).set(asAlice).expect(200);
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toBe('attachment; filename="placar-RIO2A18-2026-01-01-a-2026-12-31.csv"');
      expect(res.text.charCodeAt(0)).toBe(0xfeff);
      const lines = res.text.slice(1).trim().split('\r\n');
      expect(lines[0]).toBe('Data;Hora;Categoria;Peça;Local;Descrição;Odômetro (km);Litros;Peças (R$);Mão de obra (R$);Valor (R$)');
      expect(lines).toContain('10/10/2026;;Combustível;;;Combustível;37790;35;;;210,00');
    });

    it('neutraliza fórmulas no CSV (injeção de fórmula no Excel)', async () => {
      const formula = '=HYPERLINK("http://x.test";"abrir")';
      await request(server()).post(`${v}/expenses`).set(asAlice).send({ category: 'OTHER', amountCents: 100, date: '2026-12-01', description: formula }).expect(201);
      const res = await request(server()).get(`${v}/reports?${query}&format=csv`).set(asAlice).expect(200);
      expect(res.text).toContain(`;"'=HYPERLINK(""http://x.test"";""abrir"")";`);
      expect(res.text).not.toContain(`;=HYPERLINK`);
    });

    it('exporta PDF', async () => {
      const res = await request(server()).get(`${v}/reports?${query}&format=pdf`).set(asAlice).buffer(true).parse(binary).expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('valida o período', async () => {
      const inverted = await request(server()).get(`${v}/reports?from=2026-12-31&to=2026-01-01`).set(asAlice).expect(400);
      expect(inverted.body.message).toBe('O início do período deve ser antes do fim.');
      const impossible = await request(server()).get(`${v}/reports?from=2026-13-45&to=2026-12-31`).set(asAlice).expect(400);
      expect(impossible.body.message).toBe('Informe o período.');
      await request(server()).get(`${v}/reports?${query}`).set(asBob).expect(404);
    });
  });

  it('remover o veículo some da lista', async () => {
    await request(server()).delete(v).set(asAlice).expect(204);
    const list = await request(server()).get('/v1/vehicles').set(asAlice).expect(200);
    expect(list.body.map((x: { plate: string }) => x.plate)).toEqual(['BRA4E21']);
  });
});

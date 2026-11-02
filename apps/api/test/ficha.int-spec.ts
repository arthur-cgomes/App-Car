import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { todayInBrazil } from '../src/common/today';
import { FipeProvider } from '../src/modules/fipe/fipe-provider';
import { MockFipeProvider } from '../src/modules/fipe/mock-fipe.provider';
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

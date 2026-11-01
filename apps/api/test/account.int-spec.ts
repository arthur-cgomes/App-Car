import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { StorageService } from '../src/infra/storage/storage.service';
import { AccountPurgeService } from '../src/modules/account/account-purge.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { User } from '../src/modules/users/user.entity';
import type { MailMessage } from '../src/notifications/mail/mail.provider';
import type { ConsoleSmsProvider } from '../src/notifications/sms/console-sms.provider';
import { CSRF, createTestApp, lastCode, lastMailCode } from './helpers';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 7)]);
const PDF = Buffer.from('%PDF-1.7 apolice');

describe('Perfil e LGPD (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let sms: ConsoleSmsProvider;
  let mail: MailMessage[];
  let alice: User;
  let bob: User;
  let asAlice: Record<string, string>;
  let asBob: Record<string, string>;

  const server = () => app.getHttpServer();
  const token = (user: User) => ({ Authorization: `Bearer ${app.get(JwtService).sign({ sub: user.id })}`, ...CSRF });

  beforeAll(async () => {
    ({ app, dataSource, sms, mail } = await createTestApp());
    const users = dataSource.getRepository(User);
    const hash = await app.get(PasswordService).hash('Senha@123');
    alice = await users.save(
      users.create({ name: 'Alice', email: 'alice@test.dev', passwordHash: hash, phone: '+5521999990001', phoneVerifiedAt: new Date() }),
    );
    bob = await users.save(users.create({ name: 'Bob', email: 'bob@test.dev', passwordHash: hash, phone: '+5521999990002', phoneVerifiedAt: new Date() }));
    asAlice = token(alice);
    asBob = token(bob);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('perfil', () => {
    it('edita nome, e-mail, CPF, tema e o login por SMS', async () => {
      const res = await request(server())
        .patch('/v1/me')
        .set(asAlice)
        .send({ name: 'Alice Souza', email: 'ALICE.SOUZA@test.dev', cpf: '529.982.247-25', theme: 'LIGHT', pinLoginEnabled: false })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Alice Souza', email: 'alice.souza@test.dev', cpf: '52998224725', theme: 'LIGHT', pinLoginEnabled: false, emailVerifiedAt: null });
      expect(res.body.passwordHash).toBeUndefined();

      const taken = await request(server()).patch('/v1/me').set(asBob).send({ email: 'alice.souza@test.dev' }).expect(409);
      expect(taken.body.message).toBe('Já existe uma conta com este e-mail.');
      const invalid = await request(server()).patch('/v1/me').set(asBob).send({ cpf: '111.111.111-11' }).expect(400);
      expect(invalid.body.message).toEqual(['CPF inválido.']);
    });

    it('a foto do perfil precisa ser uma imagem da própria conta', async () => {
      const pdf = (await request(server()).post('/v1/files').set(asAlice).attach('file', PDF, 'a.pdf')).body.id;
      const notImage = await request(server()).patch('/v1/me').set(asAlice).send({ avatarFileId: pdf }).expect(400);
      expect(notImage.body.message).toBe('Escolha uma foto para o perfil.');
      const bobPhoto = (await request(server()).post('/v1/files').set(asBob).attach('file', JPEG, 'b.jpg')).body.id;
      await request(server()).patch('/v1/me').set(asAlice).send({ avatarFileId: bobPhoto }).expect(400);

      const photo = (await request(server()).post('/v1/files').set(asAlice).attach('file', JPEG, 'a.jpg')).body.id;
      const res = await request(server()).patch('/v1/me').set(asAlice).send({ avatarFileId: photo }).expect(200);
      expect(res.body.avatarFileId).toBe(photo);
      await request(server()).patch('/v1/me').set(asAlice).send({ avatarFileId: null }).expect(200);
    });

    it('troca o celular só depois de confirmar o código enviado ao número novo', async () => {
      const sent = await request(server()).post('/v1/me/phone').set(asAlice).send({ phone: '(21) 98888-7777' }).expect(200);
      expect(sent.body).toEqual({ saved: false, channel: 'SMS', sentTo: '(21) •••••-7777', resendIn: 30 });
      expect(sms.lastTo('+5521988887777')?.text).toMatch(/código para confirmar este celular é \d{6}/);

      await request(server()).post('/v1/me/phone/confirm').set(asAlice).send({ code: '000000' }).expect(401);
      expect((await request(server()).get('/v1/me').set(asAlice)).body.phone).toBe('+5521999990001');

      await request(server()).post('/v1/me/phone/confirm').set(asAlice).send({ code: lastCode(sms, '+5521988887777') }).expect(200);
      expect((await request(server()).get('/v1/me').set(asAlice)).body.phone).toBe('+5521988887777');

      const taken = await request(server()).post('/v1/me/phone').set(asBob).send({ phone: '(21) 98888-7777' }).expect(409);
      expect(taken.body.message).toBe('Este celular já está em uso em outra conta.');
    });
  });

  describe('LGPD', () => {
    let vehicleId: string;

    beforeAll(async () => {
      vehicleId = (await request(server()).post('/v1/vehicles').set(asAlice).send({ plate: 'RIO2A18', currentOdometer: 38000 })).body.id;
      const photo = (await request(server()).post('/v1/files').set(asAlice).attach('file', JPEG, 'nota.jpg')).body.id;
      await request(server())
        .post(`/v1/vehicles/${vehicleId}/expenses`)
        .set(asAlice)
        .send({ category: 'FUEL', amountCents: 22920, date: '2026-10-28', attachmentIds: [photo] })
        .expect(201);
      await request(server()).post('/v1/vehicles').set(asBob).send({ plate: 'BRA4E21' }).expect(201);
    });

    it('exporta todos os dados da conta, sem segredos', async () => {
      const res = await request(server()).get('/v1/me/export').set(asAlice).expect(200);
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="placar-meus-dados-\d{4}-\d{2}-\d{2}\.json"$/);
      expect(res.body.profile).toMatchObject({ name: 'Alice Souza', email: 'alice.souza@test.dev' });
      expect(res.body.vehicles).toHaveLength(1);
      expect(res.body.expenses[0]).toMatchObject({ amountCents: 22920 });
      expect(res.body.reminders.length).toBeGreaterThan(0);
      expect(res.body.securityEvents.map((e: { event: string }) => e.event)).toContain('PHONE_CHANGED');
      expect(JSON.stringify(res.body)).not.toMatch(/\$argon2|codeHash|tokenHash/);
    });

    it('exclui a conta com o código enviado pelo canal do PIN (e-mail): some na hora e a placa fica livre', async () => {
      await dataSource.getRepository(User).update({ id: alice.id }, { emailVerifiedAt: new Date() });
      const req = await request(server()).post('/v1/me/delete/request').set(asAlice).expect(200);
      expect(req.body).toEqual({ method: 'code', channel: 'EMAIL', sentTo: 'al••••••@test.dev', resendIn: 30 });
      expect(mail.at(-1)).toMatchObject({ to: 'alice.souza@test.dev', subject: 'App Car: código para excluir sua conta' });

      await request(server()).delete('/v1/me').set(asAlice).send({ code: '000000' }).expect(401);
      const removed = await request(server()).delete('/v1/me').set(asAlice).send({ code: lastMailCode(mail, 'alice.souza@test.dev') }).expect(204);
      expect(([] as string[]).concat(removed.headers['set-cookie'] ?? []).some((c) => c.startsWith('refresh_token=;'))).toBe(true);

      await request(server()).get('/v1/me').set(asAlice).expect(404);
      await request(server()).post('/v1/vehicles').set(asBob).send({ plate: 'RIO2A18' }).expect(201);
    });

    it('sem e-mail confirmado, a exclusão pede a senha', async () => {
      const users = dataSource.getRepository(User);
      const carol = await users.save(
        users.create({ name: 'Carol', email: 'carol@test.dev', passwordHash: await app.get(PasswordService).hash('Senha@123') }),
      );
      const asCarol = token(carol);
      expect((await request(server()).post('/v1/me/delete/request').set(asCarol).expect(200)).body).toEqual({ method: 'password' });
      const wrong = await request(server()).delete('/v1/me').set(asCarol).send({ password: 'errada' }).expect(401);
      expect(wrong.body.message).toBe('Senha incorreta.');
      await request(server()).delete('/v1/me').set(asCarol).send({ password: 'Senha@123' }).expect(204);
    });

    it('depois de 30 dias apaga tudo de vez, inclusive histórico e arquivos, sem tocar em outras contas', async () => {
      const files: { storage_key: string }[] = await dataSource.query('SELECT storage_key FROM files WHERE owner_id = $1', [alice.id]);
      expect(files.length).toBeGreaterThan(0);
      const purge = app.get(AccountPurgeService);

      expect(await purge.purgeExpired()).toBe(0);
      const in31Days = new Date(Date.now() + 31 * 86_400_000);
      expect(await purge.purgeExpired(in31Days)).toBe(2);

      expect(await dataSource.query('SELECT 1 FROM users WHERE id = $1', [alice.id])).toEqual([]);
      expect(await dataSource.query('SELECT 1 FROM vehicles WHERE owner_id = $1', [alice.id])).toEqual([]);
      expect(await dataSource.getRepository(AuditLog).count({ where: { userId: alice.id } })).toBe(0);
      await expect(app.get(StorageService).get(files[0].storage_key)).rejects.toThrow();

      expect((await request(server()).get('/v1/vehicles').set(asBob).expect(200)).body).toHaveLength(2);
      await expect(dataSource.query('DELETE FROM audit_logs')).rejects.toThrow(/append-only/);
    });
  });
});

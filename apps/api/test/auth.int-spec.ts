import { NestExpressApplication } from '@nestjs/platform-express';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditLog } from '../src/audit/audit-log.entity';
import { User } from '../src/modules/users/user.entity';
import { MailProvider, type MailMessage } from '../src/notifications/mail/mail.provider';
import type { ConsoleSmsProvider } from '../src/notifications/sms/console-sms.provider';
import { CSRF, createTestApp, lastCode, lastMailCode } from './helpers';

const MARINA = {
  name: 'Marina Souza',
  email: 'marina@email.com',
  cpf: '529.982.247-25',
  phone: '(21) 98765-4821',
  password: 'Senha-forte1!',
  acceptTerms: true,
};
const MARINA_PHONE = '+5521987654821';
const MARINA_EMAIL = 'marina@email.com';
const PLATE = 'RIO2A18';

describe('Autenticação (integração)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let redis: Redis;
  let sms: ConsoleSmsProvider;
  let mail: MailMessage[];
  let marina: ReturnType<typeof request.agent>;

  const server = () => app.getHttpServer();
  const post = (path: string, body: object = {}) => request(server()).post(path).set(CSRF).send(body);
  const cookieNames = (res: request.Response) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []).map((c) => c.split('=')[0]);

  beforeAll(async () => {
    ({ app, dataSource, redis, sms, mail } = await createTestApp());
    marina = request.agent(server());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exige o cabeçalho de CSRF em requisições que alteram dados', async () => {
    await request(server()).post('/v1/auth/login').send({ login: 'x@y.z', password: 'x' }).expect(403);
  });

  describe('cadastro: e-mail e código primeiro, dados depois', () => {
    const MARINA_DATA = { name: MARINA.name, cpf: MARINA.cpf, phone: MARINA.phone, password: MARINA.password, acceptTerms: MARINA.acceptTerms };
    const signupToken = async (email: string) => {
      await redis.del(`cd:signup-resend:${email}`);
      await post('/v1/auth/signup/start', { email }).expect(200);
      const res = await post('/v1/auth/signup/verify', { email, code: lastMailCode(mail, email) }).expect(200);
      return res.body.signupToken as string;
    };

    it('envia o código para o e-mail antes de pedir qualquer outro dado', async () => {
      const res = await post('/v1/auth/signup/start', { email: ' MARINA@email.com ' }).expect(200);
      expect(res.body).toEqual({ channel: 'EMAIL', sentTo: 'ma••••@email.com', resendIn: 30 });
      expect(mail.at(-1)).toMatchObject({ to: MARINA_EMAIL, subject: 'VW Polo: confirme seu e-mail' });
      expect(await dataSource.getRepository(User).exists({ where: { email: MARINA_EMAIL } })).toBe(false);
      expect((await post('/v1/auth/signup/start', { email: 'invalido' }).expect(400)).body.message).toEqual(['E-mail inválido.']);
    });

    it('limita o reenvio do código a cada 30 s', async () => {
      const res = await post('/v1/auth/signup/start', { email: MARINA_EMAIL }).expect(429);
      expect(res.body.message).toMatch(/^Aguarde \d+ s para pedir um novo código\.$/);
    });

    it('confere o código, conta as tentativas e devolve o comprovante uma única vez', async () => {
      const wrong = await post('/v1/auth/signup/verify', { email: MARINA_EMAIL, code: '000000' }).expect(401);
      expect(wrong.body).toMatchObject({ message: 'Código incorreto. Restam 4 tentativas.', attemptsLeft: 4 });

      const code = lastMailCode(mail, MARINA_EMAIL);
      const ok = await post('/v1/auth/signup/verify', { email: MARINA_EMAIL, code }).expect(200);
      expect(ok.body).toEqual({ signupToken: expect.any(String), expiresIn: 1800 });
      expect((await post('/v1/auth/signup/verify', { email: MARINA_EMAIL, code }).expect(401)).body.message).toBe('Código expirado. Peça um novo código.');
    });

    it('valida o comprovante e os dados, com CPF de verdade (não só 11 dígitos)', async () => {
      const token = await signupToken(MARINA_EMAIL);
      const noToken = await post('/v1/auth/register', { ...MARINA_DATA, signupToken: 'x'.repeat(40) }).expect(400);
      expect(noToken.body.message).toBe('Sua confirmação de e-mail expirou. Comece o cadastro de novo.');

      const res = await post('/v1/auth/register', { ...MARINA_DATA, signupToken: token, cpf: '123.456.789-00', password: '123', acceptTerms: false }).expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'CPF inválido.',
          'A senha precisa ter ao menos 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.',
          'Aceite os Termos de uso e a Política de privacidade.',
        ]),
      );
      for (const cpf of ['12345678901', '000.000.000-00', '529.982.247-25x', '52998224']) {
        expect((await post('/v1/auth/register', { ...MARINA_DATA, signupToken: token, cpf }).expect(400)).body.message).toEqual(['CPF inválido.']);
      }
      const missing = await post('/v1/auth/register', { ...MARINA_DATA, signupToken: token, cpf: '', phone: '' }).expect(400);
      expect(missing.body.message).toEqual(expect.arrayContaining(['Informe seu CPF.', 'Informe seu celular.']));
    });

    it('cria a conta já com o e-mail confirmado e abre a sessão', async () => {
      const token = await signupToken(MARINA_EMAIL);
      const res = await marina.post('/v1/auth/register').set(CSRF).send({ ...MARINA_DATA, signupToken: token }).expect(201);
      expect(res.body).toEqual({ user: { id: expect.any(String), name: 'Marina Souza', email: MARINA_EMAIL } });
      expect(cookieNames(res)).toEqual(expect.arrayContaining(['access_token', 'refresh_token', 'placar_session']));

      const me = await marina.get('/v1/me').expect(200);
      expect(me.body).toMatchObject({ cpf: '52998224725', phone: MARINA_PHONE, phoneVerifiedAt: null, pinChannel: 'EMAIL', pinLoginEnabled: true, smsAvailable: true });
      expect(me.body.emailVerifiedAt).not.toBeNull();
      await marina.post('/v1/auth/email/send').set(CSRF).expect(400);
    });

    it('não aceita e-mail ou CPF repetidos', async () => {
      await redis.del(`cd:signup-resend:${MARINA_EMAIL}`);
      expect((await post('/v1/auth/signup/start', { email: MARINA_EMAIL }).expect(409)).body.message).toBe('Já existe uma conta com este e-mail.');
      const token = await signupToken('outra@email.com');
      expect((await post('/v1/auth/register', { ...MARINA_DATA, signupToken: token }).expect(409)).body.message).toBe('Já existe uma conta com este CPF.');
    });

    it('se o e-mail não puder ser enviado, nada é guardado', async () => {
      const mailer = app.get(MailProvider);
      const send = mailer.send;
      mailer.send = async () => {
        throw new Error('SMTP fora do ar');
      };
      await post('/v1/auth/signup/start', { email: 'falha@email.com' }).expect(500);
      mailer.send = send;
      await post('/v1/auth/signup/verify', { email: 'falha@email.com', code: '123456' }).expect(401);
      expect(await dataSource.getRepository(User).exists({ where: { email: 'falha@email.com' } })).toBe(false);
      await redis.del(...(await redis.keys('rl:signup-ip:*')), ...(await redis.keys('rl:register-ip:*')));
    });

    it('confirma o celular por SMS quando o SMS está disponível', async () => {
      await marina.post('/v1/auth/phone/send').set(CSRF).expect(200, { channel: 'SMS', sentTo: '(21) •••••-4821', resendIn: 30 });
      expect(sms.lastTo(MARINA_PHONE)?.text).toMatch(/^VW Polo: seu código de confirmação é \d{6}\. Não compartilhe\.\n\n@localhost:3001 #\d{6}$/);
      await marina.post('/v1/auth/phone/verify').set(CSRF).send({ code: lastCode(sms, MARINA_PHONE) }).expect(200);
      expect((await marina.get('/v1/me').expect(200)).body.phoneVerifiedAt).not.toBeNull();
    });
  });

  describe('login com senha', () => {
    it('entra com e-mail ou CPF', async () => {
      const byEmail = await post('/v1/auth/login', { login: 'MARINA@email.com', password: MARINA.password }).expect(200);
      expect(byEmail.body.user.email).toBe('marina@email.com');
      expect(cookieNames(byEmail)).toContain('access_token');
      await post('/v1/auth/login', { login: '52998224725', password: MARINA.password }).expect(200);
    });

    it('troca a senha só com a senha atual certa, encerra as outras sessões e mantém esta', async () => {
      const login = await post('/v1/auth/login', { login: MARINA.cpf, password: MARINA.password }).expect(200);
      const cookie = login.get('Set-Cookie')!;
      const change = (body: object) => request(app.getHttpServer()).post('/v1/me/password').set(CSRF).set('Cookie', cookie).send(body);
      expect((await change({ currentPassword: 'errada', password: 'Nova-Senha-2026!' }).expect(400)).body.message).toBe('Senha atual incorreta.');
      await change({ currentPassword: MARINA.password, password: 'fraca' }).expect(400);
      const other = await post('/v1/auth/login', { login: MARINA.cpf, password: MARINA.password }).expect(200);
      const changed = await change({ currentPassword: MARINA.password, password: 'Nova-Senha-2026!' }).expect(200);
      expect(cookieNames(changed)).toContain('access_token');
      await request(app.getHttpServer()).post('/v1/auth/refresh').set(CSRF).set('Cookie', other.get('Set-Cookie')!).expect(401);
      const fresh = await post('/v1/auth/login', { login: MARINA.cpf, password: 'Nova-Senha-2026!' }).expect(200);
      await request(app.getHttpServer()).post('/v1/me/password').set(CSRF).set('Cookie', fresh.get('Set-Cookie')!).send({ currentPassword: 'Nova-Senha-2026!', password: MARINA.password }).expect(200);
    });

    it('bloqueia a troca de senha após 5 senhas atuais erradas', async () => {
      const login = await post('/v1/auth/login', { login: MARINA.cpf, password: MARINA.password }).expect(200);
      const change = () =>
        request(app.getHttpServer()).post('/v1/me/password').set(CSRF).set('Cookie', login.get('Set-Cookie')!).send({ currentPassword: 'errada', password: 'Nova-Senha-2026!' });
      for (let i = 0; i < 5; i++) await change().expect(400);
      expect((await change().expect(429)).body.message).toMatch(/Muitas tentativas/);
      await redis.del(`rl:password-change-fail:${login.body.user.id}`);
    });

    it('bloqueia por 15 min após 5 senhas erradas, mesmo com a senha certa depois', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await post('/v1/auth/login', { login: MARINA.cpf, password: 'errada' }).expect(401);
        expect(res.body.message).toBe('E-mail/CPF ou senha incorretos.');
      }
      const locked = await post('/v1/auth/login', { login: MARINA.cpf, password: MARINA.password }).expect(429);
      expect(locked.body.message).toBe('Muitas tentativas. Tente novamente em 15 min.');
      await redis.del('rl:login-fail:52998224725');
    });
  });

  describe('login por placa + PIN', () => {
    const pinMail = () => mail.filter((item) => item.to === MARINA_EMAIL && item.subject === 'VW Polo: seu PIN de acesso');

    beforeAll(async () => {
      await marina.post('/v1/vehicles').set(CSRF).send({ plate: PLATE }).expect(201);
    });

    it('não envia PIN para placa sem dono apto', async () => {
      const res = await post('/v1/auth/pin/request', { plate: 'ZZZ9Z99' }).expect(400);
      expect(res.body.message).toBe('Não foi possível enviar o PIN para esta placa.');
      const invalid = await post('/v1/auth/pin/request', { plate: 'ABC' }).expect(400);
      expect(invalid.body.message).toEqual(['Placa inválida. Use ABC1D23 (Mercosul) ou ABC1234.']);
    });

    it('envia o PIN por e-mail para o endereço mascarado e respeita o intervalo de reenvio', async () => {
      const res = await post('/v1/auth/pin/request', { plate: 'rio-2a18' }).expect(200);
      expect(res.body).toEqual({ channel: 'EMAIL', sentTo: 'ma••••@email.com', resendIn: 30 });
      expect(pinMail()).toHaveLength(1);
      expect(pinMail()[0].text).toMatch(/^Seu PIN de acesso\n\nUse este PIN para entrar no VW Polo com a placa do seu veículo\.\n\n\d{6}\n/);
      expect(pinMail()[0].html).toContain('Seu PIN de acesso');
      await post('/v1/auth/pin/request', { plate: PLATE }).expect(429);
    });

    it('invalida o PIN depois de 5 erros', async () => {
      for (const left of [4, 3, 2, 1]) {
        const res = await post('/v1/auth/pin/verify', { plate: PLATE, code: '000000' }).expect(401);
        expect(res.body.message).toBe(`Código incorreto. Restam ${left} ${left === 1 ? 'tentativa' : 'tentativas'}.`);
      }
      const last = await post('/v1/auth/pin/verify', { plate: PLATE, code: '000000' }).expect(401);
      expect(last.body.message).toBe('Código expirado. Peça um novo código.');
      await post('/v1/auth/pin/verify', { plate: PLATE, code: lastMailCode(mail, MARINA_EMAIL) }).expect(401);
    });

    it('limita a 3 PINs por hora para a mesma placa (pedidos barrados pelo intervalo não contam)', async () => {
      for (let i = 0; i < 2; i++) {
        await redis.del(`cd:pin-resend:${PLATE}`);
        await post('/v1/auth/pin/request', { plate: PLATE }).expect(200);
      }
      await redis.del(`cd:pin-resend:${PLATE}`);
      const res = await post('/v1/auth/pin/request', { plate: PLATE }).expect(429);
      expect(res.body.message).toBe('Muitos códigos pedidos para esta placa. Tente novamente mais tarde.');
      await redis.del(`cd:pin-resend:${PLATE}`, `rl:pin-plate:${PLATE}`, `rl:otp-target:${MARINA_EMAIL}`);
    });

    it('limita a 5 códigos por hora para o mesmo destino', async () => {
      await redis.set(`rl:otp-target:${MARINA_EMAIL}`, '5', 'EX', 3600);
      const res = await post('/v1/auth/pin/request', { plate: PLATE }).expect(429);
      expect(res.body.message).toBe('Muitos códigos enviados. Tente novamente mais tarde.');
      await redis.del(`cd:pin-resend:${PLATE}`, `rl:pin-plate:${PLATE}`, `rl:otp-target:${MARINA_EMAIL}`);
    });

    it('entra com um PIN novo', async () => {
      await post('/v1/auth/pin/request', { plate: PLATE }).expect(200);
      const res = await post('/v1/auth/pin/verify', { plate: PLATE, code: lastMailCode(mail, MARINA_EMAIL) }).expect(200);
      expect(res.body.user.email).toBe(MARINA_EMAIL);
      expect(cookieNames(res)).toContain('refresh_token');
    });

    it('envia por SMS quando o usuário escolhe SMS e o celular está confirmado', async () => {
      await marina.patch('/v1/me').set(CSRF).send({ pinChannel: 'SMS' }).expect(200);
      await redis.del(`cd:pin-resend:${PLATE}`);
      const res = await post('/v1/auth/pin/request', { plate: PLATE }).expect(200);
      expect(res.body).toEqual({ channel: 'SMS', sentTo: '(21) •••••-4821', resendIn: 30 });
      expect(sms.lastTo(MARINA_PHONE)?.text).toMatch(/^VW Polo: seu PIN de acesso é \d{6}\. Não compartilhe\./);
      await post('/v1/auth/pin/verify', { plate: PLATE, code: lastCode(sms, MARINA_PHONE) }).expect(200);
      await marina.patch('/v1/me').set(CSRF).send({ pinChannel: 'EMAIL' }).expect(200);
      await redis.del(`cd:pin-resend:${PLATE}`, `rl:pin-plate:${PLATE}`);
    });

    it('trocar o e-mail exige confirmar de novo antes de receber PIN', async () => {
      await marina.patch('/v1/me').set(CSRF).send({ email: 'marina.nova@email.com' }).expect(200);
      expect((await marina.get('/v1/me').expect(200)).body.emailVerifiedAt).toBeNull();
      await post('/v1/auth/pin/request', { plate: PLATE }).expect(400);
      await marina.patch('/v1/me').set(CSRF).send({ email: MARINA_EMAIL }).expect(200);
      await dataSource.getRepository(User).update({ email: MARINA_EMAIL }, { emailVerifiedAt: new Date() });
    });

    it('respeita o switch "Entrar com placa + PIN" desligado', async () => {
      await dataSource.getRepository(User).update({ email: MARINA_EMAIL }, { pinLoginEnabled: false });
      await redis.del(`cd:pin-resend:${PLATE}`, `rl:pin-plate:${PLATE}`, ...(await redis.keys('rl:pin-ip:*')));
      await post('/v1/auth/pin/request', { plate: PLATE }).expect(400);
      await dataSource.getRepository(User).update({ email: MARINA_EMAIL }, { pinLoginEnabled: true });
    });
  });

  describe('sessão', () => {
    it('rotaciona o refresh token e derruba a família se um token antigo for reusado', async () => {
      const agent = request.agent(server());
      const login = await agent.post('/v1/auth/login').set(CSRF).send({ login: MARINA.email, password: MARINA.password }).expect(200);
      const oldRefresh = ([] as string[]).concat(login.headers['set-cookie']).find((c) => c.startsWith('refresh_token='))!.split(';')[0];

      await agent.post('/v1/auth/refresh').set(CSRF).expect(204);
      await agent.get('/v1/me').expect(200);

      await request(server()).post('/v1/auth/refresh').set(CSRF).set('Cookie', oldRefresh).expect(401);
      await agent.post('/v1/auth/refresh').set(CSRF).expect(401);

      const reuse = await dataSource.getRepository(AuditLog).findOne({ where: { action: 'SECURITY' }, order: { createdAt: 'DESC' } });
      expect(reuse?.snapshot).toMatchObject({ event: 'REFRESH_TOKEN_REUSE' });
    });

    it('logout encerra a sessão', async () => {
      const agent = request.agent(server());
      await agent.post('/v1/auth/login').set(CSRF).send({ login: MARINA.email, password: MARINA.password }).expect(200);
      await agent.post('/v1/auth/logout').set(CSRF).expect(204);
      await agent.get('/v1/me').expect(401);
      await agent.post('/v1/auth/refresh').set(CSRF).expect(401);
    });
  });

  describe('esqueci minha senha', () => {
    it('responde igual para contas inexistentes e envia o link para as existentes', async () => {
      const resets = () => mail.filter((item) => item.subject === 'VW Polo: redefinir sua senha');
      await post('/v1/auth/password/forgot', { login: 'ninguem@email.com' }).expect(202, { sent: true });
      expect(resets()).toHaveLength(0);
      await post('/v1/auth/password/forgot', { login: MARINA.cpf }).expect(202, { sent: true });
      expect(resets()).toHaveLength(1);
      expect(resets()[0]).toMatchObject({ to: MARINA_EMAIL });
    });

    it('redefine a senha uma única vez e encerra as sessões abertas', async () => {
      const agent = request.agent(server());
      await agent.post('/v1/auth/login').set(CSRF).send({ login: MARINA.email, password: MARINA.password }).expect(200);

      const token = /reset-password\?token=([\w-]+)/.exec(mail.find((item) => item.subject === 'VW Polo: redefinir sua senha')!.text)![1];
      const weak = await post('/v1/auth/password/reset', { token, password: 'nova-senha-123' }).expect(400);
      expect(weak.body.message).toEqual(['A senha precisa ter ao menos 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.']);
      await post('/v1/auth/password/reset', { token, password: 'Nova-senha-123' }).expect(200);
      const reused = await post('/v1/auth/password/reset', { token, password: 'Outra-senha-123' }).expect(400);
      expect(reused.body.message).toBe('Este link expirou. Peça um novo em "Esqueci minha senha".');

      await post('/v1/auth/login', { login: MARINA.email, password: MARINA.password }).expect(401);
      await post('/v1/auth/login', { login: MARINA.email, password: 'Nova-senha-123' }).expect(200);
      await agent.post('/v1/auth/refresh').set(CSRF).expect(401);
    });
  });

  it('registra os eventos de segurança e nunca grava hash de senha no histórico', async () => {
    const logs = await dataSource.getRepository(AuditLog).find();
    const events = logs.filter((log) => log.action === 'SECURITY').map((log) => log.snapshot?.event);
    expect(events).toEqual(
      expect.arrayContaining(['ACCOUNT_CREATED', 'PHONE_VERIFIED', 'LOGIN', 'LOGIN_FAILED', 'PIN_SENT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_CHANGED']),
    );
    expect(JSON.stringify(logs)).not.toMatch(/\$argon2/);
  });
});

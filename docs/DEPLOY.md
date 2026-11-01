# Deploy do App Car

Duas imagens Docker, geradas a partir da raiz do monorepo, mais serviços gerenciados.

```
navegador ──HTTPS──> web (Next.js, :3001) ──/api/* (rewrite interno)──> api (NestJS, :3000)
                                                                          ├─ PostgreSQL 17
                                                                          ├─ Redis 7 (limites, locks dos jobs)
                                                                          ├─ Google Drive (fotos e PDFs enviados)
                                                                          ├─ SMTP (Resend ou Brevo)
                                                                          └─ SMSDev (códigos por SMS)
```

O navegador fala só com o web; a API não precisa ser pública. Por isso os cookies de sessão são first-party e não há CORS.
Outros apps falam com a API de integração pelo mesmo domínio (`https://<domínio>/api/v1/integrations/...`), com chave de
API ([API_INTEGRACAO.md](API_INTEGRACAO.md)).

## Imagens

```bash
docker build -f apps/api/Dockerfile -t placar-api .
docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:3000 -t placar-web .
```

- `API_URL` é lido **no build** do web: o rewrite `/api → API` fica gravado na imagem. Gere uma imagem por ambiente
  (ou use o mesmo nome interno, como `http://api:3000`, em todos).
- A imagem da API traz só as dependências de produção. Health check: `GET /health`.
- O web sai em modo `standalone` (`node apps/web/server.js`, porta 3001) com cabeçalhos de segurança: CSP
  (`default-src 'self'`, scripts e conexões só da própria origem), `X-Frame-Options`, HSTS, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy` e `Cross-Origin-Opener-Policy`. A API (porta 3000) usa `helmet`.

## Banco: migração

O banco inteiro nasce de uma única migração (`InitialSchema`): tabelas, índices, chaves, a trigger que torna
`audit_logs` append-only e as categorias de gasto. Rode antes de subir a API (o container não migra sozinho):

```bash
docker run --rm --env-file api.env placar-api npm run migration:run:prod
```

O usuário do banco precisa ser dono das tabelas. Depois que o app estiver em produção, mudanças de schema entram como
novas migrações (editar a `InitialSchema` não altera um banco que já existe).

## Variáveis da API

Modelo completo em [apps/api/.env.example](../apps/api/.env.example). Em produção (`NODE_ENV=production`):

| Variável | Produção |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | Serviços gerenciados (ex.: Neon/RDS, Upstash) |
| `JWT_SECRET` | 32+ caracteres aleatórios (`openssl rand -base64 48`) |
| `WEB_URL`, `CORS_ORIGIN` | Domínio público do web (links dos e-mails) |
| `TRUST_PROXY` | `1` atrás de um proxy/load balancer (IP real nos limites e na auditoria) |
| `SMS_PROVIDER=smsdev`, `SMSDEV_KEY` | Chave do painel do SMSDev. `console` é recusado em produção |
| `SMTP_URL`, `MAIL_FROM` | Resend (`smtps://resend:<API_KEY>@smtp.resend.com:465`) ou Brevo (`smtp://<login>:<chave>@smtp-relay.brevo.com:587`); `MAIL_FROM` com domínio verificado |
| `STORAGE_PROVIDER=gdrive`, `GOOGLE_DRIVE_*` | Uploads no Google Drive da conta do app (ver abaixo). As fotos são servidas pela API, só para o dono |
| `S3_*` | Só com `STORAGE_PROVIDER=s3` (bucket privado S3/R2) ou para ler arquivos enviados antes do Drive |
| `PLATE_PROVIDER` | `mock` até contratar um provedor de consulta de placa (ver abaixo) |
| `FIPE_PROVIDER=parallelum`, `FIPE_TOKEN` | Token opcional da Parallelum para mais consultas por dia |

## Google Drive (uploads)

Fotos de notas, comprovantes, documentos e avatar vão para uma pasta privada no Google Drive da conta dona do app.
A API autentica com OAuth (refresh token, escopo `drive.file`: o app só enxerga o que ele mesmo criou), o que funciona
em contas Gmail pessoais (contas de serviço não têm cota de armazenamento no Drive pessoal).

1. No [Google Cloud Console](https://console.cloud.google.com/): crie um projeto e ative a **Google Drive API**.
2. **Tela de consentimento OAuth**: tipo *Externo*, preencha nome e e-mail e **publique o app** (status *Em produção*).
   Em *Teste*, o Google expira o refresh token em 7 dias. O escopo `drive.file` não exige verificação do Google.
3. **Credenciais → Criar ID do cliente OAuth → App para computador**. Copie ID e segredo para `GOOGLE_DRIVE_CLIENT_ID`
   e `GOOGLE_DRIVE_CLIENT_SECRET` no `apps/api/.env`.
4. Rode `pnpm -C apps/api drive:auth`, entre com a conta Google que vai guardar os arquivos e copie as linhas impressas
   (`STORAGE_PROVIDER=gdrive`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`) para o `.env` / secrets do provedor.

Os arquivos ficam com o nome `users_<id do usuário>_<id do arquivo>` na pasta "App Car". A exclusão de conta (LGPD)
apaga os arquivos do Drive de vez (sem lixeira). Arquivos enviados antes da troca continuam sendo lidos do S3.

## Jobs

Rodam dentro da API (cron + lock no Redis, então várias réplicas não duplicam):

- 08:00 (America/Sao_Paulo): lembretes automáticos; débitos às segundas.
- 03:00: exclusão definitiva (LGPD) de contas excluídas há mais de 30 dias.

## Pendências antes de abrir ao público

- **Domínio e textos legais** (Termos de uso, Política de privacidade): definidos pelo dono do produto.
- **Consulta de placa:** não há API pública e gratuita oficial (Senatran/Detrans só têm portais com login gov.br ou
  captcha). Para dados do veículo e débitos é preciso contratar um agregador pago e implementar o `PlateProvider` em
  `apps/api/src/modules/plate-lookup/providers`.
- **Captcha** (ex.: Cloudflare Turnstile) no envio de código por SMS, se houver abuso; os limites por placa/IP/celular
  já estão no Redis.
- **Observabilidade:** Sentry (web e API) e um monitor de uptime em `/health`.
- **Backups** automáticos do Postgres no provedor.

## Verificação pós-deploy

```bash
curl -fsS https://<dominio>/api/health        # API pelo web
# Só em staging com SMS_PROVIDER=console: o teste cria uma conta e dispara um SMS para um número aleatório.
E2E_BASE_URL=https://<staging> pnpm -C apps/web e2e
```

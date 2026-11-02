# Deploy do App Car

Duas imagens Docker, geradas a partir da raiz do monorepo, mais serviços gerenciados.

```
navegador ──HTTPS──> web (Next.js, :3001) ──/api/* (rewrite interno)──> api (NestJS, :3000)
                                                                          ├─ PostgreSQL 17
                                                                          ├─ Redis 7 (limites, locks dos jobs)
                                                                          ├─ Google Drive (fotos e PDFs enviados)
                                                                          ├─ SMTP (Resend ou Brevo)
                                                                          └─ SMSDev (PIN por SMS, quando ativado)
```

O navegador fala só com o web; a API não precisa ser pública. Por isso os cookies de sessão são first-party e não há CORS.
Outros apps falam com a API de integração pelo mesmo domínio (`https://<domínio>/api/v1/integrations/...`), com chave de
API ([API_INTEGRACAO.md](API_INTEGRACAO.md)).

## Deploy automático na VPS

O App Car segue o padrão dos demais apps da VPS: o código fica em `/opt/repos-run/app-car`, a API e o web são serviços
do `/opt/infra/docker-compose.yml` (junto do Postgres, do Redis e do Nginx Proxy Manager) e usam o Postgres e o Redis
compartilhados, com banco e usuário próprios (`appcar`) e o índice `2` do Redis.

A cada push na `master`, o workflow **CI** roda lint, tipos, testes e build e, em paralelo, monta as imagens da API e do
web num runner ARM do GitHub (com cache das camadas) e as publica no GitHub Container Registry
(`ghcr.io/arthur-cgomes/app-car-api` e `-web`, marcadas com o commit). Se tudo passar, o workflow **Deploy** entra na VPS
por SSH e executa `deploy/deploy.sh <commit>`, que:

1. atualiza `/opt/repos-run/app-car` para o commit testado;
2. baixa as imagens prontas e as marca como `appcar-api` e `appcar-web` (a VPS não compila nada); se não conseguir baixar,
   gera as imagens na própria VPS pelo compose da infra, como fallback;
3. roda a migração e sobe só esses dois serviços (`--no-deps`: Postgres, Redis e NPM não são tocados);
4. confere API e web por dentro da rede e, no fim, o workflow chama `https://appcar.arthurgomes.dev/api/health`.

O web é publicado na porta `3004` da VPS; o Nginx Proxy Manager encaminha o domínio para `http://178.104.211.246:3004`.
A API não tem porta exposta (só o web a acessa). Para rodar à mão: `bash /opt/repos-run/app-car/deploy/deploy.sh` (ou
**Actions → Deploy → Run workflow** no GitHub).

### Configuração inicial (uma vez)

**DNS:** registro `A` de `appcar.arthurgomes.dev` (ou o curinga `*`) para `178.104.211.246`.

**Código e variáveis:**

```bash
mkdir -p /opt/repos-run/app-car && cd /opt/repos-run/app-car && git clone -b master https://github.com/arthur-cgomes/App-Car.git .
cp deploy/.env.example deploy/.env && chmod 600 deploy/.env
```

**Banco e usuário no Postgres compartilhado** (troque a senha; use só letras e números):

```bash
docker exec -it poc-postgres psql -U admin -d poc_database -c "CREATE USER appcar WITH PASSWORD 'SENHA_DO_BANCO';" -c "CREATE DATABASE appcar OWNER appcar;"
```

Preencha o `deploy/.env` (veja [Variáveis da API](#variáveis-da-api)): `DATABASE_URL` com a mesma senha, `JWT_SECRET`
com `openssl rand -hex 32`, `SMTP_URL` e as variáveis `GOOGLE_DRIVE_*`. `SMS_PROVIDER=disabled` mantém o PIN só por
e-mail. Em produção a API não sobe sem e-mail, Drive e um `JWT_SECRET` de 32+ caracteres.

**Serviços no compose da infra:** cole o conteúdo de [`deploy/infra-services.yml`](../deploy/infra-services.yml) dentro
de `services:` no `/opt/infra/docker-compose.yml` (depois do `portfolio`, por exemplo) e confira:

```bash
cd /opt/infra && cp docker-compose.yml docker-compose.yml.bak-$(date +%F) && nano docker-compose.yml
docker compose config --services | grep appcar
```

O bloco usa a rede `infra-network` e os serviços `postgres` e `redis`, como os demais apps; se algum nome for diferente
no seu compose, ajuste no bloco colado.

**Chave de deploy** (no seu computador):

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-app-car" -f ~/.ssh/app_car_deploy
ssh-copy-id -i ~/.ssh/app_car_deploy.pub root@178.104.211.246
ssh-keyscan -t ed25519 178.104.211.246
```

**GitHub** → repositório → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
|---|---|
| `VPS_HOST` | `178.104.211.246` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Conteúdo de `~/.ssh/app_car_deploy` (a chave privada inteira) |
| `VPS_KNOWN_HOSTS` | A linha impressa pelo `ssh-keyscan` |

**Primeiro deploy:** na VPS, `bash /opt/repos-run/app-car/deploy/deploy.sh` (ou **Run workflow** no GitHub).

**Nginx Proxy Manager** → Hosts → Proxy Hosts → Add Proxy Host:

| Aba | Campo | Valor |
|---|---|---|
| Details | Domain Names | `appcar.arthurgomes.dev` |
| Details | Scheme / Forward Hostname / Port | `http` / `178.104.211.246` / `3004` |
| Details | Block Common Exploits | ligado |
| SSL | SSL Certificate | Request a new SSL Certificate (Let's Encrypt) |
| SSL | Force SSL, HTTP/2 Support | ligados |

`TRUST_PROXY=2` corresponde aos dois proxies na frente da API (NPM e o web); assim os limites por IP e a auditoria
registram o IP real do usuário. Feche as portas dos apps (3000–3004), do Postgres (5432) e do Redis (6379) para a
internet com o Firewall da Hetzner liberando só 22, 80 e 443: o NPM e os apps continuam se falando por dentro da VPS.

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

O usuário do banco precisa ser dono das tabelas. Regra do projeto: o schema fica sempre numa única migração; mudanças
entram editando a própria `InitialSchema`. Como um banco que já rodou a migração não a executa de novo, aplique a
mudança à mão antes do deploy (ou recrie o banco vazio). Colunas adicionadas depois da primeira publicação:

```bash
docker exec postgres psql -U appcar -d appcar -c 'ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_odometer integer; ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fipe_manual boolean NOT NULL DEFAULT false; ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS oil_change_interval_km integer NOT NULL DEFAULT 10000; ALTER TABLE fuel_logs ALTER COLUMN liters TYPE numeric(7,3); ALTER TABLE insurances ADD COLUMN IF NOT EXISTS installment_cents integer; ALTER TABLE insurances ADD COLUMN IF NOT EXISTS first_installment_number smallint; ALTER TABLE insurances ADD COLUMN IF NOT EXISTS first_installment_date date;'
```

Para recriar o banco vazio (apaga todos os dados do App Car): pare `appcar-api`, rode
`docker exec postgres psql -U admin -d appcar -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION appcar;'`
e o `deploy/deploy.sh`, que roda a migração.

## Variáveis da API

Modelo completo em [apps/api/.env.example](../apps/api/.env.example). Em produção (`NODE_ENV=production`):

| Variável | Produção |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | Serviços gerenciados (ex.: Neon/RDS, Upstash) |
| `JWT_SECRET` | 32+ caracteres aleatórios (`openssl rand -base64 48`) |
| `WEB_URL`, `CORS_ORIGIN` | Domínio público do web (links dos e-mails) |
| `TRUST_PROXY` | `1` atrás de um proxy/load balancer (IP real nos limites e na auditoria) |
| `SMS_PROVIDER`, `SMSDEV_KEY` | `disabled`: sem SMS, o PIN e os códigos vão por e-mail (opção SMS aparece como "em breve"). `smsdev` + `SMSDEV_KEY`: liga o PIN por SMS. `console` é recusado em produção |
| `SMTP_URL`, `MAIL_FROM` | Resend (`smtps://resend:<API_KEY>@smtp.resend.com:465`) ou Brevo (`smtp://<login>:<chave>@smtp-relay.brevo.com:587`); `MAIL_FROM` com domínio verificado |
| `STORAGE_PROVIDER=gdrive`, `GOOGLE_DRIVE_*` | Uploads no Google Drive da conta do app (ver abaixo). As fotos são servidas pela API, só para o dono |
| `S3_*` | Só com `STORAGE_PROVIDER=s3` (bucket privado S3/R2) ou para ler arquivos enviados antes do Drive |
| `PLATE_PROVIDER` | `none` em produção (a simulação `mock` é recusada): veículos são cadastrados com os dados digitados até contratar um provedor de placa (ver abaixo) |
| `FIPE_PROVIDER=parallelum`, `FIPE_TOKEN` | Token gratuito de fipe.api.br/register: mais consultas por dia e 30 consultas por placa por mês (sem token, só 5) |

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
- **Captcha** (ex.: Cloudflare Turnstile) no envio de PIN, se houver abuso; os limites por placa, IP e destino
  já estão no Redis.
- **Observabilidade:** Sentry (web e API) e um monitor de uptime em `/health`.
- **Backups** automáticos do Postgres no provedor.

## Verificação pós-deploy

```bash
curl -fsS https://<dominio>/api/health        # API pelo web
# Só em staging com SMS_PROVIDER=console: o teste cria uma conta e dispara um e-mail de confirmação.
E2E_BASE_URL=https://<staging> pnpm -C apps/web e2e
```

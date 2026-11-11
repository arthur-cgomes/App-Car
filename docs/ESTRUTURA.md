# Estrutura do projeto

Monorepo pnpm + Turborepo com três pacotes e a infraestrutura local.

```
monitoring-car/
├── apps/
│   ├── api/                 NestJS 11 + TypeORM 0.3 (porta 3000)
│   └── web/                 Next.js 16 App Router (porta 3001)
├── packages/
│   └── shared/              Regras e catálogos usados pela API e pelo web
├── infra/
│   └── docker-compose.yml   Postgres 17, Redis 7, SeaweedFS (S3 local) e Mailpit
├── deploy/                  Produção na VPS: serviços para o compose da infra, deploy.sh e modelo do .env
├── .github/workflows/       CI (lint, tipos, testes, build) e Deploy (SSH na VPS após o CI)
└── docs/                    Estrutura, API de integração, deploy e protótipo de design
```

O web expõe a API na mesma origem (`/api/*` → `API_URL`), então a sessão vive em cookies first-party e não há CORS
entre navegador e API.

## API (`apps/api`)

```
src/
├── main.ts / app.module.ts / app.setup.ts   Bootstrap, módulos, helmet, CORS, ValidationPipe e Swagger
├── config/env.ts                            Variáveis de ambiente validadas com zod
├── common/
│   ├── auth/                                JwtAuthGuard (cookie, Bearer ou X-Api-Key) e CsrfGuard
│   ├── decorators/                          @CurrentUser, @Public, @ApiKeyAuth, @AuditIgnore
│   ├── entities/                            BaseEntity, BaseTechnicalEntity, BaseAppendOnlyEntity
│   ├── services/base-crud.service.ts        CRUD com filtro pelo dono em toda consulta (404 para outros)
│   ├── filters/                             Erro inesperado vira 500 "Erro interno no servidor."; duplicado vira 409
│   ├── pipes/ context/ today.ts
├── audit/                                   AuditSubscriber e audit_logs
├── database/
│   ├── migrations/<ts>-InitialSchema.ts     Única migração: tabelas, índices, trigger e categorias
│   ├── seeds/                               Categorias e conta de demonstração
│   └── naming.strategy.ts                   snake_case com pk_/fk_/idx_/uq_
├── infra/
│   ├── redis/                               Cliente e RateLimiter (limites e locks dos jobs)
│   └── storage/                             StorageService: Google Drive (gdrive:<id>) ou S3
├── notifications/                           E-mail (SMTP) e SMS (console, SMSDev ou desligado)
└── modules/                                 Módulos de domínio (abaixo)
scripts/google-drive-auth.ts                 Autorização OAuth do Drive
test/                                        Testes de integração (*.int-spec.ts)
```

### Módulos

| Módulo | Rotas (`/v1`) | Responsabilidade |
|---|---|---|
| `auth` | `/auth/signup/start`, `/signup/verify`, `/register`, `/login`, `/pin/request`, `/pin/verify`, `/email/*`, `/phone/*`, `/refresh`, `/logout`, `/password/*` | Cadastro em etapas (código no e-mail primeiro, dados depois, CPF validado pelos dígitos), login por senha ou placa + PIN (por e-mail ou SMS), sessão em cookies httpOnly, recuperação de senha |
| `users` / `account` | `/me`, `/me/phone`, `/me/password-link`, `/me/export`, `/me/delete/request` | Perfil, tema, troca de celular, exportação (LGPD) e exclusão de conta |
| `api-keys` | `/me/api-keys` | Chaves de API do usuário (só o hash é guardado) |
| `integrations` | `/integrations/fuel-expenses` | API aberta: abastecimentos enviados por outro app ([API_INTEGRACAO.md](API_INTEGRACAO.md)) |
| `vehicles` | `/vehicles`, `/vehicles/:id`, `/:id/activate`, `/:id/history` | Veículos (pela placa ou manual), veículo ativo, odômetro (PATCH só da km), FIPE informada pelo usuário |
| `plate-lookup` | `POST /plates/:plate/vehicle`, `POST /plates/:plate/lookup`, `/plates/history` | Consulta de placa com cache, limite diário e histórico |
| `fipe` | `/vehicles/:id/fipe` | Valor FIPE (Parallelum) guardado por mês de referência; sem código FIPE, consulta a placa uma vez a cada 30 dias; o valor informado pelo usuário (`fipe_manual`) prevalece; IPVA estimado em 4% |
| `expenses` | `/vehicles/:id/expenses`, `/months`, `/:expenseId` | Gastos: categoria, local, data e hora, odômetro, litros, peças e mão de obra, fotos |
| `files` | `/files`, `/files/:id` | Upload validado pelo conteúdo (imagem ou PDF, até 10 MB) e download só pelo dono |
| `tires` | `/vehicles/:id/tires`, `/settings`, `/pressure`, `/rotations`, `/occurrences`, `/replacements` | Pneus: jogo, calibragem, rodízio, ocorrências, substituição e fotos |
| `reminders` | `/vehicles/:id/reminders`, `/:reminderId/done`, `/undo` | Lembretes manuais e automáticos (débitos, IPVA, revisão, troca de óleo `AUTO_OIL`, seguro, rodízio `AUTO_ROTATION`, calibragem `AUTO_PRESSURE`) |
| `documents` / `insurances` | `/vehicles/:id/documents`, `/insurances` | IPVA, licenciamento, CRLV e apólices (pagar vira gasto; fim da vigência vira lembrete; parcelas viram gastos na data, pelo job diário) |
| `emergency-contacts` | `/vehicles/:id/emergency-contacts` | Seguradora, guincho, concessionária da rodovia, oficina |
| `dashboard` | `/vehicles/:id/summary` | Resumo do mês |
| `reports` | `/vehicles/:id/reports`, `/fuel-stats` | Relatórios (JSON, CSV, PDF), custos de peças e mão de obra, consumo médio |
| `jobs` | — | 08:00 lembretes automáticos; 03:00 exclusão definitiva de contas (LGPD) |

### Banco de dados

Tabelas em `snake_case`; toda tabela de negócio tem `id`, `created_at`, `updated_at`, `deleted_at` (soft delete),
`created_by`, `updated_by` e `version`.

| Tabela | Conteúdo |
|---|---|
| `users` | Conta, tema, login por placa + PIN e canal do PIN (`pin_channel`), e-mail confirmado, veículo ativo |
| `vehicles` | Placa, marca, modelo, versão, cor, ano, data e odômetro da compra, odômetro (`current_odometer` e `base_odometer`), FIPE (`fipe_code`, `fipe_value_cents`, `fipe_ref_month`, `fipe_manual`), intervalos de revisão e troca de óleo |
| `expenses` | Gastos; `occurred_at`, `establishment`, `parts_cents`, `labor_cents`, `source` (`MANUAL`, `API`…) e `external_id` (idempotência da integração) |
| `expense_categories` | 7 categorias fixas (criadas pela migração) |
| `expense_attachments` / `files` / `fuel_logs` | Fotos da nota, arquivos enviados e litros |
| `reminders` / `documents` / `insurances` / `emergency_contacts` / `tires` / `tire_events` / `tire_rotations` | Domínios do veículo |
| `api_keys` | Chaves de API (prefixo visível e hash SHA-256) |
| `plate_lookups` / `plate_lookup_history` | Cache das consultas de placa e histórico por usuário |
| `refresh_tokens` / `auth_otps` / `password_reset_tokens` | Sessão e códigos (tabelas técnicas) |
| `audit_logs` | Histórico append-only (trigger no banco; só a limpeza da LGPD apaga) |

## Web (`apps/web`)

```
app/
├── (auth)/                  login, signup, forgot-password, reset-password
├── (app)/                   Telas autenticadas, dentro do AppShell
│   ├── page.tsx             Resumo
│   ├── expenses/ reminders/ lookup/ (Consulta oculta: redireciona ao Resumo)
│   ├── vehicle/             Ficha: documents, insurances, fuel, contacts, reports
│   └── profile/             Perfil e integrations (chaves de API)
├── layout.tsx manifest.ts robots.ts globals.css
components/placar/           Design system iOS: shell (tab bar, sheets, banner), telas, sheets e células
│   └── date-picker.tsx      Seletor de data estilo iOS (pílula + calendário + rodas de mês/ano)
lib/
├── api/                     Cliente HTTP (cookies + cabeçalho anti-CSRF) e hooks TanStack Query por recurso
├── privacy.ts use-privacy.ts Botão de olho: valores (`.sensitive`) embaçados por padrão; a escolha fica guardada no aparelho
└── format.ts theme.ts …     Formatação pt-BR, tema claro/escuro
proxy.ts                     Redireciona para /login sem sessão (os endereços antigos em português redirecionam em next.config.ts)
next.config.ts               Rewrite /api, cabeçalhos de segurança (CSP, HSTS, X-Frame-Options…)
e2e/                         Playwright
```

Cores: `--color-accent` é o azul-marinho #001E50 e a rampa `accent-100…900` foi gerada no mesmo matiz; os tokens
`--ios-*` definem os temas escuro e claro.

## Shared (`packages/shared`)

| Arquivo | Conteúdo |
|---|---|
| `utils/plate.ts`, `cpf.ts`, `phone.ts`, `money.ts`, `password.ts` | Normalização e validação compartilhadas |
| `catalogs/categories.ts`, `part-systems.ts`, `vehicle-brands.ts`, `emergency-contacts.ts` | Catálogos fixos |

## Convenções

- **Usuário só pelo token:** `@CurrentUser()` em todo controller; o ESLint barra `userId`/`ownerId` em `@Param`,
  `@Query` e `@Body`, e o `ValidationPipe` rejeita campos desconhecidos.
- **Auditoria:** use `save`/`softRemove`/`recover`; `update()`/`delete()` por QueryBuilder não passam pelo
  `AuditSubscriber`. Colunas sensíveis levam `@AuditIgnore()`.
- **Migração única:** mudanças de schema entram em `InitialSchema` enquanto o app não está em produção; depois do
  lançamento, novas migrações.
- **Segurança:** requisições que alteram dados exigem `X-Requested-With: placar` (exceto as rotas com chave de API,
  que não aceitam cookie); consultas sempre parametrizadas; CSP e cabeçalhos no web e `helmet` na API.
- **Testes:** unitários (`*.spec.ts`, Vitest no web e no shared, Jest na API), integração (`test/*.int-spec.ts`,
  só em bancos `*_test`) e E2E (Playwright).
- **Código sem comentários.**

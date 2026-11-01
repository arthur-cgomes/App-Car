# App Car

O resumo do seu carro na palma da mão: gastos (combustível, manutenção com peças e mão de obra, documentos, multas,
seguro), documentos, seguros, contatos de emergência e lembretes, com consulta pela placa. Web responsiva
(mobile-first, visual iOS) + API, e uma API aberta para outro app lançar abastecimentos.

| Documento | Conteúdo |
|---|---|
| [docs/ESTRUTURA.md](docs/ESTRUTURA.md) | Estrutura do monorepo, módulos da API, banco, telas e convenções |
| [docs/API_INTEGRACAO.md](docs/API_INTEGRACAO.md) | API aberta: chaves de API e envio de abastecimentos por outro app |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Imagens Docker, variáveis de ambiente, Google Drive, e-mail, SMS e verificação pós-deploy |
| [docs/design/Placar.html](docs/design/Placar.html) | Protótipo de referência visual (telas e componentes iOS) |

## Stack

- **Web:** Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind 4, TanStack Query — porta **3001**
- **API:** NestJS 11, TypeORM 0.3, PostgreSQL 17, Redis — porta **3000** (Swagger em `/docs` fora de produção)
- **Monorepo:** pnpm 11 + Turborepo; `packages/shared` com regras e catálogos usados pelos dois lados
- **Serviços:** Google Drive (fotos e PDFs), SMSDev (SMS), Resend ou Brevo (e-mail), FIPE (Parallelum)

## Rodando localmente

Requisitos: Node 22, pnpm 11 e Docker.

Primeira vez:

```bash
pnpm install
pnpm db:up
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm -C apps/api migration:run
pnpm -C apps/api seed
```

No dia a dia:

```bash
pnpm db:up
pnpm dev
```

Abra http://localhost:3001 e entre com a conta de demonstração criada pelo `seed`:

| Campo | Valor |
|---|---|
| E-mail | `motorista.p0wdv1@appcar.test` (ou CPF `529.982.247-25`) |
| Senha | `XDN0lM5YG*7o` |
| Celular | `(21) 99999-0001` |
| Carro padrão | `RIO2A18` · VW Polo Highline 1.0 200 TSI 2019 prata · 108.000 km |

Para parar: `Ctrl+C` no `pnpm dev` e `pnpm db:down` (os dados continuam salvos).

### Em desenvolvimento

- **SMS:** com `SMS_PROVIDER=console` nada é enviado; o código aparece no terminal da API (`[SMS] Para +55…`).
- **E-mail:** com `SMTP_URL=smtp://localhost:1025` os e-mails chegam no Mailpit (http://localhost:8025).
- **Consulta de placa:** `PLATE_PROVIDER=mock` é um provedor simulado; `RIO2A18` traz o Polo do carro padrão e placas
  começando com `ZZZ` não existem. Enquanto não há provedor real, o veículo pode ser cadastrado manualmente.
- **Uploads:** `STORAGE_PROVIDER=gdrive` envia ao Google Drive (configuração em [docs/DEPLOY.md](docs/DEPLOY.md));
  `s3` usa o SeaweedFS local do `docker-compose`.
- **Design de referência:** `python3 -m http.server 4400 --directory docs/design` e abra http://localhost:4400/Placar.html.

## Funcionalidades

- **Entrar:** e-mail ou CPF + senha (8+ caracteres com maiúscula, número e caractere especial) ou placa + código por SMS.
- **Resumo:** veículo ativo, gasto do mês, custo por km, próximos lembretes e atalhos para Ficha e contatos de emergência.
- **Gastos:** lançamento com categoria, valor, data (seletor estilo iOS), local, odômetro, litros e fotos da nota.
  Em **Manutenção**, peças e mão de obra são informadas separadamente e o total é a soma das duas.
- **Odômetro:** o km do carro é o maior entre o informado no cadastro/Ficha e o maior km lançado; corrigir ou excluir um
  lançamento recalcula.
- **Lembretes:** automáticos (débitos, IPVA, revisão por km, renovação do seguro) e manuais; ao lançar uma manutenção o
  app oferece um lembrete para daqui a 3, 6 ou 12 meses.
- **Ficha do veículo:** FIPE, dados, intervalo de revisão, documentos, seguros, abastecimentos (consumo médio),
  contatos de emergência e relatórios (JSON, CSV e PDF) com o total de peças e mão de obra.
- **Veículos:** cadastro pela placa ou manual (marca entre as 10 mais vendidas, modelo, versão, cor, km e data da compra).
- **Consulta:** dados e débitos de qualquer placa, com "Lançar como gasto". O app só acompanha débitos; não há pagamento.
- **Perfil:** dados pessoais, foto, tema, troca de celular com SMS, link para trocar a senha, **Integrações** (chaves de
  API) e Privacidade (exportar dados e excluir conta; a exclusão definitiva acontece em 30 dias).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Web (:3001) e API (:3000) com recarga automática |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Em todo o monorepo (Turborepo) |
| `pnpm -C apps/api test:int` | Testes de integração contra Postgres (`monitoring_car_test`), Redis (db 1) e S3 locais |
| `pnpm -C apps/web e2e` | E2E (Playwright) em iPhone, iPad e desktop contra o ambiente de pé; `E2E_BASE_URL` aponta para outro. Na primeira vez: `pnpm -C apps/web exec playwright install chromium` |
| `pnpm -C apps/api migration:run` / `migration:revert` | Aplica / desfaz a migração |
| `pnpm -C apps/api seed` | Categorias e conta de demonstração (não cria a conta em produção) |
| `pnpm -C apps/api drive:auth` | Autoriza o Google Drive e cria a pasta dos uploads |
| `pnpm db:up` / `pnpm db:down` | Sobe / para Postgres, Redis, S3 e Mailpit |

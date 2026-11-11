# App Car

O resumo do seu carro na palma da mão: gastos (combustível, manutenção com peças e mão de obra, documentos, multas,
seguro), documentos, seguros, contatos de emergência e lembretes, com consulta pela placa. Web responsiva
(mobile-first, visual iOS) + API, e uma API aberta para outro app lançar abastecimentos.

| Documento | Conteúdo |
|---|---|
| [docs/ESTRUTURA.md](docs/ESTRUTURA.md) | Estrutura do monorepo, módulos da API, banco, telas e convenções |
| [docs/API_INTEGRACAO.md](docs/API_INTEGRACAO.md) | API aberta: chaves de API e envio de abastecimentos por outro app |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deploy automático na VPS (GitHub Actions), Nginx Proxy Manager, variáveis, Google Drive e e-mail |
| [docs/design/Placar.html](docs/design/Placar.html) | Protótipo de referência visual (telas e componentes iOS) |

## Stack

- **Web:** Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind 4, TanStack Query — porta **3001**
- **API:** NestJS 11, TypeORM 0.3, PostgreSQL 17, Redis — porta **3000** (Swagger em `/docs` fora de produção)
- **Monorepo:** pnpm 11 + Turborepo; `packages/shared` com regras e catálogos usados pelos dois lados
- **Serviços:** Google Drive (fotos e PDFs), Resend ou Brevo (e-mail e PIN), SMSDev (PIN por SMS, quando ativado), FIPE (Parallelum)

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

- **PIN e códigos:** vão por e-mail (no Mailpit, em desenvolvimento). Com `SMS_PROVIDER=console`, os enviados por SMS
  aparecem só no terminal da API (`[SMS] Para +55…`).
- **E-mail:** com `SMTP_URL=smtp://localhost:1025` os e-mails chegam no Mailpit (http://localhost:8025).
- **Consulta de placa:** só no ambiente local, `PLATE_PROVIDER=mock` simula a consulta (`RIO2A18` traz o Polo do carro
  padrão; placas começando com `ZZZ` não existem). Em produção é `PLATE_PROVIDER=none`: o veículo é cadastrado com os
  dados digitados e a tela Consulta mostra "em breve" até haver um provedor real.
- **Uploads:** `STORAGE_PROVIDER=gdrive` envia ao Google Drive (configuração em [docs/DEPLOY.md](docs/DEPLOY.md));
  `s3` usa o SeaweedFS local do `docker-compose`.
- **Design de referência:** `python3 -m http.server 4400 --directory docs/design` e abra http://localhost:4400/Placar.html.

## Funcionalidades

- **Entrar:** e-mail ou CPF + senha (8+ caracteres com maiúscula, número e caractere especial) ou **placa + PIN**, enviado por e-mail ou SMS conforme a preferência do usuário (por enquanto, só e-mail).
  O cadastro começa pelo e-mail: o usuário recebe um código e, com ele confirmado, informa nome, CPF (validado pelos
  dígitos verificadores), celular e senha. A conta só é criada no último passo.
- **Resumo:** foto do perfil no canto superior esquerdo e, à direita, em todas as abas, quatro botões: olho (mostra ou embaça todos os valores em
  R$ do app; começam embaçados e a escolha fica salva no aparelho), velocímetro (atualiza só a km atual do carro), sol/lua (tema claro ou escuro) e sino (com ponto vermelho quando há lembretes vencidos, abre
  Lembretes já em "Vencidos"). Mostra o veículo ativo como marca + modelo + versão, gasto do mês, custo por km, próximos
  lembretes e atalhos para Ficha e contatos de emergência.
- **Gastos:** lançamento com categoria, valor, data (seletor estilo iOS), local, odômetro, litros e fotos da nota.
  Em **Manutenção**, peças e mão de obra são informadas separadamente e o total é a soma das duas.
- **Odômetro:** o km do carro é o maior entre o informado no cadastro/Ficha e o maior km lançado; corrigir ou excluir um
  lançamento recalcula.
- **Pneus:** aba própria com vida restante de cada pneu (a frente gasta cerca de 30% mais), pressão, estepe, calibragem com carro
  vazio ou carregado, ocorrências (com custo vira gasto na categoria Pneus), substituição, fotos, histórico por pneu e rodízio
  sugerido, paralelo ou manual.
- **Lembretes:** automáticos (débitos, IPVA estimado em 4% da FIPE, como na Ficha, revisão por km, troca de óleo, renovação do seguro, rodízio e calibragem de pneus) e manuais, com filtro Todos |
  Vencidos; ao lançar uma manutenção o app oferece um lembrete para daqui a 3, 6 ou 12 meses.
- **Ficha do veículo:** FIPE automática (pelo código ou, sem ele, pela placa) ou informada pelo usuário, com IPVA
  estimado em 4% do valor, dados, intervalo de revisão, troca de óleo (6 meses ou 5 mil km, 1 ano ou 10 mil km; o lembrete vence no que
  chegar primeiro e recomeça na última troca de óleo lançada em Gastos), documentos, seguros (valor total, franquia e parcelas:
  cada parcela entra sozinha em Gastos na data da cobrança, inclusive de uma apólice transferida a partir da parcela N),
  abastecimentos (consumo médio),
  contatos de emergência e relatórios (JSON, CSV e PDF) com o total de peças e mão de obra.
- **Veículos:** cadastro com a placa e os dados do documento (marca entre as 10 mais vendidas, modelo, versão, cor, km com
  separador de milhar, data e odômetro da compra); com um provedor de placa, os dados podem vir da consulta. Fora do
  cadastro, a Volkswagen aparece abreviada como "VW".
- **Consulta:** oculta por enquanto (fora da barra inferior e do Resumo; `/lookup` leva ao Resumo). A tela continua no
  código (`consulta-screen.tsx`) para quando houver um provedor de placa.
- **Erros:** falhas inesperadas aparecem como "Erro interno no servidor." e o detalhe fica só no log da API.
- **Perfil:** dados pessoais, foto, tema, canal do PIN (e-mail ou SMS), confirmação do e-mail, link para trocar a senha, **Integrações** (chaves de
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

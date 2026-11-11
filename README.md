# VW Polo

O resumo do seu carro na palma da mão. É um app web (mobile-first, com visual de iOS, instalável na tela inicial) para
acompanhar tudo o que envolve ter um carro: gastos, manutenção, pneus, documentos, seguro, lembretes e contatos de
emergência.

## Por que este projeto existe

Fiz o VW Polo para resolver uma necessidade minha. Eu queria saber quanto meu Polo realmente custa por mês e por km, não
esquecer IPVA, licenciamento, revisão, troca de óleo e rodízio de pneus, e ter a apólice e os telefones de guincho e
seguradora à mão quando algo acontece na estrada. As planilhas e os apps que testei não juntavam tudo isso num lugar só,
então construí o meu. Uso o app no dia a dia, e cada funcionalidade nasceu de uma situação real com o carro.

O nome, o logo (a placa com "POLO") e os dados de exemplo são do meu carro, mas o app funciona com qualquer veículo. Se
quiser uma versão com a cara do seu, veja [Adapte para o seu carro](#adapte-para-o-seu-carro).

## O que ele faz

- **Gastos** por categoria (combustível, manutenção com peças e mão de obra separadas, pneus, documentos, multas, seguro),
  com fotos da nota, custo do mês e custo por km.
- **Lembretes** automáticos (IPVA, licenciamento, revisão, troca de óleo, renovação do seguro, rodízio e calibragem) e
  manuais.
- **Pneus:** vida restante de cada um, calibragem, ocorrências, substituição e rodízio.
- **Ficha do veículo:** valor FIPE, IPVA estimado, documentos, seguros com parcelas, consumo médio, contatos de
  emergência e relatórios em PDF, CSV e JSON.
- **API aberta** para outro app lançar abastecimentos com uma chave de API.

Os detalhes de cada tela estão em [Funcionalidades](#funcionalidades).

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
- **Perfil:** dados pessoais, foto, tema, canal do PIN (e-mail ou SMS), confirmação do e-mail, troca de senha (pede a senha atual, encerra as outras sessões e invalida links de recuperação; 5 erros seguidos bloqueiam por 15 min), **Integrações** (chaves de
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

## Adapte para o seu carro

O código serve para qualquer carro: você cadastra o seu veículo e tudo funciona. O que é do Polo é a identidade do app
(nome, logo, cores, textos de e-mail e SMS) e os dados de exemplo. Para ter uma versão com o seu carro, copie o prompt
abaixo, preencha os campos entre colchetes e cole numa IA de código com acesso ao terminal (Claude Code, Codex, Cursor
ou outra). Ela clona o repositório, troca as referências e confere se tudo continua passando.

```text
Quero adaptar o app open source "VW Polo" (https://github.com/arthur-cgomes/VW-Polo) para o meu carro.
Hoje o app usa o nome, o logo e os dados de exemplo de um Volkswagen Polo. Troque essas referências pelas do meu carro,
sem mudar o funcionamento do app.

## Meu carro
- Fabricante: [ex.: Fiat]
- Modelo: [ex.: Argo]
- Versão e motor: [ex.: Trekking 1.3 Firefly]
- Ano de fabricação / modelo: [ex.: 2022 / 2023]
- Cor: [ex.: Vermelho]
- Combustível: [ex.: Flex]
- Tração: [dianteira | traseira | integral]
- Medida dos pneus e do estepe: [ex.: 185/60 R15 e 175/65 R14; ou "pesquise"]
- Calibragem em psi (vazio dianteiro/traseiro, carregado dianteiro/traseiro, estepe): [ex.: 32/32, 35/38, 60; ou "pesquise"]
- Revisão e troca de óleo do manual (km): [ex.: 10000 e 10000; ou "pesquise"]
- Nome do app: [ex.: Fiat Argo]
- Texto curto para a placa do logo, até 6 letras: [ex.: ARGO]
- Cor principal da marca (hex): [ex.: #B5121B; ou "sugira uma"]
- Placa fictícia para os dados de exemplo (padrão Mercosul): [ex.: SAO3B21]

## Passo a passo
1. Clone o repositório numa pasta com o nome do app em kebab-case:
   git clone https://github.com/arthur-cgomes/VW-Polo.git <nome-do-app>
   Leia README.md e docs/ESTRUTURA.md antes de mudar qualquer coisa.
2. Encontre as referências. Busque, sem diferenciar maiúsculas, por: "VW Polo", "Polo", "POLO", "Volkswagen", "VW",
   "Highline", "200 TSI", "RIO2A18", "005476-3", "#001e50", "#0b3a8a" e "#3b7be8". Ignore node_modules, .next, .turbo,
   pnpm-lock.yaml e docs/design/Placar.html (protótipo de referência, não precisa mudar).
3. Troque a identidade do app pelo "Nome do app":
   - apps/web/app/layout.tsx e apps/web/app/manifest.ts (título, nome e nome curto do PWA);
   - logo: apps/web/components/placar/auth/app-logo.tsx, apps/web/app/icon.svg e apps/web/public/icon.svg. Troque o
     texto "POLO" da placa pelo texto curto (diminua font-size ou letter-spacing se não couber na placa de 56 px) e
     as cores #0b3a8a (fundo) e #3b7be8 (faixa da placa) por tons da cor principal;
   - textos de e-mail e SMS: apps/api/src/modules/auth/otp.service.ts, signup.service.ts, auth.service.ts e
     apps/api/src/notifications/mail/templates.ts. O SMS passa por conversão para GSM, então evite emoji;
   - PDF de relatório (reports.service.ts), mensagem de erro da integração (integrations.service.ts) e o remetente
     padrão MAIL_FROM em apps/api/src/config/env.ts, apps/api/.env.example e deploy/.env.example.
4. Troque a cor principal: em apps/web/app/globals.css, gere de novo a rampa --color-accent-100 a --color-accent-900 no
   matiz da cor da marca (o 900 é o tom mais escuro, usado como cor principal) e confira os tokens --ios-* nos temas
   claro e escuro. Use a mesma cor em NAVY (templates.ts) e em accent (reports.service.ts). Garanta contraste de texto
   branco sobre a cor principal de pelo menos 4,5:1.
5. Troque os dados de exemplo pelo meu carro: conta de demonstração (apps/api/src/database/seeds/demo-account.seed.ts),
   mock de placa (apps/api/src/modules/plate-lookup/providers/mock-plate.provider.ts), mock da FIPE
   (apps/api/src/modules/fipe/mock-fipe.provider.ts; use o código e o valor FIPE reais do meu carro se conseguir
   consultar, senão valores plausíveis), exemplos do Swagger (create-vehicle.dto.ts e tire.dto.ts) e placeholders dos
   formulários (vehicle-sheet.tsx e tire-setup-sheet.tsx).
6. Fabricante abreviado: o app mostra "Volkswagen" como "VW" (SHORT_BRANDS em apps/web/lib/api/vehicles.ts e uma
   comparação direta em apps/web/components/placar/screens/gastos-screen.tsx). Ajuste para a abreviação do meu
   fabricante, se ele tiver uma usual, e confira se o fabricante está em packages/shared/src/catalogs/vehicle-brands.ts
   (se não estiver, adicione sem tirar os que existem).
7. Padrões técnicos do veículo, com os valores do manual do meu carro:
   - calibragem (tire_psi_*) e intervalos de revisão, troca de óleo e rodízio: em
     apps/api/src/modules/vehicles/vehicle.entity.ts E na migração única
     apps/api/src/database/migrations/*-InitialSchema.ts (os dois precisam bater);
   - tração: o desgaste dos pneus considera tração dianteira (REAR_WEAR_FACTOR = 0.7 e o rodízio cruzado sugerido em
     packages/shared/src/catalogs/tires.ts). Se a tração for traseira ou integral, explique o que mudaria e me pergunte
     antes de alterar.
   Quando um valor for "pesquise", use uma fonte confiável (manual do proprietário ou site do fabricante) e me diga de
   onde tirou. Se não encontrar, mantenha o valor atual e avise.
8. Atualize os testes que esperam os textos e dados antigos (apps/api/test/*.int-spec.ts,
   apps/api/src/notifications/sms/smsdev-sms.provider.spec.ts, packages/shared/src/utils/email.spec.ts) e os
   documentos (README.md, docs/*.md), incluindo a seção "Por que este projeto existe", que deve falar do meu carro.

## Não mude
- Nomes internos de infraestrutura: banco e usuário "appcar" e "monitoring_car", containers "appcar-api" e "appcar-web",
  pasta /opt/repos-run/app-car e o prefixo das chaves de API "ac_live_". Trocá-los exige migrar o servidor; se eu
  quiser, faço isso depois, à parte.
- Regras de negócio, rotas da API, schema do banco (além dos valores padrão do passo 7) e a pasta components/placar
  (nome interno do design system).
- O código não tem comentários; mantenha assim.

## Para concluir
1. Rode pnpm install, pnpm lint, pnpm typecheck e pnpm test. Se o Docker estiver disponível, rode também pnpm db:up e
   pnpm -C apps/api test:int. Tudo precisa passar.
2. Busque de novo os termos do passo 2 e me mostre o que sobrou, com o motivo de cada um ter ficado.
3. Me entregue um resumo com os arquivos alterados, os valores técnicos usados (e as fontes) e o que precisei decidir
   sozinho. Não faça commit nem push sem eu pedir.
```

Depois da adaptação, siga [Rodando localmente](#rodando-localmente) para ver o resultado. Para publicar o app no seu
servidor, veja [docs/DEPLOY.md](docs/DEPLOY.md).

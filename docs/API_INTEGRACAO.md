# API de integração

Permite que outro app lance abastecimentos na conta de um usuário do App Car, autenticado por uma chave de API.

## 1. Criar a chave

No App Car: **Perfil → Integrações → Chaves de API → +**. Dê um nome (ex.: "App de abastecimento") e copie a chave
`ac_live_…` na hora: ela aparece uma única vez. Na mesma tela dá para ver o último uso e revogar a chave.

Também pela API (sessão do usuário): `GET/POST /api/v1/me/api-keys` e `DELETE /api/v1/me/api-keys/:id`.

## 2. Enviar um abastecimento

```
POST https://<domínio>/api/v1/integrations/fuel-expenses
X-Api-Key: ac_live_...
Content-Type: application/json
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `establishment` | texto (2–120) | sim | Nome do posto/estabelecimento |
| `amount` | número | sim | Valor em reais, até 2 casas decimais (ex.: `189.90`) |
| `occurredAt` | ISO 8601 com fuso | sim | Data e hora do abastecimento (ex.: `2026-11-01T14:32:00-03:00`). Não pode estar mais de 1 dia no futuro |
| `plate` | texto | não | Placa do veículo da conta (`RIO2A18` ou `RIO-2A18`). Sem ela, vai para o veículo ativo |
| `liters` | número | não | Litros, até 2 casas (habilita o consumo médio) |
| `fullTank` | booleano | não | Tanque cheio |
| `odometer` | inteiro | não | Odômetro em km (atualiza o km do carro se for maior) |
| `externalId` | texto (até 80) | não | Id no seu app. Reenviar o mesmo id não cria outro gasto |

O gasto entra na categoria **Combustível**, com o estabelecimento como local e descrição, a data no fuso de Brasília e
a origem "Integração".

### Exemplo

```bash
curl -X POST https://<domínio>/api/v1/integrations/fuel-expenses \
  -H "X-Api-Key: ac_live_..." \
  -H "Content-Type: application/json" \
  -d '{"establishment":"Posto Shell Barra","amount":189.90,"occurredAt":"2026-11-01T14:32:00-03:00","plate":"RIO2A18","liters":32.5,"fullTank":true,"externalId":"nota-123"}'
```

### Respostas

| Status | Quando | Corpo |
|---|---|---|
| `201` | Gasto criado | `{ "duplicate": false, "expense": { … } }` |
| `200` | `externalId` já enviado antes | `{ "duplicate": true, "expense": { … } }` (o gasto existente) |
| `400` | Campo inválido ou campo desconhecido | `{ "message": [ … ] }` |
| `401` | Chave ausente, inválida ou revogada | |
| `422` | Placa não encontrada na conta, ou conta sem veículo | |
| `429` | Mais de 60 requisições por minuto na mesma chave | `{ "message": "…", "retryAfter": 42 }` |

`expense` traz `id`, `vehicleId`, `category`, `amountCents`, `date`, `occurredAt`, `establishment`, `odometer`, `fuel`
e `source: "API"`.

## Segurança

- Só o hash SHA-256 da chave fica no banco; a chave completa não pode ser recuperada, apenas revogada.
- A rota aceita somente a chave (`X-Api-Key`); cookies de sessão não autenticam nela.
- Cada chave age como o usuário dono: lança apenas nos veículos dele.
- Excluir a conta invalida todas as chaves.

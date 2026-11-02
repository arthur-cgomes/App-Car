#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${INFRA_DIR:-/opt/infra}"
REF="${1:-origin/master}"
SERVICES=(appcar-api appcar-web)
COMPOSE=(docker compose --project-directory "$INFRA_DIR" -f "$INFRA_DIR/docker-compose.yml")

[ -f "$APP_DIR/deploy/.env" ] || { echo "deploy/.env não encontrado: copie deploy/.env.example e preencha" >&2; exit 1; }
"${COMPOSE[@]}" config --services | grep -qx appcar-api || {
  echo "Os serviços do App Car não estão em $INFRA_DIR/docker-compose.yml: cole o bloco de deploy/infra-services.yml" >&2
  exit 1
}

echo "==> Código: $REF"
cd "$APP_DIR"
git fetch --quiet origin master
git reset --hard --quiet "$REF"
git log -1 --format='    %h %s'

echo "==> Build das imagens"
"${COMPOSE[@]}" build --pull "${SERVICES[@]}"

echo "==> Migração"
"${COMPOSE[@]}" run --rm --no-deps appcar-api npm run migration:run:prod

echo "==> Subindo API e web"
"${COMPOSE[@]}" up -d --no-deps "${SERVICES[@]}"

echo "==> Verificando"
for attempt in $(seq 1 30); do
  if docker exec appcar-web wget -qO- http://appcar-api:3000/health >/dev/null 2>&1 \
    && docker exec appcar-web wget -qO- http://127.0.0.1:3001/entrar >/dev/null 2>&1; then
    echo "    API e web no ar"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "Falha: API ou web não responderam. Últimos logs:" >&2
"${COMPOSE[@]}" logs --tail 60 "${SERVICES[@]}" >&2
exit 1

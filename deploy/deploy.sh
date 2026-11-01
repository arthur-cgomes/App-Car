#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${1:-origin/master}"
COMPOSE=(docker compose -p appcar -f "$APP_DIR/deploy/docker-compose.yml" --env-file "$APP_DIR/deploy/.env")

cd "$APP_DIR"
[ -f deploy/.env ] || { echo "deploy/.env não encontrado: copie deploy/.env.example e preencha" >&2; exit 1; }

echo "==> Código: $REF"
git fetch --quiet origin master
git reset --hard --quiet "$REF"
git log -1 --format='    %h %s'

echo "==> Build das imagens"
"${COMPOSE[@]}" build --pull

echo "==> Banco e Redis"
"${COMPOSE[@]}" up -d --wait appcar-postgres appcar-redis

echo "==> Migração"
"${COMPOSE[@]}" run --rm --no-deps appcar-api npm run migration:run:prod

echo "==> Subindo API e web"
"${COMPOSE[@]}" up -d --remove-orphans

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
"${COMPOSE[@]}" logs --tail 60 appcar-api appcar-web >&2
exit 1

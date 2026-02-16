#!/usr/bin/env bash
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f "$@"

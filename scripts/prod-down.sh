#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml --env-file .env.prod down

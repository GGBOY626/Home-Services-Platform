#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
if [ ! -f .env.prod ]; then
  echo "Copy .env.prod.example to .env.prod and fill in values."
  exit 1
fi
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

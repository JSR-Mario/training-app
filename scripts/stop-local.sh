#!/bin/bash

echo "[STOP] Deteniendo Entorno de Desarrollo Local..."

# 1. Detener Docker
echo "[DOCKER] Deteniendo Postgres y Redis..."
docker compose -f docker-compose.local-infra.yml stop

echo "[DONE] Entorno local apagado correctamente."

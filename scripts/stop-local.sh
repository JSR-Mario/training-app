#!/bin/bash

echo "🛑 Deteniendo Entorno de Desarrollo Local..."

# 1. Detener Docker
echo "🐳 Deteniendo Postgres y Redis..."
docker compose -f docker-compose.local-infra.yml stop

echo "✅ Entorno local apagado correctamente."

#!/bin/bash

echo "[STOP] Deteniendo Entorno de Desarrollo Local..."

# 1. Matar procesos huerfanos de Java y Node en los puertos que usamos
echo "[CLEAN] Limpiando procesos huerfanos en puertos locales (4200, 8080-8083)..."
for port in 4200 8080 8081 8082 8083; do
    pid=$(lsof -t -i:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo "[KILL] Matando proceso $pid en puerto $port"
        kill -9 $pid 2>/dev/null || true
    fi
done

# 2. Detener Docker
echo "[DOCKER] Deteniendo Postgres y Redis..."
docker compose -f docker-compose.local-infra.yml stop

echo "[DONE] Entorno local apagado correctamente."

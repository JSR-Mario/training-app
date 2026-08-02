#!/bin/bash
# ==============================================================================
# Sincroniza la base de datos local con el respaldo mas reciente de produccion
# ==============================================================================

set -e

echo "[START] Sincronizando base de datos local con Produccion..."

if [ -f ".env.local" ]; then
    echo "[INFO] Cargando .env.local..."
    set -a
    source .env.local
    set +a
else
    echo "[ERROR] No se encontro .env.local."
    exit 1
fi

if [ -z "$S3_BUCKET" ]; then
  echo "[ERROR] S3_BUCKET no esta configurado en .env.local. Por favor agregalo (ej. S3_BUCKET=s3://mi-bucket-backups)"
  exit 1
fi

echo "[AWS] Buscando el respaldo mas reciente en S3 (${S3_BUCKET})..."
# List files, filter by prefix, sort alphabetically (which sorts by date), take the last one
LATEST_FILE=$(aws s3 ls "${S3_BUCKET}/" | grep "db-backup-" | sort | tail -n 1 | awk '{print $4}')

if [ -z "$LATEST_FILE" ]; then
  echo "[ERROR] No se encontraron respaldos en ${S3_BUCKET}."
  exit 1
fi

S3_URI="${S3_BUCKET}/${LATEST_FILE}"
LOCAL_FILE="/tmp/latest-db.sql.gz"

echo "[AWS] Descargando el respaldo mas reciente: ${LATEST_FILE}..."
aws s3 cp "${S3_URI}" "${LOCAL_FILE}"

echo "[DOCKER] Reiniciando y limpiando el volumen de Postgres local..."
docker compose -f docker-compose.local-infra.yml stop postgres 2>/dev/null || true
docker compose -f docker-compose.local-infra.yml rm -f -v postgres 2>/dev/null || true
docker compose -f docker-compose.local-infra.yml up -d postgres

echo "[WAIT] Dando 5 segundos para que Postgres inicialice..."
sleep 5

echo "[DB] Restaurando la base de datos..."
# Se usa -T para evitar problemas de TTY en el script
gunzip -c "${LOCAL_FILE}" | docker compose -f docker-compose.local-infra.yml exec -T postgres psql -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-trainingapp}"

echo "[CLEAN] Eliminando archivo temporal..."
rm -f "${LOCAL_FILE}"

echo "[DONE] ¡Base de datos local sincronizada exitosamente con produccion!"
echo "Ahora puedes ejecutar ./scripts/start-local.sh normalmente."

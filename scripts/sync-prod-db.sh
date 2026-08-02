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

if ! command -v aws &> /dev/null; then
    echo "[ERROR] AWS CLI no esta instalado. Es necesario para descargar desde S3."
    echo "Instalalo con los siguientes comandos:"
    echo "  curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "  unzip awscliv2.zip"
    echo "  sudo ./aws/install"
    echo "  rm -rf aws awscliv2.zip"
    echo "Despues, ejecuta 'aws configure' para iniciar sesion."
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

echo "[DOCKER] Limpiando la base de datos local y su volumen..."
docker compose -f docker-compose.local-infra.yml down -v 2>/dev/null || true
docker compose -f docker-compose.local-infra.yml up -d postgres

echo "[WAIT] Esperando a que Postgres este completamente listo..."
until docker compose -f docker-compose.local-infra.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-trainingapp}" > /dev/null 2>&1; do
    sleep 1
done

echo "[DB] Creando roles secundarios por si existen en el dump de produccion..."
docker compose -f docker-compose.local-infra.yml exec -T postgres psql -U "${POSTGRES_USER:-user}" -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trainingapp_user') THEN CREATE ROLE trainingapp_user WITH SUPERUSER LOGIN; END IF; END \$\$;" 2>/dev/null || true

echo "[DB] Restaurando la base de datos..."
gunzip -c "${LOCAL_FILE}" | docker compose -f docker-compose.local-infra.yml exec -T postgres psql -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-trainingapp}"

echo "[CLEAN] Eliminando archivo temporal..."
rm -f "${LOCAL_FILE}"

echo "[DONE] ¡Base de datos local sincronizada exitosamente con produccion!"
echo "Ahora puedes ejecutar ./scripts/start-local.sh normalmente."

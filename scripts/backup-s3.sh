#!/bin/bash
# ==============================================================================
# Automated PostgreSQL Backup to AWS S3
#
# Requirements:
# - Run this script from the directory containing docker-compose.yml (or set DIR)
# - AWS CLI must be installed and configured (`aws configure`)
# - .env file must exist and contain POSTGRES_USER and POSTGRES_DB
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Load environment variables to get DB credentials
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found. Ensure you run this from the project root."
  exit 1
fi

if [ -z "$S3_BUCKET" ]; then
  echo "Error: S3_BUCKET is not set in .env file. Please add S3_BUCKET=s3://your-bucket-name"
  exit 1
fi

# Configuration
BACKUP_DIR="/tmp"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="db-backup-${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "[$(date)] Starting database backup..."

# Execute pg_dump inside the postgres container and compress it directly
# We use `docker compose exec -T` to prevent TTY errors when running in cron
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_PATH}"

echo "[$(date)] Backup created locally at ${BACKUP_PATH} ($(du -h "${BACKUP_PATH}" | cut -f1))"

# Upload to S3
echo "[$(date)] Uploading to S3 bucket: ${S3_BUCKET}..."
aws s3 cp "${BACKUP_PATH}" "${S3_BUCKET}/${BACKUP_FILE}"

# Clean up local file
echo "[$(date)] Cleaning up local backup file..."
rm "${BACKUP_PATH}"

echo "[$(date)] Backup completed successfully!"

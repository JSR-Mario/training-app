#!/bin/bash
# ==============================================================================
# Automated PostgreSQL Restore from AWS S3
#
# Usage: ./scripts/restore-from-s3.sh <s3-file-uri>
# Example: ./scripts/restore-from-s3.sh s3://my-bucket/db-backup-2026-06-25.sql.gz
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Error: Please provide the S3 URI of the backup file."
  echo "Usage: $0 s3://your-bucket/db-backup-YYYY-MM-DD.sql.gz"
  exit 1
fi

S3_URI=$1
LOCAL_FILE="/tmp/restore-db.sql.gz"

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found. Run this from the project root."
  exit 1
fi

echo "[$(date)] 1. Downloading backup from S3: ${S3_URI}"
aws s3 cp "${S3_URI}" "${LOCAL_FILE}"

echo "[$(date)] 2. Warning: This will overwrite existing data."
read -p "Are you sure you want to restore this database? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    rm -f "${LOCAL_FILE}"
    exit 1
fi

# We use -c (clean) implicitly by advising to restore on a clean DB, but if tables exist, 
# you might get "already exists" errors. For a clean slate, it's best to wipe volumes first.
echo "[$(date)] 3. Restoring database into postgres container..."
gunzip -c "${LOCAL_FILE}" | docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "[$(date)] 4. Cleaning up local downloaded file..."
rm -f "${LOCAL_FILE}"

echo "[$(date)] Restore completed!"

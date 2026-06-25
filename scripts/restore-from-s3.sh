#!/bin/bash
# ==============================================================================
# Automated PostgreSQL Restore from AWS S3
#
# Usage: ./scripts/restore-from-s3.sh <date-or-uri>
# Example 1: ./scripts/restore-from-s3.sh 2026-06-25
# Example 2: ./scripts/restore-from-s3.sh s3://my-bucket/db-backup-2026-06-25.sql.gz
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Error: Please provide a date (YYYY-MM-DD) or an S3 URI."
  echo "Usage: $0 2026-06-25"
  exit 1
fi

ARG=$1
LOCAL_FILE="/tmp/restore-db.sql.gz"

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found. Run this from the project root."
  exit 1
fi

if [[ "$ARG" == s3://* ]]; then
  S3_URI="$ARG"
else
  # Assume it's a date and find the file in S3
  if [ -z "$S3_BUCKET" ]; then
    echo "Error: S3_BUCKET is not set in .env file. Please add S3_BUCKET=s3://your-bucket-name"
    exit 1
  fi
  
  echo "[$(date)] Searching for backup on date: ${ARG} in ${S3_BUCKET}..."
  # List files, filter by date, take the latest one (tail -n 1), and extract the filename (awk)
  FILENAME=$(aws s3 ls "${S3_BUCKET}/" | grep "db-backup-${ARG}" | sort | tail -n 1 | awk '{print $4}')
  
  if [ -z "$FILENAME" ]; then
    echo "Error: No backup found for date ${ARG} in ${S3_BUCKET}."
    exit 1
  fi
  
  S3_URI="${S3_BUCKET}/${FILENAME}"
  echo "[$(date)] Found latest backup for that date: ${S3_URI}"
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

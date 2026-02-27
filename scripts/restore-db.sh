#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore-db.sh <backup-file>"
  exit 1
fi

BACKUP_FILE=$1

echo "⚠️  This will restore database from: $BACKUP_FILE"
echo "⚠️  Current data will be LOST!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted"
  exit 0
fi

echo "🔄 Restoring database..."

gunzip -c "$BACKUP_FILE" | docker exec -i insertflow-postgres psql -U postgres insertflow

echo "✅ Database restored successfully"

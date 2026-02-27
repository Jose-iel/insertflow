#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="$BACKUP_DIR/insertflow_$DATE.sql.gz"

echo "🔄 Starting database backup..."

mkdir -p "$BACKUP_DIR"

docker exec insertflow-postgres pg_dump -U postgres insertflow | gzip > "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

find "$BACKUP_DIR" -name "insertflow_*.sql.gz" -mtime +30 -delete

echo "🧹 Old backups cleaned"

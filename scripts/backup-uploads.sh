#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/uploads"
BACKUP_FILE="$BACKUP_DIR/uploads_$DATE.tar.gz"

echo "🔄 Starting uploads backup..."

mkdir -p "$BACKUP_DIR"

tar czf "$BACKUP_FILE" -C /app uploads

echo "✅ Backup created: $BACKUP_FILE"

find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +90 -delete

echo "🧹 Old backups cleaned"

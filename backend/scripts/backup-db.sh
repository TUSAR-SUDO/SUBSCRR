#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Subscrr — SQLite Zero-Downtime Hot Backup Script
#
# Uses SQLite's online backup API (.backup) to produce point-in-time snapshots
# without blocking readers or writers under WAL mode.
# Safe to run in a cron job (e.g. daily at 02:00 UTC).
# ==============================================================================

DB_PATH="${DB_PATH:-./data/subscrr.db}"
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/subscrr_backup_${TIMESTAMP}.db"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date -u)] Starting SQLite online backup for ${DB_PATH}..."

# Safe hot backup using SQLite online backup API
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Verify integrity of the created snapshot
INTEGRITY=$(sqlite3 "${BACKUP_FILE}" "PRAGMA quick_check;")
if [ "${INTEGRITY}" != "ok" ]; then
  echo "❌ Backup verification failed: ${INTEGRITY}"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "✅ Backup created successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Clean up snapshots older than RETENTION_DAYS
echo "🧹 Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "subscrr_backup_*.db" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "🎉 Backup process completed."

#!/usr/bin/env bash
# Logical backup of the Postgres database (T-263). Compressed custom-format dump + SHA-256, with retention.
#
#   DATABASE_URL=postgresql://… scripts/db-backup.sh          # uses the local pg_dump
#   BACKUP_VIA=docker PGDATABASE=talent_dev scripts/db-backup.sh   # local dev: pg_dump inside the compose container
#
# Env: OUT_DIR (default ./backups), RETAIN_DAYS (default 14). Managed Postgres keeps its own PITR backups;
# this is the independent copy the restore drill (scripts/db-restore-drill.sh) is run against.
set -euo pipefail

OUT_DIR="${OUT_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
mkdir -p "$OUT_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ "${BACKUP_VIA:-}" == "docker" ]]; then
  db="${PGDATABASE:?set PGDATABASE (e.g. talent_dev)}"
  file="$OUT_DIR/${db}-${stamp}.dump"
  docker compose exec -T postgres pg_dump -U "${PGUSER:-talent}" -d "$db" -Fc --no-owner > "$file"
else
  : "${DATABASE_URL:?set DATABASE_URL}"
  db="$(basename "${DATABASE_URL%%\?*}")"
  file="$OUT_DIR/${db}-${stamp}.dump"
  pg_dump "${DATABASE_URL%%\?*}" -Fc --no-owner -f "$file"
fi

# An empty or truncated dump is a failed backup.
[[ -s "$file" ]] || { echo "Backup failed: $file is empty" >&2; rm -f "$file"; exit 1; }
sha256sum "$file" > "$file.sha256"
echo "Backup written: $file ($(du -h "$file" | cut -f1))"

# Retention: drop dumps (and checksums) older than RETAIN_DAYS for this database.
find "$OUT_DIR" -maxdepth 1 -name "${db}-*.dump*" -mtime +"$RETAIN_DAYS" -print -delete

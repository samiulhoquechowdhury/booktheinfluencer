#!/usr/bin/env bash
# Restore drill (T-263): restore a dump into a throwaway database, verify it, then drop it.
# Never restores over the source: the target is always a separate scratch database.
#
#   BACKUP_VIA=docker scripts/db-restore-drill.sh [path/to.dump]     # local dev (compose container)
#   ADMIN_URL=postgresql://user:pass@host:5432/postgres scripts/db-restore-drill.sh backups/x.dump
#
# Env: OUT_DIR (where to find the latest dump, default ./backups), DRILL_DB (default talent_restore_drill),
# KEEP=1 to keep the restored database for inspection.
set -euo pipefail

OUT_DIR="${OUT_DIR:-./backups}"
DRILL_DB="${DRILL_DB:-talent_restore_drill}"
dump="${1:-$(ls -t "$OUT_DIR"/*.dump 2>/dev/null | head -1 || true)}"
[[ -n "$dump" && -s "$dump" ]] || { echo "No dump found (pass a path or run scripts/db-backup.sh first)" >&2; exit 1; }
[[ "$DRILL_DB" == *drill* ]] || { echo "Refusing: DRILL_DB must be a scratch database name containing 'drill'" >&2; exit 1; }
if [[ -f "$dump.sha256" ]]; then
  sha256sum -c --status "$dump.sha256" || { echo "FAIL: checksum mismatch for $dump (corrupt or altered)" >&2; exit 1; }
  echo "Checksum OK"
fi

if [[ "${BACKUP_VIA:-}" == "docker" ]]; then
  psql_() { docker compose exec -T postgres psql -U "${PGUSER:-talent}" -v ON_ERROR_STOP=1 -tA "$@"; }
  restore_() { docker compose exec -T postgres pg_restore -U "${PGUSER:-talent}" --no-owner --exit-on-error -d "$DRILL_DB" < "$dump"; }
  admin_db="postgres"
else
  : "${ADMIN_URL:?set ADMIN_URL (a connection to the server, e.g. …/postgres)}"
  psql_() { psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -tA "$@"; }
  restore_() { pg_restore --no-owner --exit-on-error -d "${ADMIN_URL%/*}/$DRILL_DB" "$dump"; }
  admin_db=""
fi

started=$(date +%s)
psql_ ${admin_db:+-d $admin_db} -c "DROP DATABASE IF EXISTS \"$DRILL_DB\";" >/dev/null
psql_ ${admin_db:+-d $admin_db} -c "CREATE DATABASE \"$DRILL_DB\";" >/dev/null
restore_
q() { psql_ -d "$DRILL_DB" -c "$1"; }

# Verify: migrations complete and match the repo, core tables readable.
latest_repo="$(ls packages/db/prisma/migrations | grep -E '^[0-9]{14}_' | sort | tail -1)"
latest_db="$(q "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1;")"
unfinished="$(q "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;")"
echo "Restored $dump into $DRILL_DB in $(( $(date +%s) - started ))s"
for t in User Talent Lead Booking Quote PaymentMilestone Payment Payout AuditLog; do
  printf '  %-17s %s rows\n' "$t" "$(q "SELECT count(*) FROM \"$t\";")"
done
echo "  migrations: latest $latest_db (repo: $latest_repo), unfinished: $unfinished"
status=0
[[ "$latest_db" == "$latest_repo" ]] || { echo "WARN: dump is behind the repo's migrations (expected for an older dump)"; }
[[ "$unfinished" == "0" ]] || { echo "FAIL: unfinished or rolled-back migrations in the dump" >&2; status=1; }

if [[ "${KEEP:-}" != "1" ]]; then psql_ ${admin_db:+-d $admin_db} -c "DROP DATABASE \"$DRILL_DB\";" >/dev/null && echo "Dropped $DRILL_DB"; fi
[[ $status == 0 ]] && echo "Restore drill PASSED" || echo "Restore drill FAILED"
exit $status

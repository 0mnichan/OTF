#!/usr/bin/env bash
# Back up the SQLite database from the running web container.
# The content tree lives in git; only the database (users, progress) needs this.
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="${1:-./backups}"
mkdir -p "$DEST"
# .backup gives a consistent copy even while the app is writing (WAL-safe).
docker compose -f "$(dirname "$0")/docker-compose.yml" exec -T web \
  sh -c 'node --experimental-sqlite -e "const{DatabaseSync}=require(\"node:sqlite\");const d=new DatabaseSync(process.env.OTF_DB_PATH);d.exec(\"VACUUM INTO \x27/data/backup.tmp\x27\");" && cat /data/backup.tmp' \
  > "$DEST/otf-$STAMP.db"
echo "Backup written to $DEST/otf-$STAMP.db"

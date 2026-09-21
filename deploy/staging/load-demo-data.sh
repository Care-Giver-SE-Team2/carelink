#!/usr/bin/env bash
# Loads demonstration data into the staging database, read from standard input.
#
# From the repository root on your own machine:
#
#   ssh -i ~/.ssh/care-link.pem ubuntu@HOST 'sudo /opt/carelink/load-demo-data.sh' \
#       < backend/src/main/resources/db/demo/demo-seed.sql
#
# Deliberately separate from the application's start-up. Demonstration data used
# to be a Flyway migration, which meant one bad INSERT stopped the whole service:
# Flyway runs inside the Spring context, records the failure, and then refuses to
# start on every subsequent boot until somebody clears the record. Run this way a
# failure prints here and the running system carries on.
#
# The seed inserts and never deletes, and is written to be safe to run again, so
# repeating this is harmless.
set -euo pipefail

cd /opt/carelink

if [ -t 0 ]; then
	echo "Nothing on standard input. Pipe the seed file in; see the header of this script." >&2
	exit 2
fi

# The password lives in .env, which is root-only; this script is run with sudo.
password=$(sed -n 's/^MYSQL_PASSWORD=//p' .env)
if [ -z "$password" ]; then
	echo "MYSQL_PASSWORD is not set in /opt/carelink/.env" >&2
	exit 1
fi

if ! docker compose ps --status running --services | grep -qx db; then
	echo "The db container is not running. docker compose ps" >&2
	exit 1
fi

# --table prints anything the script selects; the seed selects nothing, so silence
# on success is the expected outcome. Errors go to stderr and stop the script.
docker compose exec -T db \
	mysql --user=carelink --password="$password" --default-character-set=utf8mb4 carelink

echo "Demonstration data loaded. Accounts demo-alice, demo-ben, demo-cara (managers),"
echo "demo-daniel (caregiver), demo-fiona (family), demo-grace (elder); password Demo#2026."

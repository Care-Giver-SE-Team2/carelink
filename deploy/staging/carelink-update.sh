#!/usr/bin/env bash
# Pull-based rollout, run by carelink-update.timer once a minute.
#
# If the registry has a newer image behind the tag in .env, compose recreates the
# backend container; otherwise "up" is a no-op. The pipeline never logs into this
# machine: it moves the tag, then waits for /actuator/info to report the new commit.
# That keeps port 22 closed to everything except the team's own addresses.
set -euo pipefail
cd /opt/carelink

before=$(docker compose ps -q backend 2>/dev/null || true)

# Quiet on the happy path; a failed pull (registry down, tag not published yet) is
# logged and retried next minute rather than tearing anything down.
if ! docker compose pull --quiet backend; then
	echo "pull failed; keeping the running version"
	exit 0
fi

docker compose up -d --no-build --remove-orphans

after=$(docker compose ps -q backend 2>/dev/null || true)
if [ -n "$after" ] && [ "$before" != "$after" ]; then
	echo "rolled backend to $(docker compose images backend --format '{{.Repository}}:{{.Tag}} {{.ID}}' 2>/dev/null || echo 'new image')"
	# Old images accumulate one per rollout; keep only what is in use.
	docker image prune -f >/dev/null
fi

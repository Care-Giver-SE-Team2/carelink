#!/usr/bin/env bash
# One-time set-up of the staging VM (Ubuntu 24.04). Safe to run again: it only
# installs what is missing and never overwrites the generated secrets.
#
# From the repository root on your own machine:
#   scp -i ~/.ssh/care-link.pem -r deploy/staging ubuntu@HOST:/tmp/carelink-staging
#   ssh -i ~/.ssh/care-link.pem ubuntu@HOST 'sudo bash /tmp/carelink-staging/install.sh'
#
# Afterwards:
#   systemctl list-timers carelink-update.timer      when the next check runs
#   journalctl -u carelink-update -n 20              what the last checks did
#   docker compose -f /opt/carelink/docker-compose.yml ps
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
TARGET=/opt/carelink
IMAGE=ghcr.io/care-giver-se-team2/carelink:staging

if [ "$(id -u)" -ne 0 ]; then
	echo "run with sudo" >&2
	exit 1
fi

# 1. Docker Engine and the compose plugin from Docker's own repository
if ! command -v docker >/dev/null 2>&1; then
	export DEBIAN_FRONTEND=noninteractive
	apt-get update -qq
	apt-get install -y -qq ca-certificates curl >/dev/null
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
	systemctl enable --now docker >/dev/null
fi
usermod -aG docker ubuntu 2>/dev/null || true

# 2. The stack definition and the update job
install -d -m 755 "$TARGET"
install -m 644 "$HERE/docker-compose.yml" "$TARGET/docker-compose.yml"
install -m 755 "$HERE/carelink-update.sh" "$TARGET/carelink-update.sh"
install -m 644 "$HERE/carelink-update.service" "$HERE/carelink-update.timer" /etc/systemd/system/

# 3. Secrets: generated once on this machine, readable by root only, never printed
if [ ! -f "$TARGET/.env" ]; then
	(
		umask 077
		cat > "$TARGET/.env" <<-EOF
			MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
			MYSQL_PASSWORD=$(openssl rand -hex 24)
			CARELINK_IMAGE=$IMAGE
		EOF
	)
	echo "generated $TARGET/.env"
fi

# 4. Start checking the registry every minute (the first run fails harmlessly
#    until the pipeline has published the :staging tag)
systemctl daemon-reload
systemctl enable --now carelink-update.timer >/dev/null
systemctl start carelink-update.service || true

echo "installed. Next check: $(systemctl list-timers carelink-update.timer --no-legend | awk '{print $1, $2, $3}')"

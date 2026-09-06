# Staging deployment

One small VM runs the whole system: the application container (front end is inside
the jar) and a MySQL container with a persistent volume. No load balancer, no managed
database, no orchestration: the proposal positions CareLink as a proof of concept and
explicitly leaves scalability out of scope.

## How a change reaches staging

```
push to main
  └─ pipeline: build → test → scan → publish image  ghcr.io/…/carelink:<sha> and :staging
        └─ deploy-staging job: waits until http://<host>/actuator/info reports <sha>,
           then smoke-tests and runs the ZAP baseline scan against the live address

staging VM (every minute, carelink-update.timer)
  └─ docker compose pull backend        ← sees the :staging tag moved
     docker compose up -d               ← recreates only the backend container
```

The rollout is **pull-based**: the machine fetches the image, the pipeline never logs
into it. So port 22 stays open only to the team's own addresses, GitHub's runners need
no SSH key and no AWS credentials, and there is one less secret to leak.

Rollback is a tag move: re-tag an earlier `<sha>` image as `:staging` (or run
`promote-demo.yml` logic in reverse) and the timer rolls back within a minute.

## The machine

| Item | Value |
|---|---|
| Provider | AWS EC2, Singapore (ap-southeast-1) |
| Size | t3.small (2 vCPU, 2 GB), Ubuntu 24.04, 20 GB gp3 |
| Address | Elastic IP, stored as the GitHub variable `STAGING_HOST` |
| Firewall | 22 from the team's IPs only, 80 from anywhere, nothing else |
| Files | `/opt/carelink/{docker-compose.yml, .env, carelink-update.sh}` |
| Update job | `carelink-update.timer` → `carelink-update.service` (systemd) |

`.env` holds the two MySQL passwords, generated on the machine by `install.sh` and
never copied anywhere. The GHCR package must be public for the anonymous pull to work;
if it is ever made private, add `docker login ghcr.io` with a read-only token to
`install.sh`.

## Set-up (once) or re-install

```bash
scp -i ~/.ssh/care-link.pem -r deploy/staging ubuntu@<host>:/tmp/carelink-staging
ssh -i ~/.ssh/care-link.pem ubuntu@<host> 'sudo bash /tmp/carelink-staging/install.sh'
```

## Looking at it

```bash
ssh -i ~/.ssh/care-link.pem ubuntu@<host>
systemctl list-timers carelink-update.timer          # next check
journalctl -u carelink-update -n 30                  # what recent checks did
cd /opt/carelink && sudo docker compose ps           # containers and health
sudo docker compose logs -f backend                  # application log
```

Stop the instance in the AWS console when nobody needs it; the Elastic IP and the
database volume survive a stop, and a stopped instance costs only its disk.

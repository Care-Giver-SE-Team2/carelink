# CareLink

NUS-ISS SWE5006 Practice Module — Team 2. A collaboration platform for community home care.

A mobile-first responsive web application serving four kinds of user: the care manager on a
desktop console, and caregivers, family members and elders in a phone browser.

> **New to the codebase? Read [ARCHITECTURE.md](ARCHITECTURE.md) first.** It explains the
> package layout, where interfaces go, and which rules the build will reject. If you have
> only used `controller / service / repository` before, section 1 maps that onto what we
> use here.

---

## Status

All 27 use cases and the three scheduled jobs are implemented and running on the staging
server, which the pipeline updates on every push to main. On 28 October 2026, run #488 ran
1,792 unit and architecture tests, 863 MySQL integration tests and 1,217 front-end tests.

| | |
|---|---|
| Application | Session/CSRF authentication, role-specific portals and health probes |
| `shared/` | Security, error handling, business-threshold configuration |
| `identity/` | Reference implementation of the four layers, with unit tests |
| Manager | Real admission/certificate review, care plans, primary assignments, rostering/leave cover, incidents, spot checks and reports |
| Caregiver | Registration/application, certificate upload, assigned work, leave/settings, arrival/tasks/vitals/evidence/departure, incidents and attributed history |
| Family / elder | Binding and service applications, progress/reports/incident awareness; elder confirmation/disputes and emergency help |
| Schema | Flyway V1–V34; apply migrations rather than editing released scripts |
| Pipeline | Every push to main runs nine CI/CD jobs: tests including MySQL, quality and security gates, image delivery and staging checks |
| Known limitations | Work settings guide managers but are not an automatic rostering input; the full list is in the project report |

The acceptance scenarios for the caregiver workflows are in
[caregiver closeout acceptance](docs/caregiver/closeout-acceptance.md).

---

## Technology

| Layer | Choice |
|---|---|
| Front end | React 19, Vite 8, TypeScript 6 |
| Backend | Java 25, Spring Boot 4.1 |
| Database | MySQL 8.4 LTS, schema owned by Flyway |
| Testing | JUnit 6, ArchUnit, Testcontainers, Vitest |
| Pipeline | GitHub Actions, SonarQube Cloud, Trivy, gitleaks, OWASP ZAP |

---

## Getting started

Prerequisites: **JDK 25**, Node 22, Docker Desktop.

```bash
# database
docker compose up -d db

# backend, on http://localhost:8080
cd backend && ./mvnw spring-boot:run

# front end, on http://localhost:5173 (with /api proxied to the backend)
cd frontend && npm ci && npm run dev
```

Everyday commands:

```bash
cd backend
./mvnw verify                    # compile, unit tests, architecture tests, coverage
./mvnw verify -Pintegration      # adds integration tests (needs Docker)

cd frontend
npm run lint
npm run test                     # watch mode
npm run test:coverage            # single run with coverage
```

---

## Repository map

Where things live and what each place is for. The rules behind the layout are in
[ARCHITECTURE.md](ARCHITECTURE.md).

```
CareLink/
├─ backend/                      Spring Boot monolith; the built front end is packaged into its jar
│  └─ src/main/java/sg/nus/carelink/
│     ├─ identity/               login and accounts — the reference module, all four layers present
│     ├─ profile/                elder, caregiver, family member, binding, intake, credentials
│     ├─ careplan/               care plan tree and required credentials
│     ├─ rostering/              availability, absences, rostering runs and constraint checks
│     ├─ visit/                  visit state machine, tasks, vitals, evidence, elder confirmation
│     ├─ incident/               incidents, escalation log, family acknowledgement, spot checks
│     ├─ report/                 reports, value-added services, periodic caregiver reviews
│     ├─ notification/           subscriptions and notifications
│     └─ shared/                 security, error handling, request interceptor, config, audit
│  └─ src/main/resources/db/migration/   Flyway scripts V1–V34
│  └─ src/test/java/             unit tests, ArchUnit rules, *IT integration tests (need Docker)
├─ frontend/src/
│  ├─ routes/<role>/             manager, caregiver, family, elder pages; landing; not-found
│  └─ shared/                    api/client.ts (one fetch wrapper), components, theme
├─ deploy/staging/               what runs on the staging VM: compose, update timer, installer
├─ docs/                         design and acceptance notes per role, consolidated ERD, OpenAPI contract
├─ .github/workflows/            cicd-pipeline.yml, rollback.yml, docs-pages.yml, caregiver-acceptance.yml
├─ Dockerfile, docker-compose.yml
└─ ARCHITECTURE.md, README.md
```

Inside every module the folders are the same: `controller/` (HTTP in and out),
`application/` (use cases), `domain/model/` and `domain/repository/` (business rules and
ports, plain Java), `infrastructure/persistence/entity/`, `/repository/` and `/adapter/`
(the JPA entity, the Spring Data repository, and the adapter that implements the domain
port). Modules now contain their implemented use cases and published cross-module
application interfaces; keep each owner's boundaries and the architecture tests intact.

The schema is code. A table changes by adding the next unused `V<n>__<what>.sql`, never by
editing the database by hand: every environment (each developer's machine, the CI
containers, the staging VM) rebuilds the same tables from these scripts on start-up, and
the application refuses to start if its entities and the tables disagree.

---

## Pipeline

One workflow, `cicd-pipeline.yml`, nine jobs. **Anything independent runs in parallel;
`needs` expresses real dependencies and quality gates only, never queueing.**

```
        ┌─ Backend: build, all tests, ArchUnit, SAST  ─┐
push ───┼─ Frontend: lint, unit tests, build          ─┼──→ Quality gate ──┐
  PR    └─ Secret scanning (gitleaks)                 ─┘     5-8 minutes   │
                                                                           │ not on PRs
                        ┌─ Integration tests (Testcontainers + MySQL) ─────┴┐
                        └─ Dependency vulnerability scan (SCA) ─────────────┴──→ Build and
                                                                                publish image
                                                                                     │ main only
                                                                                     ▼
                                             Staging VM pulls the image; smoke test, DAST
                                                                                     │
                                                                                     ▼
                                                                          Pipeline summary
```

| Stage | Job | When |
|---|---|---|
| Fast feedback | Backend (unit/integration tests, ArchUnit, JaCoCo, Sonar quality gate) | Every PR and every push to main |
| Fast feedback | Frontend (lint, Vitest coverage, build) | Same |
| Fast feedback | Secret scanning across the whole history | Same |
| Gate | Quality gate — passes only when all three are green | A pull request is merged only when it is green |
| Deep verification | Integration tests; dependency scan (Trivy) blocking on HIGH and CRITICAL findings | main, nightly at 02:00 Singapore time, manual. Skipped on PRs |
| Delivery | Image to GHCR, tagged with the commit SHA, `latest` and `staging`; Trivy scans the image and reports to the Security tab | Pushes to main |
| Deployment | The staging VM pulls the `:staging` tag itself; the job waits for it to report the new commit, smoke-tests and runs the ZAP baseline scan against the live address (`deploy/staging/README.md`) | Pushes to main |
| Rollback | `rollback.yml`: points `:staging` back at an earlier commit's image and waits for the VM to report it. Code only; migrations stay applied | On demand |

The backend job runs `clean verify -Pintegration` before Sonar analysis so its JaCoCo
report includes both unit and MySQL integration coverage, including on pull requests.

**Build once, deploy many.** The image is built once in the delivery stage; deployment and
rollback only move a tag, so what runs is always a binary the pipeline already verified.

---

## Branching

Trunk-based: `main` is always deployable. Each change is a short-lived branch merged by pull
request once its checks pass; a direct push is reserved for urgent fixes, and the full
pipeline on main still gates it before anything reaches staging. Branch names:
`feature/<summary>`, `fix/<summary>`, `chore/<summary>`.

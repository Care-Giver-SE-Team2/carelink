# CareLink

NUS-ISS SWE5006 Practice Module — Team 2. A collaboration platform for community home care.

A mobile-first responsive web application serving four kinds of user: the supervisor on a
desktop console, and caregivers, family members and elders in a phone browser.

> **New to the codebase? Read [ARCHITECTURE.md](ARCHITECTURE.md) first.** It explains the
> package layout, where interfaces go, and which rules the build will reject. If you have
> only used `controller / service / repository` before, section 1 maps that onto what we
> use here.

---

## Status

The repository holds a working skeleton and a complete pipeline. **There is no business
functionality yet** — feature module boundaries are still being agreed.

| | |
|---|---|
| Application | Starts, serves health probes, authenticates against the database |
| `shared/` | Security, error handling, business-threshold configuration |
| `identity/` | Reference implementation of the four layers, with unit tests |
| Feature modules | Packages for profile, care plan, rostering, visit, incident, report, notification, with a validated JPA entity and repository per table; domain and application layers are each owner's next step |
| Schema | V1 accounts + V2 care domain, 37 tables merged from the four member submissions; no seed data |
| Pipeline | All nine jobs green, image published to GHCR, staging VM updated and scanned |
| Not yet wired | Branch protection (deferred until feature work starts) |

---

## Technology

| Layer | Choice |
|---|---|
| Front end | React 19, Vite 8, TypeScript 6 |
| Backend | Java 25, Spring Boot 4.1 |
| Database | MySQL 8.4 LTS, schema owned by Flyway |
| Testing | JUnit 5, ArchUnit, Testcontainers, Vitest |
| Pipeline | GitHub Actions, SonarQube Cloud, OWASP Dependency-Check, gitleaks, OWASP ZAP |

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
│  └─ src/main/resources/db/migration/   Flyway scripts: V1 accounts, V2 care domain (37 tables)
│  └─ src/test/java/             unit tests, ArchUnit rules, *IT integration tests (need Docker)
├─ frontend/src/
│  ├─ routes/<role>/             manager, caregiver, family, elder pages; landing; not-found
│  └─ shared/                    api/client.ts (one fetch wrapper), components, theme
├─ deploy/staging/               what runs on the staging VM: compose, update timer, installer
├─ docs/                         the four member submissions, merged ERD, OpenAPI contract
├─ .github/workflows/            cicd-pipeline.yml, rollback.yml, docs-pages.yml
├─ Dockerfile, docker-compose.yml
└─ ARCHITECTURE.md, README.md
```

Inside every module the folders are the same: `controller/` (HTTP in and out),
`application/` (use cases), `domain/model/` and `domain/repository/` (business rules and
ports, plain Java), `infrastructure/persistence/entity/`, `/repository/` and `/adapter/`
(the JPA entity, the Spring Data repository, and the adapter that implements the domain
port). Every module is filled the same way: per table a domain record, a port, an entity,
a Spring Data repository, a mapper and an adapter, each with a unit test; per module a
service and a controller. In `identity` these carry real behaviour; elsewhere they are a
generated, compiling, tested starting point that mirrors the V2 migration, for the module
owner to reshape. The order of work is in ARCHITECTURE.md, section 4.

The schema is code. A table changes by adding `V3__<what>.sql` next to V1 and V2, never by
editing the database by hand: every environment (each developer's machine, the CI
containers, the staging VM) rebuilds the same tables from these scripts on start-up, and
the application refuses to start if its entities and the tables disagree.

---

## Pipeline

One workflow, `cicd-pipeline.yml`, nine jobs. **Anything independent runs in parallel;
`needs` expresses real dependencies and quality gates only, never queueing.**

```
        ┌─ Backend: build, unit tests, ArchUnit, SAST ─┐
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
| Fast feedback | Backend (ArchUnit, JaCoCo, Sonar quality gate) | Every PR and every push to main |
| Fast feedback | Frontend (lint, Vitest coverage, build) | Same |
| Fast feedback | Secret scanning across the whole history | Same |
| Gate | Quality gate — passes only when all three are green | The single required check for branch protection |
| Deep verification | Integration tests; SCA blocking on CVSS ≥ 7 | main, nightly, manual. Skipped on PRs |
| Delivery | Image to GHCR, tagged with the commit SHA, `latest` and `staging` | Pushes to main |
| Deployment | The staging VM pulls the `:staging` tag itself; the job waits for it to report the new commit, smoke-tests and runs the ZAP baseline scan against the live address (`deploy/staging/README.md`) | Pushes to main |
| Rollback | `rollback.yml`: points `:staging` back at an earlier commit's image and waits for the VM to report it. Code only; migrations stay applied | On demand |

**Build once, deploy many.** The image is built once in the delivery stage; deployment and
rollback only move a tag, so what runs is always a binary the pipeline already verified.

---

## Branching

`main` is protected: changes arrive by pull request and the quality gate must be green.
Branch names: `feat/<module>-<summary>`, `fix/<summary>`.

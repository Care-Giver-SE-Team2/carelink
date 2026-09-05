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
| Schema | `app_user` and `user_role` only; no feature tables, no seed data |
| Pipeline | All nine jobs green, image published to GHCR, staging deployed and scanned |
| Not yet wired | SonarCloud token, NVD API key, branch protection |

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
                                                         Deploy to staging, smoke test, DAST
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
| Delivery | Image to GHCR, tagged with the commit SHA and `latest` | Pushes to main |
| Deployment | Start the stack, smoke test, ZAP baseline scan | Pushes to main |
| Promotion | `promote-demo.yml`, manual with a named approver | On demand |

**Build once, deploy many.** The image is built once in the delivery stage; staging and the
demo environment deploy that same binary and nothing is ever rebuilt at deployment time.

---

## Branching

`main` and `develop` are both protected: changes arrive by pull request and the quality
gate must be green. Feature branches target `develop`; `develop` merges to `main` at the
end of each sprint.
Branch names: `feat/<module>-<summary>`, `fix/<summary>`.

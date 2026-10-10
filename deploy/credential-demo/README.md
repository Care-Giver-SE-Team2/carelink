# Isolated credential upload demo

Default port 8085, project `carelink-credential-demo`, independent MySQL named volume.
Private files bind to **carelink/reports/credential-demo/private**, never the static web directory.
Do not run against staging or an old demo's database. Docker storage writes require user approval.

From repository root, with Docker Linux engine running:

```powershell
./scripts/start-caregiver-credential-demo.ps1
```

Normal build uses the repository's production Dockerfile, requiring build network access.
For the local offline fallback, first package a current jar **including frontend/dist** at
`reports/main-sync/credential-demo-build/backend/target/backend-0.0.1-SNAPSHOT.jar`, then:

```powershell
./scripts/start-caregiver-credential-demo.ps1 -UsePrebuiltJar
```

Fallback uses previously cached `carelink:caregiver-demo` runtime only, replacing the entire app jar;
it is not a production distribution and does not prove a new production image build.

Caregiver: **demo-exec-cg-a / Demo#2026**; another caregiver: **demo-exec-cg-b / Demo#2026**.
Existing synthetic manager **demo-exec-manager / Demo#2026** is solely a test actor for unchanged
MG06 APIs; this fixture is not a manager use-case implementation. Family test actor is
demo-exec-family with the same local-only password. Never use these credentials outside this demo.
Catalogue names explicitly contain Demo/fictional; ask the institution owner to configure real types.

Open `http://localhost:8085/caregiver/credentials` after sign-in. Upload new material, refresh,
open submitted detail/download, then verify review using existing manager APIs; manager attachment
preview UI still belongs to that owner. Reject/resubmit should preserve the original reason/files.
Publish a short-lived certificate using the existing API, then renew; pending/future-effective
renewal must retain the expiry reminder. Copy its document URL as the other caregiver/family to
confirm denial. Restart only this backend and check the same document remains downloadable.

Limits: 1–3 JPEG/PNG/simple PDF, 5 MiB each, images <=20 MP, PDF <=20 pages, no encryption/actions/
embedded files. PDF is downloaded, not automatically previewed. Uploading is not approval.
See [integration contract](../../docs/caregiver/credential-upload-contract.md) for actual endpoints,
database relationships, operating requirements and owner boundaries.

To stop this demo without losing facts/files:

```powershell
docker compose -f deploy/credential-demo/compose.yml stop
```

Never run `down -v` or remove the private directory as an upgrade/reset step. Preserve DB and
private files together for backups. All local demo material is fictional and the files/logs are ignored
by Git; source fixtures and configuration are tracked.

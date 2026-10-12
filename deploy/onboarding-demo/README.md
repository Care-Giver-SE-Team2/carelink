# Isolated caregiver admission/work demo (8086)

Use only fictional data. New Compose project `carelink-onboarding-demo`, new MySQL volume, and project-local private files under `reports/onboarding-demo/private`. It does not replace 8081–8085 volumes or approve an existing applicant.

The default compose file uses a prebuilt frontend-containing jar at `reports/main-sync/onboarding-demo-build/backend/target/backend-0.0.1-SNAPSHOT.jar` and the existing local development runtime image. For a source build, override the Dockerfile:

```powershell
New-Item -ItemType Directory -Force reports/onboarding-demo/private/credentials,reports/onboarding-demo/private/evidence,reports/onboarding-demo/private/multipart
docker compose -f deploy/onboarding-demo/compose.yml -f deploy/onboarding-demo/compose.source.yml up -d --build
```

On Linux, make these project-local private directories writable by the image user before startup. Docker writes to its own storage require the user's approval. Do not use these local-only passwords/settings in staging or production.

## Manual review

1. Open `http://localhost:8086/caregiver/register`, use fictional details, and submit without certificates.
2. Sign in. Application must say ONBOARDING/PENDING. Only application, credentials and settings navigation are offered; manually entering a work URL must not grant work access.
3. Edit and save an application. Save a date declaration and preference, reload and inspect. The UI explicitly says settings are not yet consumed by rostering; saving does not create or cancel a Visit.
4. Manager admission HTTP/UI is a separate owner's follow-up. Zero-certificate approval is verified through the real application port in `CaregiverAdmissionIT`, not a mock UI or SQL approval.
5. For an already-active fictional caregiver with a assigned Visit, check in, open evidence images, select a generated JPEG/PNG fixture and upload. Verify Unverified and server time. Check out with tasks still Pending. New uploads must then be unavailable.
6. Open My history. Only attributed own commands/materials should appear. A replacement caregiver cannot use the original uploader's historical download route.

## Local run record, 2026-10-12/13

- `demo-onboarding` / `DemoOnly2026!`: registered through the actual browser, zero certificates, still PENDING. Availability saved and viewed. Do not treat this as manager approval.
- `demo-onboarding-active` / `Demo#2026`: explicitly seeded legacy-active compatibility fixture, no application and no manager account. Visit 1 started through the browser; two generated 2×2 test images were saved through the real multipart endpoint, then checked out with its task PENDING.
- The automated file chooser initially failed to select a file. On 2026-10-13 the user completed the real browser flow on Visit 2 and confirmed **Evidence saved — Unverified**. This is user-confirmed manual acceptance, separate from the earlier API upload checks.
- Visit 2 is a separate checked-in fictional fixture for that manual check. Sign in as `demo-onboarding-active`, open `http://localhost:8086/caregiver/visits/2/evidence`, scroll below the explanation and click **Add evidence image** to expand the form. Under **Evidence image**, select `reports/onboarding-demo/fictional-evidence.png`, then click **Upload image** and confirm `Evidence saved — Unverified`. The pending `demo-onboarding` account cannot perform this work action. Completed Visit 1 has no upload button. No real image is needed.
- Database and private directories were backed up together with writes stopped. Both images passed hash/size reconciliation; after restart and after restoration into a separate 8087 instance, authenticated downloads and completed Visit 1/history remained correct. On 2026-10-13, the user requested Docker cleanup: obsolete recovery and earlier demo containers/images were removed, while every database volume, private directory and paired backup was preserved. Recovery containers can be recreated using Compose after rebuilding the required image. Local backups remain ignored under `reports/onboarding-demo`.
- After the manual upload, a fresh paired backup reconciled all three images. The final local frontend/backend build was deployed to 8086; its runtime jar hash matched the packaged artifact. Authenticated reads and the browser confirmed that Visit 2's manually uploaded image survived the restart.
- Final type checking, source lint and production build succeeded. On 2026-10-13, the resumed incremental frontend run passed 284 tests across 27 files, including previously failing manager/family workflows. The subsequent full single-worker coverage run passed all 1,143 tests across 98 files (516.82 seconds), with 91.8% line and 83.83% branch coverage. Logs: `reports/main-sync/onboarding-resume-frontend-incremental-20261013.log` and `reports/main-sync/onboarding-resume-frontend-full-20261013.log`. Existing React act warnings remain; no assertions, timeouts or coverage rules were relaxed. These are local checks; hosted CI has not run for this uncommitted batch.
- Both 8086 containers were already stopped when Docker cleanup began and remain retained/stopped. Start the latest demo with `docker compose -f deploy/onboarding-demo/compose.yml up -d --wait` when needed; its database volume and private files remain intact.
- Full regression, backups/restart and any outstanding checks are recorded in the external plan 016. No push or remote CI is implied.

Do not run `down -v` or delete private evidence to reset the demo. Preserve the DB and file directory together; use the read-only reconciliation procedure in `docs/caregiver/evidence-history-handoff.md`.

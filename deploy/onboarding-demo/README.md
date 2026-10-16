# Isolated caregiver admission/work demo (8086)

Use only fictional data. New Compose project `carelink-onboarding-demo`, new MySQL volume, and project-local private files under `reports/onboarding-demo/private`. It does not replace 8081–8085 volumes or approve an existing applicant.

The default Compose file builds the repository's root Dockerfile, including the frontend and all three API YAML files. It does not require an old local runtime image or a separately packaged JAR. `compose.source.yml` remains a compatible, optional override.

```powershell
New-Item -ItemType Directory -Force reports/onboarding-demo/private/credentials,reports/onboarding-demo/private/evidence,reports/onboarding-demo/private/multipart
$env:CARELINK_DEMO_REVISION = (git rev-parse --short HEAD)
if (git status --porcelain) { $env:CARELINK_DEMO_REVISION += '-dirty' }
docker compose -f deploy/onboarding-demo/compose.yml up -d --build --wait
```

On Linux, make these project-local private directories writable by the image user before startup. Docker writes to its own storage require the user's approval. Do not use these local-only passwords/settings in staging or production.

## Manual review

1. Open `http://localhost:8086/caregiver/register`, use fictional details, and submit without certificates.
2. Sign in. Application must say ONBOARDING/PENDING. Only application, credentials and settings navigation are offered; manually entering a work URL must not grant work access.
3. Edit and save an application. Save a date declaration and preference, reload and inspect. All declarations, including Unavailable, are for the manager's manual reference only; automatic rostering does not consume them. Saving does not create or cancel a Visit. Only approved leave blocks scheduling within these declarations/leave rules.
4. Manager admission HTTP/UI is connected on main (#100). Use an existing authorized manager account to approve the real pending application without certificates, then refresh the caregiver application/profile. Certificate decisions are independent. Do not simulate approval with SQL or create a manager demo account. If no authorized account is available, record human cross-role acceptance as pending; `ManagerCaregiverApplicationIT` covers the actual HTTP path in an isolated database.
5. For an already-active fictional caregiver with a assigned Visit, check in, open evidence images, select a generated JPEG/PNG fixture and upload. Verify Unverified and server time. Check out with tasks still Pending. New uploads must then be unavailable.
6. Open My history. Only attributed own commands/materials should appear. A replacement caregiver cannot use the original uploader's historical download route.

## Local run record, 2026-10-12/13

- `demo-onboarding` / `DemoOnly2026!`: registered through the actual browser, zero certificates, still PENDING. Availability saved and viewed. Do not treat this as manager approval.
- `demo-onboarding-active` / `Demo#2026`: explicitly seeded legacy-active compatibility fixture, no application and no manager account. Visit 1 started through the browser; two generated 2×2 test images were saved through the real multipart endpoint, then checked out with its task PENDING.
- The automated file chooser initially failed to select a file. On 2026-10-13 the user completed the real browser flow on Visit 2 and confirmed **Evidence saved — Unverified**. This is user-confirmed manual acceptance, separate from the earlier API upload checks.
- Visit 2 is a separate checked-in fictional fixture for that manual check. Sign in as `demo-onboarding-active`, open `http://localhost:8086/caregiver/visits/2/evidence`, scroll below the explanation and click **Add evidence image** to expand the form. Under **Evidence image**, select `reports/onboarding-demo/fictional-evidence.png`, then click **Upload image** and confirm `Evidence saved — Unverified`. The pending `demo-onboarding` account cannot perform this work action. Completed Visit 1 has no upload button. No real image is needed.
- Database and private directories were backed up together with writes stopped. Both images passed hash/size reconciliation; after restart and after restoration into a separate 8087 instance, authenticated downloads and completed Visit 1/history remained correct. On 2026-10-13, the user requested Docker cleanup: obsolete recovery and earlier demo containers/images were removed, while every database volume, private directory and paired backup was preserved. Recovery containers can be recreated using Compose after rebuilding the required image. Local backups remain ignored under `reports/onboarding-demo`.
- After the manual upload, a fresh paired backup reconciled all three images. The final local frontend/backend build was deployed to 8086; its runtime jar hash matched the packaged artifact. Authenticated reads and the browser confirmed that Visit 2's manually uploaded image survived the restart.
- Final type checking, source lint and production build succeeded. On 2026-10-13, the resumed incremental frontend run passed 284 tests across 27 files, including previously failing manager/family workflows. The subsequent full single-worker coverage run passed all 1,143 tests across 98 files (516.82 seconds), with 91.8% line and 83.83% branch coverage. Logs: `reports/main-sync/onboarding-resume-frontend-incremental-20261013.log` and `reports/main-sync/onboarding-resume-frontend-full-20261013.log`. Existing React act warnings remain; no assertions, timeouts or coverage rules were relaxed. Hosted CI and merge status are tracked on [PR #99](https://github.com/Care-Giver-SE-Team2/carelink/pull/99).
- Both 8086 containers were already stopped when Docker cleanup began and remain retained/stopped. Start the latest demo with `docker compose -f deploy/onboarding-demo/compose.yml up -d --wait` when needed; its database volume and private files remain intact.
- Local regression, backups/restart and outstanding checks are recorded in the external plan 016; use PR #99 for the hosted checks on the final published commit.

Do not run `down -v` or delete private evidence to reset the demo. Preserve the DB and file directory together; use the read-only reconciliation procedure in `docs/caregiver/evidence-history-handoff.md`.

## Closeout acceptance (plan 017)

Before rebuilding an existing demo, stop application writes and back up its database and the complete `reports/onboarding-demo/private` directory together. Keep the old image ID for recovery. Recreate only the backend against the same database and private directory, then verify previous authenticated image downloads and hashes. `/actuator/info` reports the build revision (with `-dirty` for local modifications); it is not proof of a published commit.

Use `docs/caregiver/closeout-acceptance.md` for the full checklist and unresolved owner handoffs. Earlier dated results above remain historical and do not certify the new build.

### Local closeout run, 2026-10-16

- Root-image build reports `d6f3656-dirty`. Three API YAML files match validated source;
  UID 1001 can write a fresh evidence volume. The temporary empty test volume was removed.
- The previous three fictional images were backed up before upgrade; an additional
  Visit 2 image was uploaded through the real endpoint. All four retained their hashes
  after backend recreation. Pending applicants were denied these private downloads.
- Visit 2 was checked out during browser testing of the original native confirmation.
  It is now COMPLETED and its upload control is intentionally absent; earlier Visit 2
  upload instructions above describe the historical run.
- The final implementation uses an explicit on-page decision instead of the native
  browser confirmation for checkout. A separate `CLOSEOUT_DRAFT_DEMO` Visit 3 was created
  as a fictional legacy fixture for the existing active caregiver and checked in through
  HTTP. The browser confirmed Continue editing retained the draft, then Check out without
  saving completed Visit 3 with its task still PENDING and no task/health draft submission.
  This fixture is not evidence of a manager-created assignment or admission decision.
- All three visits are now COMPLETED. Use their images/history for read-only review;
  a new upload demonstration needs a new genuinely assigned, checked-in visit. Do not
  reset their statuses with SQL. Existing fixture credentials remain those listed above.
- Browser checks also covered restored history filters, schedule/evidence date links,
  390px menu reachability and Escape focus restoration. Viewport override was reset.
- Final paired backup: `reports/onboarding-demo/backup-20261016-230932`, four referenced
  images, zero reconciliation issues/deletions. Final test totals and owner handoffs
  remain in external `files/PLAN/017-plan.md`; no local result implies new hosted CI.

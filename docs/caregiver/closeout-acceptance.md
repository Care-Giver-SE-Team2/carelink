# Caregiver closeout acceptance — plan 017

Baseline main: `d6f3656`, 2026-10-16. This checklist is for the local closeout branch.
Run results belong in external `files/PLAN/017-plan.md` with project-local logs; an
unchecked scenario below is not an acceptance claim. Main's prior green CI does not
validate uncommitted changes.

## Agreed rules

- Admission and individual certificates are independent. Zero-certificate applicants
  may be admitted; service-specific qualification requirements still apply.
- Availability and preferences (including declared UNAVAILABLE) are manual references.
  Automatic rostering does not consume them. Existing account, certification, travel
  and time-clash checks still apply. A missing manager settings-view entry is an owner
  handoff, not a reason to integrate preferences into the algorithm.
- Within these time-declaration/leave rules, only APPROVED leave is a hard restriction.
  PENDING/REJECTED does not grant absence. Manager approval and replacement cover are
  separate outcomes; the approval label never proves cover exists.
- Published visits take effect without caregiver acceptance or rejection.
- The default late threshold is strictly more than ten minutes. SYS03 retains alerts
  without preventing otherwise valid check-in; the approved latest arrival remains
  scheduled end (inclusive), or Singapore day end if no end exists.
- Check-out records actual departure and COMPLETED without task/vital/image completeness
  or extra approval. Actual drafts show an on-page choice: Continue editing retains them;
  Check out without saving explicitly departs. This is not an approval workflow.
- Elder CONFIRMED changes Visit to VERIFIED; a dispute follows the incident path.
  Individual uploaded images remain UNVERIFIED independently.

## Manual scenarios

Use fictional details/images and authorized existing role accounts. Never approve by
SQL or create an unrequested manager account. Isolated automated test identities are
not human demo accounts. Record an unavailable role as pending rather than passed.

| Step | Actions and observable result |
|---|---|
| Register | Submit no certificates, sign in: pending application, restricted work access |
| Review admission | Existing manager approves real application; caregiver refresh gains work menus, certificates not auto-approved |
| Reject/resubmit | Manager rejects another application; caregiver sees reason, edits and resubmits |
| Certificates | Upload fictional file, review separately, refresh caregiver state; rejection/renewal readable; no admission side effect |
| Schedule | Manager assigns a qualified primary caregiver and publishes plan; correct caregiver sees work pack |
| Reference hours | Save an unavailable/preferred window; assignment outside it remains executable, with no accept/reject flow |
| Leave | Pending/rejected does not authorize absence; approved is separate from cover/re-rostering outcome |
| Reassignment | Change/remove primary or deactivate: future untouched visits release, old caregiver loses write access; own attributed past materials stay within policy |
| Arrival | Normal, late and post-SYS03 valid-window arrivals record time; no duplicate incident/notification from retries |
| Record | Save tasks, readings and health note, upload image, refresh: real values and Unverified image persist |
| Draft departure | Edit task or health value, click Check out, cancel: draft remains. Confirm: COMPLETED without automatically submitting drafts or changing pending tasks |
| Elder review | Confirm completed service: VERIFIED in caregiver view/history, no new work actions, image remains UNVERIFIED; test dispute separately |
| Navigation | Filter schedule, open work pack → evidence → work pack → schedule: dates survive. Filter history, page, open detail, page facts, return: list filters/page survive |
| Mobile | At narrow width open Menu, reach all pages; focus stays in sheet; Escape closes it and restores focus; pending applicant sees only permitted entries |
| Access/retry | Another caregiver denied private image; timeout retry retains key/payload; loss of access removes protected drafts/details |
| Other handoffs | Report CG04 incident and reply to a concluded spot check; manager sees existing upstream results without duplicate family sends |

## Delivery image checks

Build the root Dockerfile with a truthful GIT_SHA (`<base>-dirty` for local edits).
Anonymous GET of `/openapi.yaml`, `/openapi-draft.yaml`, `/caregiver-self-service.yaml`
must succeed; validate local references, not only HTTP status. As the image's non-root
user, upload and privately download a fictional image, verify hash/size, recreate the
backend using the same storage and database, then repeat the download. Keep paired DB,
certificate and evidence backups; never reset with `down -v`.

Source staging configuration now includes `evidence-files:/app/private/evidence`.
Confirm existing production files/storage overrides with the deployment owner before
remote rollout; changing this repository does not migrate old files or apply the stack.
ImageKit covers certificates only. Tests use local storage or a mocked provider; real
cloud upload/credentials are not part of this closeout.

## Outstanding owners / deferred scope

- Manager: authorized manual settings viewer and agreed service-code catalog. No
  public cross-caregiver read endpoint is introduced by this caregiver closeout.
- Report owner: consume existing `visit.health_flag`/`health_note`; current facts read
  actual `vital_sign` and task notes. Do not create duplicate health fields.
- Evidence verification role/rules if required; service confirmation is not image review.
- CG06 export, offboard access, retention policy; browser Back draft guard beyond the
  current close/unload/link handling; no global router migration in this batch.
- Family email/reminder enhancements remain separate owners' draft PRs.

## Local execution record — 2026-10-16

Plan 017 local code/image checks are complete. Node 22/Linux passed all 1,196 frontend
tests (101 files), 91.96% line / 84.06% branch coverage. Windows/Node 24's full run still
timed out on one existing manager workflow; isolated recheck and the Linux full run
passed without changing its assertions or deadline. This does not identify one proven
cause or constitute a new hosted CI result.

Backend verification passed 1,700 unit/architecture tests. Of 850 MySQL tests, the first
run passed 832 and found 18 execution/health fixtures generating a midnight-crossing
plan when run at night. Those three suites now use a consistent fixed daytime clock
(including GPS/report dates), and all 18 passed recheck with the original coverage gate.
This is full-suite plus affected-suite recheck evidence, not a second complete MySQL run.

The root image preserved four fictional images across backend recreation, denied pending
account reads, and served exactly the validated API files and final built JS/CSS. Browser
checks verified dates/history return filters, 390px menu/focus, and on-page checkout
cancel/confirm without automatically saving drafts. Visit 2 and the separate fictional
Visit 3 are now COMPLETED; do not reset them with SQL to make upload buttons reappear.

See external plan 017 and project-local logs/screenshots for actual results. The table
above remains a joint acceptance checklist: manager/elder/family manual steps not performed
in this run, settings viewing, report health-text projection and remote rollout remain
explicit owner handoffs. No push, PR or merge was performed during the local execution
recorded above. Publishing was authorized on 2026-10-17; hosted checks and merge status
are tracked in the associated PR and external plan 017.

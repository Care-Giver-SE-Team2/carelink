# FM05 notification email preparation (9.1)

A family member can maintain and prove possession of their own notification email at `/family/notification-email`, linked from Account. The API is implemented in `docs/api/openapi.yaml`: GET/POST/DELETE `/family/notification-email` and POST `/family/notification-email/verify`. Session identity and the current enabled FAMILY profile select the record; commands use the existing CSRF cookie/header. A contact requires no elder binding; future incident delivery still requires authorization for the incident's elder.

This batch sends **verification emails only**. Incident email channels, retry jobs and external-provider acceptance belong to later batches. The existing incident Subject/Observer, event production, in-app inbox, manager routing and read/view/awareness facts are unchanged. Account/profile schema and other use cases are not rewritten.

## Contact rules and persistence

`family_notification_email` is FM05-owned. A verified address becomes pending immediately when successfully changed or resent. A random 256-bit one-time code is mailed; only SHA-256 is stored. Codes expire at 15 minutes, and requests have a one-minute per-family cooldown. Removing an address clears proof and code, retaining the cooldown timestamp. Wrong, expired, consumed and cross-family codes give the same `EMAIL_VERIFICATION_INVALID` 409. The API never exposes family IDs, the raw code or hash; verification timestamps are server time in Singapore, normalized to stored precision.

Write transactions create/lock one contact row, so concurrent first requests cannot bypass the cooldown or overwrite confirmation. SQL and SMTP failure do not report a successful change. SMTP rejection rolls back the proposed address, preserving previous proof. The SMTP transaction has bounded connection/read/write timeouts (5/3/5 seconds). SMTP and database commits are not atomic: SMTP may accept a message before a later database commit fails, leaving an unusable code. There is no outbox, automatic retry or exactly-once promise for verification mail. Retry only explicitly; a successfully resent code invalidates the prior one.

The frontend rechecks the live family account before commands, disables overlapping writes and aborts requests on exit. Access denial clears contact and entered code; failures never display a fabricated verified status. No email/code is saved in browser storage. Mail contains only verification instructions, no clinical data or care links.

The new, not permanently deployed migration is `V17_1__family_notification_email.sql` (version 17.1) on current main V17. It leaves SYS03's V18 free, and can deploy before it. Before merging, compare the latest main and deployed history: if a higher version has already deployed, renumber this unexecuted migration before deployment. Never rewrite a permanently applied migration or enable global out-of-order as a shortcut. See [Flyway version ordering](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/versioned-migrations).

## SMTP configuration

Defaults leave mail disabled. Existing deployments start without a mail server; GET reports `configured: false`, sending returns 503 and cannot activate an address. Verification and removal do not require a running SMTP server.

Set `FAMILY_EMAIL_ENABLED=true`, `FAMILY_EMAIL_FROM`, `SPRING_MAIL_HOST` and `SPRING_MAIL_PORT` in the deployment environment. Configure SMTP authentication/TLS using Spring Mail configuration for the actual provider; never store credentials in Git. Host or sender configuration alone does not prove external delivery. Boot's mail starter creates the sender when a host is supplied; see [official Spring email configuration](https://docs.spring.io/spring-boot/reference/io/email.html).

For local validation, [Mailpit](https://mailpit.axllent.org/docs/api-v1/) captures mail on SMTP 1025 and exposes its inbox/API on HTTP 8025. Tests pin `axllent/mailpit:v1.31.4`, use fictional `example.test` recipients and do not configure external relay. Real HTTP login/CSRF, MySQL and SMTP tests exercise possession, expiry, change/resend/removal, family isolation, current account authorization, concurrency, unavailable configuration, SMTP rejection and database failure. No internal SMTP mock is used.

Local SMTP capture establishes that the server accepted the verification message. It does not establish public mailbox delivery, reading or incident awareness.

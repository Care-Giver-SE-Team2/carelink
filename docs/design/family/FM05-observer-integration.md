# FM05 incident event / family observer integration

Implemented: the event contract, Observer subject and interface, after-commit bridge, family observer, safe IN_APP message creation, persistent deduplication/outcomes, and personal response windows. Existing incident routing, old notification generators, notification controllers and the bell are unchanged. Production sources do not yet call this contract; consumer transaction tests are not a CG04 end-to-end acceptance test.

## Producer handoff

Inject `sg.nus.carelink.incident.application.IncidentFamilyEvents`. Inside the **write transaction** that saves/routes the incident, publish the corresponding fact:

```java
// New incident, after its persisted ID and final routed elder are known:
events.raised(eventId, incidentId, elderId, occurredAt);

// Escalation chain exhausted, after UNRESOLVED_ESCALATED is persisted:
events.unresolved(eventId, incidentId, elderId, occurredAt);
```

`eventId` is a UUID owned by the producer; `occurredAt` is an OffsetDateTime of the original fact. Keep both stable on replay. No caller identity, family ID, notification text or clinical description is accepted. The bridge normalizes offsets and microsecond precision; reusing an ID with different facts is rejected by the consumer. Calls outside a write transaction fail immediately. Ordinary manager handovers are not family broadcast events.

The publisher registers a callback and dispatches only after successful commit. The subject targets `IncidentEventObserver`, not a particular notifier. Runtime failure in one observer does not block another or turn the already committed source into a failed save. The family consumer uses independent transactions; each recipient rechecks current binding, enabled account and FAMILY role before a new delivery. FULL and READ_ONLY qualify. Optional subscriptions do not disable urgent alerts.

```mermaid
flowchart LR
  A[Incident write transaction] --> B[IncidentFamilyEvents]
  B --> C[After commit]
  C --> D[IncidentEventSubject]
  D --> E[IncidentEventObserver]
  E --> F[FamilyIncidentAlertObserver]
  F --> G[Existing notification table]
  F --> H[FM05 outcomes and personal window]
```

The original routing author must call this contract at the raised/chain-exhausted positions **and remove only the corresponding old direct family notification generation in the same integration**. Preserve manager/caregiver messages and existing inbox/bell functionality. Do not activate both family generators. CG04's HTTP report creation remains its owner's responsibility; FM05 does not call that HTTP endpoint. Bell navigation to `/api/family/incidents/{id}`'s family page remains a separate owner handoff.

## Persistence and failure semantics

Flyway `V14__family_alert_delivery.sql` adds three FM05 tables without modifying existing tables or historical rows:

| Table | Meaning |
| --- | --- |
| `family_alert_event` | Stable event facts and the last processing outcome: PROCESSED, NO_RECIPIENTS or FAILED |
| `family_alert_delivery` | One IN_APP result per event/family, including skipped or failed recipients and safe reason codes |
| `family_alert_window` | First successfully created message and immutable openedAt/acknowledgeBy per incident/family |

Recipient delivery serializes on the event/family unique key using a locking current read. The message, successful delivery row and first window commit together. A failure rolls them back; a separate transaction records FAILED, while other recipients continue. Successful recipients are never recreated on replay; failed or skipped recipients can be re-evaluated when the producer explicitly replays the same event. The outcome tables store IDs, times and fixed reason codes, not descriptions or acknowledgement notes. If outcome storage itself is unavailable, the remaining evidence is a safe log with event ID, family ID and exception type; it cannot be reported as a durable failure record.

Messages use the existing uppercase `INCIDENT`, `IN_APP` and `PENDING` values. The existing inbox transitions them to SENT; SENT means available in the inbox, not read or acknowledged. Titles/bodies use only severity/category or a generic chain-exhausted explanation, never raw description, location, internal logs or staff IDs. The severity/category are read from the persisted incident at consumption time.

The first successful creation opens the default two-hour personal window; `carelink.family-alert.response-window` can override the positive ISO duration (for example `PT45M`). The start is creation time, not event occurredAt, inbox polling time or manager respondBy. Another event, inbox delivery, replay or notification read does not reset it. `GET /api/family/incidents/{id}` returns this current family's deadline, or null if no FM05 window exists. Historical notifications are not backfilled into windows.

Creating a message/window never inserts or alters `incident_acknowledgement`. Existing viewedAt, acknowledgedAt and responseNote remain intact, including acknowledgement before message creation. Future reminder logic must additionally require an absent acknowledgedAt; the existence of a window does not put an already acknowledged family back into waiting. Reminders and family transfer are not implemented here.

This is an in-process after-commit design, without an outbox or a persistent event dispatcher. Outcome/deduplication persistence does not guarantee recovery from a process crash between source commit and callback processing. Keep production activation pending the producer/old-family-sender handoff.

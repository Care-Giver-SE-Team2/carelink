/**
 * The incident module's contract, field for field as the backend publishes it
 * (`docs/api/openapi-draft.yaml`, tag Incidents).
 *
 * Every timestamp is a string and stays one. The backend sends `LocalDateTime`,
 * which is rendered as `2026-09-21T15:55:49.849359769` with no offset and a
 * fractional part whose length depends on who wrote the row. Typing these as
 * `Date` would invite `new Date(value)`, which reads that text in whatever zone
 * the browser happens to be in — eight hours out on a CI machine set to UTC.
 * See `presentation.ts` for how they are turned into something readable.
 *
 * @author Wang Ziyu
 */

export type IncidentSource = 'CAREGIVER' | 'ELDER_SOS' | 'SYSTEM_MISSED_CHECKIN'
export type IncidentCategory = 'SOS' | 'MEDICAL' | 'FALL' | 'SERVICE' | 'OTHER'
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export type IncidentStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'UNRESOLVED_ESCALATED'

export type ContactChannel = 'PHONE' | 'PUSH' | 'EMAIL'
export type ContactOutcome = 'REACHED' | 'NOT_REACHED'

export type ResolutionOutcome = 'HANDLED_ON_SITE' | 'REFERRED_TO_MEDICAL_CARE' | 'FALSE_ALARM'

/** Where a rung of the escalation chain stands right now. */
export type EscalationState = 'PENDING' | 'CURRENT' | 'TIMED_OUT' | 'SKIPPED_UNAVAILABLE' | 'CLAIMED'

/**
 * A care exception.
 *
 * `responderUserId` and `respondBy` are both nullable and are null together: an
 * elder's SOS is recorded before anything routes it, so an incident with nobody
 * named on it and no countdown is a real state of the queue, not a broken row.
 */
export interface Incident {
  id: number
  elderId: number
  visitId: number | null
  reportedByUserId: number | null
  responderUserId: number | null
  source: IncidentSource
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  latitude: number | null
  longitude: number | null
  locationText: string | null
  description: string | null
  respondBy: string | null
  reportedAt: string
  resolvedAt: string | null
}

/** One page of the manager's queue. */
export interface IncidentQueue {
  items: Incident[]
  page: number
  size: number
  totalElements: number
}

export interface IncidentQueueQuery {
  page: number
  size: number
  status?: IncidentStatus
  severity?: IncidentSeverity
}

/**
 * One line of the audit timeline. Nothing is filtered out on the way here: a
 * refused take-over and a failed call to the family are the entries that matter
 * when somebody asks months later what was done.
 */
export interface TimelineEntry {
  actor: string | null
  action: string
  detail: string | null
  occurredAt: string
}

export interface IncidentDetail {
  incident: Incident
  suggestedPlaybookCode: string | null
  timeline: TimelineEntry[]
}

/** One rung. A rung nobody fills is still listed, so the gap stays visible. */
export interface EscalationLevel {
  position: number
  tier: string
  responderUserId: number | null
  responderName: string | null
  countdownMinutes: number
  state: EscalationState
}

/**
 * The chain as it would be walked right now — a plan, not a record. Asking twice
 * can give two answers if the roster moved in between, which is why the backend
 * returns `assembledAt` and `assembledFrom` alongside the levels.
 */
export interface EscalationChain {
  incidentId: number
  assembledAt: string
  severity: IncidentSeverity
  assembledFrom: string | null
  levels: EscalationLevel[]
}

export interface Playbook {
  code: string
  category: IncidentCategory
  title: string
  steps: string[]
}

export interface ContactAttemptRequest {
  channel: ContactChannel
  outcome: ContactOutcome
  note?: string
}

/** What came back from recording a contact attempt, including the fallback it unlocked. */
export interface ContactAttemptResult {
  reachedTheFamily: boolean
  recorded: string
  fallbackPlaybook: Playbook | null
}

export interface ResolveRequest {
  resolutionNote: string
  outcome?: ResolutionOutcome
}

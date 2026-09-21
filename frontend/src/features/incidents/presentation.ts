import { ApiError } from '../../shared/api/client'
import type {
  EscalationState,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
} from './types'

/**
 * Everything the incident screens display but do not fetch: labels, tones, the
 * two time formats and the one way of reading an error body.
 *
 * Pure functions on purpose. The console's hardest behaviour to trust is the
 * countdown and the timestamps, and both are testable here without rendering
 * anything.
 *
 * @author Wang Ziyu
 */

/**
 * The design sheet numbers severities the other way round from the enum — SEV 1
 * is the worst — so both are shown rather than one being silently translated.
 */
export const severityLabels: Record<IncidentSeverity, string> = {
  HIGH: 'SEV 1 HIGH',
  MEDIUM: 'SEV 2 MEDIUM',
  LOW: 'SEV 3 LOW',
}

export const severityTones: Record<IncidentSeverity, string> = {
  HIGH: 'var(--danger)',
  MEDIUM: 'var(--warning-text)',
  LOW: 'var(--text-muted)',
}

export const statusLabels: Record<IncidentStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  UNRESOLVED_ESCALATED: 'Unresolved — escalated',
}

export const categoryLabels: Record<IncidentCategory, string> = {
  SOS: 'Emergency call',
  MEDICAL: 'Medical concern',
  FALL: 'Fall reported',
  SERVICE: 'Service problem',
  OTHER: 'Care exception',
}

export const escalationStateLabels: Record<EscalationState, string> = {
  PENDING: 'waiting',
  CURRENT: 'holding it now',
  TIMED_OUT: 'timed out',
  SKIPPED_UNAVAILABLE: 'nobody available',
  CLAIMED: 'took it over',
}

/**
 * Timeline actions in the words a manager would use. The backend's enum is the
 * record; this is the reading of it, and an action added later falls through to
 * its own name rather than disappearing from the audit trail.
 */
const timelineTitles: Record<string, string> = {
  REPORTED: 'Exception raised',
  BROADCAST: 'Everyone who could act was told',
  ASSIGNED: 'Responsibility assigned',
  CLAIMED: 'Taken over',
  CLAIM_REJECTED: 'Take-over refused',
  ESCALATED: 'Escalated to the next level',
  ESCALATION_CANCELLED: 'Escalation cancelled',
  CHAIN_EXHAUSTED: 'Escalation chain exhausted',
  CONTACT_ATTEMPTED: 'Family contact attempted',
  PLAYBOOK_APPLIED: 'Playbook applied',
  SEVERITY_CHANGED: 'Severity changed',
  RESOLVED: 'Closed',
}

export function timelineTitle(action: string): string {
  return timelineTitles[action] ?? action
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/*
 * The backend sends a Java LocalDateTime: no offset, and a fractional part that
 * is nine digits when the application wrote the row and absent when the seed
 * script did. Anything that starts `YYYY-MM-DDTHH:mm` is read; everything after
 * the seconds is ignored.
 *
 * Nothing here goes through `new Date(value)`. That would read an offsetless
 * timestamp in the browser's own zone, so the same incident would show 15:55 in
 * Singapore and 07:55 on a CI machine set to UTC — and the tests would be the
 * first casualty.
 */
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

function parts(value: string | null): Parts | null {
  const match = value ? TIMESTAMP.exec(value) : null
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? '0'),
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Formats a timestamp as day, month and time of day.
 * @param value Timestamp as the backend writes it, or null
 * @return Something like `21 Sep 15:55`, or a placeholder when there is nothing to show
 */
export function incidentTime(value: string | null): string {
  const at = parts(value)
  if (!at) return 'Not available'
  return `${at.day} ${MONTHS[at.month - 1]} ${pad(at.hour)}:${pad(at.minute)}`
}

/**
 * Formats a timestamp as a time of day alone, for rows already grouped by day.
 * @param value Timestamp as the backend writes it, or null
 * @return Something like `15:55:49`, or a placeholder when there is nothing to show
 */
export function incidentClock(value: string | null): string {
  const at = parts(value)
  if (!at) return '--:--:--'
  return `${pad(at.hour)}:${pad(at.minute)}:${pad(at.second)}`
}

function secondsOf(at: Parts): number {
  // Date.UTC, not the local constructor: both sides of every subtraction are
  // built the same way, so the zone cancels out instead of being assumed.
  return Date.UTC(at.year, at.month - 1, at.day, at.hour, at.minute, at.second) / 1000
}

/**
 * How long is left before the response deadline.
 *
 * Display only. Which buttons a manager sees depends on the incident's status
 * and never on this number, because it compares a deadline the server wrote
 * against a clock the browser owns, and the two are not the same clock.
 *
 * @param respondBy The deadline, or null when the incident was never routed
 * @param now The moment to measure against, in the same format
 * @return `00:04:12`, a negative reading once the deadline has passed, or null when there is no deadline
 */
export function countdown(respondBy: string | null, now: string): string | null {
  const deadline = parts(respondBy)
  const from = parts(now)
  if (!deadline || !from) return null

  const total = secondsOf(deadline) - secondsOf(from)
  const remaining = Math.abs(total)
  const clock = [
    pad(Math.floor(remaining / 3600)),
    pad(Math.floor((remaining % 3600) / 60)),
    pad(remaining % 60),
  ].join(':')
  return total < 0 ? '-' + clock : clock
}

/**
 * The browser's current time in the format the backend's timestamps use, so a
 * countdown compares two values of the same shape.
 * @return The local clock as `YYYY-MM-DDTHH:mm:ss`
 */
export function clockNow(): string {
  const now = new Date()
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  )
}

/**
 * Reads the message out of an RFC 9457 problem body.
 *
 * The shared client only looks for a `message` field, which the backend never
 * sends, so `ApiError.message` reads "Request failed with status 409." for
 * every broken rule. The sentence a manager needs — "an incident cannot be
 * closed without a resolution note" — is in `detail`. The client is shared and
 * is not changed for this; the reading is done here.
 *
 * @param error Whatever was thrown
 * @return The server's own words when it supplied any, otherwise a plain fallback
 */
export function problemDetail(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'The request could not be completed. Check your connection and try again.'
  }

  const body = error.body
  if (body && typeof body === 'object') {
    const problem = body as { detail?: unknown; title?: unknown; fields?: unknown }
    const headline =
      typeof problem.detail === 'string' && problem.detail.trim()
        ? problem.detail
        : typeof problem.title === 'string' && problem.title.trim()
          ? problem.title
          : ''
    const fields =
      problem.fields && typeof problem.fields === 'object'
        ? Object.entries(problem.fields as Record<string, unknown>).map(
            ([name, message]) => `${name}: ${String(message)}`,
          )
        : []

    if (headline || fields.length) return [headline, ...fields].filter(Boolean).join(' — ')
  }

  return error.message
}

/** An incident nobody has taken over yet can be taken over, or pushed to the next level. */
export function awaitingTakeOver(status: IncidentStatus): boolean {
  return status === 'OPEN' || status === 'ACKNOWLEDGED'
}

/** While it is being handled, the manager can contact the family, act and close it. */
export function beingHandled(status: IncidentStatus): boolean {
  return status === 'IN_PROGRESS'
}

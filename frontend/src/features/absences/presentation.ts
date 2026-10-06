import type {
  AbsenceStatus,
  AbsenceSummary,
  AbsenceType,
  ChangeOutcome,
  ChangeStatus,
  CheckResult,
  DecidedBy,
  RosteringObjective,
} from './types'

/**
 * Words for UC-MG04's states, kept out of the screens so the manager console
 * and the family portal say the same thing about the same change.
 *
 * @author Wang Ziyu
 */

export const absenceTypeLabels: Record<AbsenceType, string> = {
  SICK: 'Sick',
  ANNUAL: 'Annual leave',
  EMERGENCY: 'Emergency',
  OTHER: 'Other',
}

export const absenceStatusLabels: Record<AbsenceStatus, string> = {
  PENDING: 'Waiting for review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const objectiveLabels: Record<RosteringObjective, string> = {
  CONTINUITY: 'Continuity of caregiver',
  EVEN_WORKLOAD: 'Even workload',
  TRAVEL_TIME: 'Travel time (same sector)',
}

export const objectives: RosteringObjective[] = ['CONTINUITY', 'EVEN_WORKLOAD', 'TRAVEL_TIME']

export const changeStatusLabels: Record<ChangeStatus, string> = {
  AWAITING_FAMILY: 'Waiting for the family',
  UNCOVERED: 'Uncovered',
  RESOLVED: 'Settled',
}

export const outcomeLabels: Record<ChangeOutcome, string> = {
  REPLACED: 'Another caregiver',
  RESCHEDULED: 'Moved',
  SKIPPED: 'Skipped',
  WITHDRAWN: 'Called off elsewhere',
}

export const decidedByLabels: Record<DecidedBy, string> = {
  FAMILY: 'the family',
  DEFAULT_PLAN: 'the default plan',
  MANAGER: 'a manager',
}

export const checkResultLabels: Record<CheckResult, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NOT_APPLICABLE: 'n/a',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * "Thu 8 Oct, 09:00" from a Singapore-local "2026-10-08T09:00:00", read as
 * written rather than through the browser's zone: the server already speaks
 * Singapore time.
 */
export function visitTime(value: string | null): string {
  if (!value) return 'Not set'
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return value
  const [, year, month, day, hour, minute] = match
  const weekday = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()
  return `${DAYS[weekday]} ${Number(day)} ${MONTHS[Number(month) - 1]}, ${hour}:${minute}`
}

/** "8 Oct" or "8 Oct to 9 Oct" for an absence's days. */
export function absenceDays(startDate: string, endDate: string): string {
  const day = (value: string) => {
    const [, month, date] = value.split('-')
    return `${Number(date)} ${MONTHS[Number(month) - 1]}`
  }
  return startDate === endDate ? day(startDate) : `${day(startDate)} to ${day(endDate)}`
}

/** Where an absence's re-rostering stands, in one line for the list. */
export function progressLine(absence: AbsenceSummary): string {
  if (absence.status !== 'APPROVED') return absenceStatusLabels[absence.status]
  if (absence.coverageConfirmedAt) return 'Coverage confirmed'
  const parts: string[] = []
  if (absence.notYetRerostered > 0) parts.push(`${absence.notYetRerostered} to re-roster`)
  if (absence.awaitingFamily > 0) parts.push(`${absence.awaitingFamily} waiting for families`)
  if (absence.uncovered > 0) parts.push(`${absence.uncovered} uncovered`)
  if (absence.settled > 0) parts.push(`${absence.settled} settled`)
  return parts.length ? parts.join(' · ') : 'Nothing to re-roster'
}

/** What happened to a settled change, e.g. "Another caregiver (Farah), chosen by the family". */
export function settledLine(change: {
  outcome: ChangeOutcome | null
  decidedBy: DecidedBy | null
  assignedCaregiver: { name: string } | null
  rescheduledStart: string | null
}): string {
  if (!change.outcome) return ''
  let what: string = outcomeLabels[change.outcome]
  if (change.outcome === 'REPLACED' && change.assignedCaregiver) what += ` (${change.assignedCaregiver.name})`
  if (change.outcome === 'RESCHEDULED') {
    what = `Moved to ${visitTime(change.rescheduledStart)}`
    if (change.assignedCaregiver) what += ` with ${change.assignedCaregiver.name}`
  }
  return change.decidedBy ? `${what}, decided by ${decidedByLabels[change.decidedBy]}` : what
}

/** Today in Singapore as yyyy-mm-dd, for date inputs. */
export function singaporeDate(now: Date = new Date()): string {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

import type { VisitState } from '../../../shared/components/ui'
import type { VisitResponse } from '../../../shared/api/visit'
import type { CaregiverOption } from '../../../shared/api/profile'
import type { EscalationChain, Incident, IncidentSeverity } from '../../../features/incidents/types'
import type { ElderRow } from './elders'

/**
 * Today board data — the board's own shapes, mapped from the real endpoints:
 *
 * - roster ← GET /api/visits/roster (today's visits), named via GET /api/elders and GET /api/caregivers.
 * - exception queue ← GET /api/incidents (everything still needing attention), elders named
 *   the same way; the responder is named only when it's the signed-in manager, since no
 *   endpoint resolves another manager's user id to a name yet.
 * - escalation chain ← GET /api/incidents/{id}/escalation-chain, flattened to steps.
 * - KPIs are counted from the roster and the queue.
 *
 * `reassignVisit` is still an in-memory mock: there is no visit-reassignment write yet, so a
 * reassignment is held here and laid over the fetched roster until the page reloads.
 */

export type Visit = {
  id: string
  /** "HH:MM", Singapore time. */
  time: string
  elder: { name: string; sector: string }
  /** Absent while the visit is unassigned. */
  caregiver?: { name: string }
  service: string
  state: VisitState
}

export type TodayRoster = {
  visits: Visit[]
  sectors: string[]
}

export type Severity = 1 | 2 | 3

export type Exception = {
  /** "EXC-2088" */
  id: string
  severity: Severity
  title: string
  description?: string
  /** Who has taken it over; absent while unclaimed. */
  responder?: string
  /** The next level, once the chain has named one. */
  escalatesTo?: string
  /** ISO — when an unclaimed exception moves up the chain. */
  escalatesAt?: string
  /** ISO — the response deadline the countdown runs to; absent once claimed or escalated. */
  deadline?: string
  /** ISO */
  familyNotifiedAt?: string
  /** The roster visit this exception is about, if any. */
  visitId?: string
  /** The chain ran out with nobody answering. */
  escalated: boolean
}

export type EscalationStep = {
  role: string
  person?: string
  state: 'done' | 'active' | 'pending'
  /** Already worded for display: "respond within 5 min", "after 10 min if unanswered". */
  note: string
}

export type Kpis = {
  scheduled: number
  completed: number
  unassigned: number
  openExceptions: number
  escalated: number
}

/** A backend `LocalDateTime` (Singapore wall clock, no offset) as an ISO instant. */
function sgInstant(localDateTime: string): string {
  return new Date(localDateTime.slice(0, 19) + '+08:00').toISOString()
}

const VISIT_STATES: Record<VisitResponse['status'], VisitState> = {
  SCHEDULED: 'scheduled',
  ARRIVED: 'in_visit',
  IN_PROGRESS: 'in_visit',
  COMPLETED: 'closed',
  VERIFIED: 'closed',
  AUTO_CLOSED: 'closed',
  EXCEPTION: 'no_checkin',
  CANCELLED: 'closed',
}

/** Caregivers put on a visit by `reassignVisit`, by visit id. */
const reassigned = new Map<string, string>()

export function toRoster(visits: VisitResponse[], elders: ElderRow[], caregivers: CaregiverOption[]): TodayRoster {
  const elderById = new Map(elders.map((elder) => [elder.id, elder]))
  const caregiverById = new Map(caregivers.map((caregiver) => [caregiver.id, caregiver.fullName]))

  const rows = visits.map((visit): Visit => {
    const id = String(visit.id)
    const elder = elderById.get(String(visit.elderId))
    const caregiver = reassigned.get(id) ?? (visit.caregiverId == null ? undefined : caregiverById.get(visit.caregiverId))
    return {
      id,
      time: visit.scheduledStart.slice(11, 16),
      elder: { name: elder?.name ?? `Elder #${visit.elderId}`, sector: elder?.sector ?? '' },
      caregiver: caregiver ? { name: caregiver } : undefined,
      service: visit.serviceType ?? '—',
      state: reassigned.has(id) ? 'scheduled' : visit.caregiverId == null ? 'needs_cover' : VISIT_STATES[visit.status],
    }
  })
  const sectors = [...new Set(rows.map((row) => row.elder.sector).filter(Boolean))].sort()
  return { visits: rows, sectors }
}

const SEVERITY: Record<IncidentSeverity, Severity> = { HIGH: 1, MEDIUM: 2, LOW: 3 }

function headline(incident: Incident): string {
  if (incident.source === 'SYSTEM_MISSED_CHECKIN') return 'No check-in'
  switch (incident.category) {
    case 'FALL':
      return 'Fall reported'
    case 'SOS':
      return 'SOS call'
    case 'MEDICAL':
      return 'Medical concern'
    case 'SERVICE':
      return 'Service dispute'
    default:
      return 'Care exception'
  }
}

export function toException(
  incident: Incident,
  elders: ElderRow[],
  currentUser: { id: number; displayName: string } | undefined,
): Exception {
  const elderName = elders.find((elder) => elder.id === String(incident.elderId))?.name ?? `Elder #${incident.elderId}`
  const claimed = incident.status === 'ACKNOWLEDGED' || incident.status === 'IN_PROGRESS'
  const escalated = incident.status === 'UNRESOLVED_ESCALATED'
  const deadline = incident.respondBy ? sgInstant(incident.respondBy) : undefined
  return {
    id: `EXC-${incident.id}`,
    severity: SEVERITY[incident.severity],
    title: `${headline(incident)} — ${elderName}`,
    description: incident.description ?? undefined,
    responder: claimed
      ? incident.responderUserId === currentUser?.id
        ? currentUser.displayName
        : `manager #${incident.responderUserId}`
      : undefined,
    escalatesTo: escalated ? 'family (chain exhausted)' : undefined,
    escalatesAt: claimed || escalated ? undefined : deadline,
    deadline: claimed || escalated ? undefined : deadline,
    visitId: incident.visitId == null ? undefined : String(incident.visitId),
    escalated,
  }
}

export function toEscalationSteps(chain: EscalationChain, currentUserId: number | undefined): EscalationStep[] {
  return chain.levels.map((level) => {
    const person =
      level.responderUserId != null && level.responderUserId === currentUserId ? 'you' : level.responderName ?? undefined
    switch (level.state) {
      case 'CURRENT':
        return { role: level.tier, person, state: 'active', note: `respond within ${level.countdownMinutes} min` }
      case 'CLAIMED':
        return { role: level.tier, person, state: 'done', note: 'took over' }
      case 'TIMED_OUT':
        return { role: level.tier, person, state: 'done', note: 'timed out' }
      case 'SKIPPED_UNAVAILABLE':
        return { role: level.tier, state: 'pending', note: 'nobody available' }
      default:
        return {
          role: level.tier,
          person,
          state: 'pending',
          note: level.countdownMinutes > 0 ? `${level.countdownMinutes} min to respond once reached` : 'if every level above times out',
        }
    }
  })
}

export function toKpis(roster: TodayRoster, exceptions: Exception[]): Kpis {
  return {
    scheduled: roster.visits.length,
    completed: roster.visits.filter((visit) => visit.state === 'closed').length,
    unassigned: roster.visits.filter((visit) => !visit.caregiver).length,
    openExceptions: exceptions.length,
    escalated: exceptions.filter((exception) => exception.escalated).length,
  }
}

/** Puts another caregiver on the visit; it goes back to waiting for them to check in. */
export function reassignVisit(visitId: string, caregiverName: string): Promise<void> {
  reassigned.set(visitId, caregiverName)
  return Promise.resolve()
}

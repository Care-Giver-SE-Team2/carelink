import type { VisitState } from '../../../shared/components/ui'
import type { VisitResponse } from '../../../shared/api/visit'
import type { CaregiverOption } from '../../../shared/api/profile'
import type { ElderRow } from './elders'

/**
 * Today board data — the board's own shapes, mapped from the real endpoints:
 *
 * - roster ← GET /api/visits/roster (today's visits), named via GET /api/elders and GET /api/caregivers.
 * - KPIs are counted from the roster, plus the open exception count from
 *   GET /api/incidents (see useOpenExceptionCount).
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

export type Kpis = {
  scheduled: number
  completed: number
  unassigned: number
  openExceptions: number
}

const VISIT_STATES: Record<VisitResponse['status'], VisitState> = {
  SCHEDULED: 'scheduled',
  ARRIVED: 'in_visit',
  IN_PROGRESS: 'in_visit',
  COMPLETED: 'closed',
  VERIFIED: 'closed',
  AUTO_CLOSED: 'closed',
  EXCEPTION: 'exception',
  CANCELLED: 'closed',
}

export function toRoster(visits: VisitResponse[], elders: ElderRow[], caregivers: CaregiverOption[]): TodayRoster {
  const elderById = new Map(elders.map((elder) => [elder.id, elder]))
  const caregiverById = new Map(caregivers.map((caregiver) => [caregiver.id, caregiver.fullName]))

  const rows = visits.map((visit): Visit => {
    const id = String(visit.id)
    const elder = elderById.get(String(visit.elderId))
    const caregiver = visit.caregiverId == null ? undefined : caregiverById.get(visit.caregiverId)
    return {
      id,
      time: visit.scheduledStart.slice(11, 16),
      elder: { name: elder?.name ?? `Elder #${visit.elderId}`, sector: elder?.sector ?? '' },
      caregiver: caregiver ? { name: caregiver } : undefined,
      service: visit.serviceType ?? '—',
      // An exception outranks the gap: an uncovered visit past its start is an exception.
      state: visit.caregiverId == null && visit.status !== 'EXCEPTION' ? 'needs_cover' : VISIT_STATES[visit.status],
    }
  })
  const sectors = [...new Set(rows.map((row) => row.elder.sector).filter(Boolean))].sort()
  return { visits: rows, sectors }
}

export function toKpis(roster: TodayRoster, openExceptions: number): Kpis {
  return {
    scheduled: roster.visits.length,
    completed: roster.visits.filter((visit) => visit.state === 'closed').length,
    unassigned: roster.visits.filter((visit) => !visit.caregiver).length,
    openExceptions,
  }
}

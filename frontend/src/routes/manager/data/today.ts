import type { VisitState } from '../../../shared/components/ui'

/**
 * Today board fixtures — an in-memory mock store standing in for endpoints that don't
 * exist yet in the shape this board needs:
 *
 * - `fetchTodayRoster` → the visit module's day roster (today's visits for the manager's
 *   sectors).
 * - `fetchExceptionQueue` / `claimException` → GET /api/incidents and
 *   POST /api/incidents/{id}/claim. The real queue (features/incidents) returns elder and
 *   responder ids rather than the names, escalation target and family-notified time shown
 *   here, so the board reads this mock until the endpoint carries them.
 * - `fetchEscalationChain` → GET /api/incidents/{id}/escalation-chain, flattened to steps.
 * - `fetchTodayKpis` → a day-summary endpoint (none exists yet).
 * - `reassignVisit` → a visit-reassignment write (none exists yet).
 *
 * Deadlines are set relative to when this module loads, so the countdowns read like a live
 * queue rather than expiring against a fixed date.
 */

export type Visit = {
  id: string
  /** "HH:MM", local time. */
  time: string
  elder: { name: string; sector: string }
  /** Absent while the visit is unassigned. */
  caregiver?: { name: string }
  service: string
  state: VisitState
}

export type TodayRoster = {
  /** The visits shown on the board; the rest of the day's are only counted. */
  visits: Visit[]
  totalToday: number
  sectors: string[]
}

export type Severity = 1 | 2 | 3

export type Exception = {
  /** "EXC-2088" */
  id: string
  severity: Severity
  title: string
  description?: string
  /** Who is answerable now; absent while unclaimed. */
  responder?: string
  /** The next level, once the chain has named one. */
  escalatesTo?: string
  /** ISO — when an unclaimed exception moves up the chain. */
  escalatesAt?: string
  /** ISO — the response deadline the countdown runs to. */
  deadline: string
  /** ISO */
  familyNotifiedAt?: string
  /** The roster visit this exception is about, if any. */
  visitId?: string
}

export type EscalationStep = {
  role: string
  person?: string
  state: 'done' | 'active' | 'pending'
  /** Already worded for display: "reported 09:12:04", "at 09:16 if unacknowledged". */
  note: string
}

export type Kpis = {
  scheduled: number
  completed: number
  unassigned: number
  openExceptions: number
  escalated: number
}

const loadedAt = Date.now()
const fromNow = (seconds: number) => new Date(loadedAt + seconds * 1000).toISOString()

function todayAt(hour: number, minute: number): string {
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  return at.toISOString()
}

const roster: TodayRoster = {
  totalToday: 86,
  sectors: ['S31', 'S45'],
  visits: [
    { id: 'v-0800-lak', time: '08:00', elder: { name: 'Lim Ah Kow', sector: 'S45' }, caregiver: { name: 'Siti Rahmah' }, service: 'Bathing assist', state: 'closed' },
    { id: 'v-0900-cbc', time: '09:00', elder: { name: 'Chan Bee Choo', sector: 'S31' }, caregiver: { name: 'Nur Aisyah' }, service: 'Vital-sign check', state: 'in_visit' },
    { id: 'v-0900-my', time: '09:00', elder: { name: 'Mohd Yusof', sector: 'S52' }, caregiver: { name: 'Devi Raman' }, service: 'Medication reminder', state: 'no_checkin' },
    { id: 'v-1030-gsl', time: '10:30', elder: { name: 'Goh Siew Lan', sector: 'S45' }, caregiver: { name: 'Siti Rahmah' }, service: 'Mobility exercise', state: 'scheduled' },
    { id: 'v-1100-ths', time: '11:00', elder: { name: 'Tan Hock Seng', sector: 'S31' }, service: 'Companionship', state: 'needs_cover' },
    { id: 'v-1300-lak', time: '13:00', elder: { name: 'Lim Ah Kow', sector: 'S45' }, caregiver: { name: 'Kamala Devi' }, service: 'Companionship', state: 'scheduled' },
    { id: 'v-1430-cbc', time: '14:30', elder: { name: 'Chan Bee Choo', sector: 'S31' }, caregiver: { name: 'Nur Aisyah' }, service: 'Bathing assist', state: 'scheduled' },
  ],
}

/** Unassigned visits among the day's visits that aren't listed on the board. */
const UNLISTED_UNASSIGNED = 1

const exceptions: Exception[] = [
  {
    id: 'EXC-2088',
    severity: 1,
    title: 'Fall reported — Mohd Yusof',
    description: 'Reported by Devi Raman at 09:12. Senior conscious, refuses ambulance.',
    responder: 'Tan Mei Ling',
    escalatesTo: 'duty supervisor',
    deadline: fromNow(4 * 60 + 12),
  },
  {
    id: 'EXC-2087',
    severity: 2,
    title: 'No check-in — 09:00 visit',
    description: 'Raised automatically by scheduled scan after the 10-minute no-entry wait expired.',
    escalatesAt: fromNow(11 * 60 + 56),
    deadline: fromNow(41 * 60 + 56),
    visitId: 'v-0900-my',
  },
  {
    id: 'EXC-2085',
    severity: 3,
    title: 'Home hazard — loose bathroom rail',
    responder: 'Ong Wei Jie',
    familyNotifiedAt: todayAt(8, 5),
    deadline: fromNow(2 * 3600 + 18 * 60 + 3),
  },
  {
    id: 'EXC-2084',
    severity: 3,
    title: 'Medication log incomplete — Chan Bee Choo',
    responder: 'Ong Wei Jie',
    deadline: fromNow(3 * 3600 + 40 * 60),
  },
]

const escalationChains: Record<string, EscalationStep[]> = {
  'EXC-2088': [
    { role: 'Assigned caregiver', person: 'Devi Raman', state: 'done', note: 'reported 09:12:04' },
    { role: 'Care manager on duty', person: 'you', state: 'active', note: 'notified 09:12:06 · unacknowledged' },
    { role: 'Duty supervisor', state: 'pending', note: 'at 09:16 if unacknowledged' },
    { role: 'Registered family member', state: 'pending', note: 'urgent alert · 2h response window' },
  ],
}

/** Copies out, so a caller holding query data never sees the store change underneath it. */
const copy = <T>(value: T): Promise<T> => Promise.resolve(structuredClone(value))

export function fetchTodayRoster(): Promise<TodayRoster> {
  return copy(roster)
}

export function fetchExceptionQueue(): Promise<Exception[]> {
  return copy(exceptions)
}

export function fetchEscalationChain(exceptionId: string): Promise<EscalationStep[]> {
  return copy(escalationChains[exceptionId] ?? [])
}

export function fetchTodayKpis(): Promise<Kpis> {
  return copy({
    scheduled: roster.totalToday,
    completed: 31,
    unassigned: UNLISTED_UNASSIGNED + roster.visits.filter((visit) => !visit.caregiver).length,
    openExceptions: exceptions.length,
    escalated: 1,
  })
}

/** Makes `responder` answerable for the exception; claiming stops its escalation timer. */
export function claimException(exceptionId: string, responder: string): Promise<void> {
  const exception = exceptions.find((e) => e.id === exceptionId)
  if (exception) {
    exception.responder = responder
    delete exception.escalatesAt
  }
  return Promise.resolve()
}

/** Puts another caregiver on the visit; it goes back to waiting for them to check in. */
export function reassignVisit(visitId: string, caregiverName: string): Promise<void> {
  const visit = roster.visits.find((v) => v.id === visitId)
  if (visit) {
    visit.caregiver = { name: caregiverName }
    visit.state = 'scheduled'
  }
  return Promise.resolve()
}

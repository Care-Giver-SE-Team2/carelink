import { api } from './client'

/** Mirrors visit.domain.model.Visit — GET /api/visits/roster returns it as-is (no DTO yet). */
export type VisitResponse = {
  id: number
  elderId: number
  /** Null while nobody is assigned. */
  caregiverId: number | null
  carePlanNodeId: number | null
  absenceId: number | null
  serviceType: string | null
  /** Singapore wall-clock `LocalDateTime`, no offset: "2026-09-27T09:00:00". */
  scheduledStart: string
  scheduledEnd: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  status: 'SCHEDULED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'AUTO_CLOSED' | 'EXCEPTION' | 'CANCELLED'
  stateDeadline: string | null
  carePlanId: number | null
  version: number
  createdAt: string | null
  updatedAt: string | null
}

/** Every visit on one day, cancelled ones left out, earliest first (manager only). */
export function fetchDayRoster(date?: string, signal?: AbortSignal): Promise<VisitResponse[]> {
  return api<VisitResponse[]>(date ? `/visits/roster?date=${date}` : '/visits/roster', { signal })
}

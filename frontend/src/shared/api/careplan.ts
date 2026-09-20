import { api, ApiError } from './client'

/** Mirrors careplan.domain.model.CarePlan — GET/POST /api/care-plans return it as-is (no DTO yet). */
export type CarePlanResponse = {
  id: number
  elderId: number
  createdByUserId: number | null
  supersedesPlanId: number | null
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'STOPPED'
  totalHours: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  stopEffectiveDate: string | null
  stopReason: string | null
  stoppedByUserId: number | null
  stoppedAt: string | null
}

export type VisitPayload = { day: string; minutes: number }

/** Every published node is a task; groupName is a display-only label, not a hierarchy. */
export type PlanNodePayload = {
  groupName: string | null
  name: string
  visits: VisitPayload[]
  evidenceType: 'NONE' | 'CHECKLIST' | 'PHOTO' | 'READING'
}

export type CarePlanNodeResponse = {
  id: number
  groupName: string | null
  name: string
  visits: VisitPayload[]
  evidenceType: 'NONE' | 'CHECKLIST' | 'PHOTO' | 'READING'
  weeklyHours: number | null
}

/** The elder's highest-version plan (draft, published or superseded), or null if it has none yet. */
export async function fetchLatestCarePlan(elderId: string | number): Promise<CarePlanResponse | null> {
  try {
    return await api<CarePlanResponse>(`/care-plans/latest?elderId=${elderId}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function fetchCarePlanNodes(carePlanId: number): Promise<CarePlanNodeResponse[]> {
  return api<CarePlanNodeResponse[]>(`/care-plans/${carePlanId}/nodes`)
}

export function createCarePlanDraft(elderId: string | number): Promise<CarePlanResponse> {
  return api<CarePlanResponse>('/care-plans', {
    method: 'POST',
    body: JSON.stringify({ elderId: Number(elderId) }),
  })
}

export function publishCarePlan(carePlanId: number, nodes: PlanNodePayload[]): Promise<CarePlanResponse> {
  return api<CarePlanResponse>(`/care-plans/${carePlanId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ nodes }),
  })
}

/** Effective date as an ISO "yyyy-MM-dd" string, matching java.time.LocalDate's JSON form. */
export function stopCarePlan(carePlanId: number, effectiveDate: string, reason: string): Promise<CarePlanResponse> {
  return api<CarePlanResponse>(`/care-plans/${carePlanId}/stop`, {
    method: 'POST',
    body: JSON.stringify({ effectiveDate, reason }),
  })
}

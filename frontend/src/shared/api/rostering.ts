import { api } from './client'

/**
 * One entry of GET /api/credentials/visits-at-risk — rostering.application.CredentialRiskService.
 * `visitsAtRisk` is null when the certificate covers its caregiver past the roster window.
 */
export type CredentialRisk = {
  credentialId: number
  visitsAtRisk: number | null
}

/**
 * For each row of the certification register, the booked visits it puts at risk: ones its
 * caregiver has after it lapses, on care plans that require its type (manager only).
 */
export function fetchVisitsAtRisk(signal?: AbortSignal): Promise<CredentialRisk[]> {
  return api<CredentialRisk[]>('/credentials/visits-at-risk', { signal })
}

/**
 * One caregiver in the picker for reassigning a visit — GET /api/visits/{id}/reassignment-options,
 * rostering.controller.dto.ReassignmentOptionResponse.
 */
export type ReassignmentOption = {
  caregiverId: number
  name: string
  /** 1 for the best suggestion; null when a hard rule excludes them. */
  rank: number | null
  /** Why they are suggested, or what excludes them. */
  reason: string | null
  eligible: boolean
}

/**
 * Who could take a visit that has not started instead of whoever has it now: eligible first,
 * best first, then who a hard rule excludes and why (manager only).
 */
export function fetchReassignmentOptions(visitId: number, signal?: AbortSignal): Promise<ReassignmentOption[]> {
  return api<ReassignmentOption[]>(`/visits/${visitId}/reassignment-options`, { signal })
}

/**
 * The manager gives the visit to another caregiver (manager only). The server checks the hard
 * rules again; a visit an absence vacated is settled through that absence, closing any offer
 * the family is still answering. `reason` is kept in the visit's history, never shown to the family.
 */
/**
 * The manager cancels one visit that has not started (manager only); the care plan, and so every
 * later visit, stays as it is. Refused (409) for a visit an absence vacated, which is settled on
 * the Absences screen. `reason` is kept in the visit's history, never shown to the family.
 */
export function cancelVisit(visitId: number, reason: string): Promise<void> {
  return api<void>(`/visits/${visitId}/cancellation`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function reassignVisit(visitId: number, caregiverId: number, reason: string): Promise<void> {
  return api<void>(`/visits/${visitId}/reassignment`, {
    method: 'POST',
    body: JSON.stringify({ caregiverId, reason }),
  })
}

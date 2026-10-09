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
 * One caregiver the search considered for a visit nobody holds — GET
 * /api/open-visits/{visitId}/candidates (rostering.application.OpenVisitService). Those who can
 * take it come first, best first; `excludedBy` is the rule that stopped anyone else, and
 * `reason` says why either way.
 */
export type OpenVisitCandidate = {
  caregiverId: number
  name: string
  /** 1 for the best suggestion; null when a rule excluded them. */
  rank: number | null
  score: number | null
  reason: string | null
  excludedBy: string | null
}

export type OpenVisitAssigned = { visitId: number; caregiverId: number; caregiverName: string }

/** Who can take an unassigned visit and who cannot, with why (manager only). */
export function fetchOpenVisitCandidates(visitId: number, signal?: AbortSignal): Promise<OpenVisitCandidate[]> {
  return api<OpenVisitCandidate[]>(`/open-visits/${visitId}/candidates`, { signal })
}

/** Puts a caregiver on an unassigned visit; 409 if the rules no longer allow it or it was taken. */
export function assignOpenVisit(visitId: number, caregiverId: number): Promise<OpenVisitAssigned> {
  return api<OpenVisitAssigned>(`/open-visits/${visitId}/assignment`, {
    method: 'POST',
    body: JSON.stringify({ caregiverId }),
  })
}

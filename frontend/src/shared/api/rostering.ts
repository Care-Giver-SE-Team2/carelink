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

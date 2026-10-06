import { initialiseCsrf } from '../auth/api'
import { api } from '../../shared/api/client'
import type { SpotCheck, SpotCheckQuery, SpotCheckResult, VisitChoice } from './types'

/**
 * One function per endpoint of UC-MG08 and nothing else. Every write
 * initialises CSRF first, as the incident functions do.
 *
 * @author Wang Ziyu
 */

/** The spot checks the caller may see; a manager may narrow them. */
export function listSpotChecks(query: SpotCheckQuery = {}, signal?: AbortSignal): Promise<SpotCheck[]> {
  const params = new URLSearchParams()
  if (query.stage) params.set('stage', query.stage)
  if (query.caregiverId !== undefined) params.set('caregiverId', String(query.caregiverId))
  if (query.elderId !== undefined) params.set('elderId', String(query.elderId))
  const search = params.toString()
  return api<SpotCheck[]>('/spot-checks' + (search ? '?' + search : ''), { signal })
}

/** The elder's visits a manager may choose to check. */
export function listVisitsToCheck(elderId: number, signal?: AbortSignal): Promise<VisitChoice[]> {
  return api<VisitChoice[]>('/spot-checks/visits?elderId=' + elderId, { signal })
}

/** Steps 1 and 2: ask to watch a visit; the family is asked. */
export async function requestSpotCheck(visitId: number, purpose: string, signal?: AbortSignal): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks', { method: 'POST', body: JSON.stringify({ visitId, purpose }), signal })
}

/** Step 3 or 3a: the family agrees, or declines and says why. */
export async function decideSpotCheck(
  id: number,
  approve: boolean,
  reason?: string,
  signal?: AbortSignal,
): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/decision', {
    method: 'POST',
    body: JSON.stringify({ approve, reason }),
    signal,
  })
}

/** Steps 4 and 5: the conclusion recorded on site. */
export async function concludeSpotCheck(
  id: number,
  result: SpotCheckResult,
  notes?: string,
  signal?: AbortSignal,
): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/conclusion', {
    method: 'POST',
    body: JSON.stringify({ result, notes }),
    signal,
  })
}

/** Exception 4a: the caregiver did not turn up; the missed visit becomes an exception. */
export async function reportNoShow(id: number, notes?: string, signal?: AbortSignal): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/no-show', { method: 'POST', body: JSON.stringify({ notes }), signal })
}

/** Exception 4b: the elder was out; the check moves to another of their visits. */
export async function moveSpotCheck(id: number, visitId: number, signal?: AbortSignal): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/move', { method: 'POST', body: JSON.stringify({ visitId }), signal })
}

/** The manager calls the request off and says why. */
export async function withdrawSpotCheck(id: number, reason: string, signal?: AbortSignal): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/withdrawal', {
    method: 'POST',
    body: JSON.stringify({ reason }),
    signal,
  })
}

/** The checked caregiver answers the conclusion. */
export async function respondToSpotCheck(id: number, response: string, signal?: AbortSignal): Promise<SpotCheck> {
  await initialiseCsrf(signal)
  return api<SpotCheck>('/spot-checks/' + id + '/response', {
    method: 'POST',
    body: JSON.stringify({ response }),
    signal,
  })
}

/** The concluded checks on a caregiver's record. */
export function listCaregiverConclusions(caregiverId: number, signal?: AbortSignal): Promise<SpotCheck[]> {
  return api<SpotCheck[]>('/caregivers/' + caregiverId + '/spot-checks', { signal })
}

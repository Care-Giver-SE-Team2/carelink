import { initialiseCsrf } from '../auth/api'
import { api } from '../../shared/api/client'
import type {
  ContactAttemptRequest,
  ContactAttemptResult,
  EscalationChain,
  Incident,
  IncidentDetail,
  IncidentQueue,
  IncidentQueueQuery,
  IncidentSeverity,
  Playbook,
  ResolveRequest,
} from './types'

/**
 * One function per endpoint of the incident module, and nothing else: no state,
 * no error handling, no formatting. Every write initialises CSRF first, the way
 * `signOut` does — a manager who leaves the console open over lunch and then
 * takes an incident over would otherwise be refused by Spring Security for a
 * reason that has nothing to do with the incident.
 *
 * @author Wang Ziyu
 */

/**
 * Reads one page of the manager's queue (UC-MG05 step 2).
 * @param query Page, size and the optional status and severity filters
 * @param signal Cancels an outstanding request
 * @return The page of incidents, most urgent first
 */
export function listIncidentQueue(
  { page, size, status, severity }: IncidentQueueQuery,
  signal?: AbortSignal,
): Promise<IncidentQueue> {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) query.set('status', status)
  if (severity) query.set('severity', severity)
  return api<IncidentQueue>('/incidents?' + query, { signal })
}

/**
 * Reads one incident with its whole timeline.
 * @param id Incident identifier
 * @param signal Cancels an outstanding request
 * @return The incident, the playbook suggested for its category, and every timeline entry
 */
export function getIncident(id: number, signal?: AbortSignal): Promise<IncidentDetail> {
  return api<IncidentDetail>('/incidents/' + id, { signal })
}

/**
 * Reads the escalation chain as it would be walked at this moment.
 * @param id Incident identifier
 * @param signal Cancels an outstanding request
 * @return The assembled chain and each of its levels
 */
export function getEscalationChain(id: number, signal?: AbortSignal): Promise<EscalationChain> {
  return api<EscalationChain>('/incidents/' + id + '/escalation-chain', { signal })
}

/**
 * Reads the standard playbooks, so the console does not hard-code them.
 * @param signal Cancels an outstanding request
 * @return Every playbook with its steps
 */
export function listPlaybooks(signal?: AbortSignal): Promise<Playbook[]> {
  return api<Playbook[]>('/incident-playbooks', { signal })
}

/**
 * Takes the incident over (UC-MG05 step 3). The countdown stops server-side.
 * @param id Incident identifier
 * @param signal Cancels the request
 * @return The incident in its new state
 */
export async function claimIncident(id: number, signal?: AbortSignal): Promise<Incident> {
  await initialiseCsrf(signal)
  return api<Incident>('/incidents/' + id + '/claim', { method: 'POST', signal })
}

/**
 * Hands the incident to the next level of the chain by hand (exception 3a).
 * @param id Incident identifier
 * @param reason Why it is being pushed on, if the manager gave one
 * @param signal Cancels the request
 * @return The incident in its new state
 */
export async function escalateIncident(
  id: number,
  reason: string,
  signal?: AbortSignal,
): Promise<Incident> {
  await initialiseCsrf(signal)
  return api<Incident>('/incidents/' + id + '/escalate', {
    method: 'POST',
    body: JSON.stringify({ reason }),
    signal,
  })
}

/**
 * Records an attempt to reach the family, whether or not it worked (step 4).
 * @param id Incident identifier
 * @param attempt Channel used, what came of it, and the note the rules may require
 * @param signal Cancels the request
 * @return Whether the family was reached and, when they were not, the playbook to fall back on
 */
export async function recordContactAttempt(
  id: number,
  attempt: ContactAttemptRequest,
  signal?: AbortSignal,
): Promise<ContactAttemptResult> {
  await initialiseCsrf(signal)
  return api<ContactAttemptResult>('/incidents/' + id + '/contact-attempts', {
    method: 'POST',
    body: JSON.stringify(attempt),
    signal,
  })
}

/**
 * Applies the standard response for this category of incident (step 5).
 * @param id Incident identifier
 * @param playbookCode The playbook being put into effect
 * @param signal Cancels the request
 * @return The incident, unchanged in state; the action lands on the timeline
 */
export async function applyPlaybook(
  id: number,
  playbookCode: string,
  signal?: AbortSignal,
): Promise<Incident> {
  await initialiseCsrf(signal)
  return api<Incident>('/incidents/' + id + '/playbook', {
    method: 'POST',
    body: JSON.stringify({ playbookCode }),
    signal,
  })
}

/**
 * Changes the severity part way through handling (alternative 5a). The backend
 * reassembles the chain for the new severity and the timeline continues.
 * @param id Incident identifier
 * @param severity The severity it is being moved to
 * @param reason Why the situation changed
 * @param signal Cancels the request
 * @return The incident at its new severity
 */
export async function changeSeverity(
  id: number,
  severity: IncidentSeverity,
  reason: string,
  signal?: AbortSignal,
): Promise<Incident> {
  await initialiseCsrf(signal)
  return api<Incident>('/incidents/' + id + '/severity', {
    method: 'POST',
    body: JSON.stringify({ severity, reason }),
    signal,
  })
}

/**
 * Records the conclusion and closes the incident (step 6).
 * @param id Incident identifier
 * @param resolution The note the rules require, and how the incident ended
 * @param signal Cancels the request
 * @return The closed incident
 */
export async function resolveIncident(
  id: number,
  resolution: ResolveRequest,
  signal?: AbortSignal,
): Promise<Incident> {
  await initialiseCsrf(signal)
  return api<Incident>('/incidents/' + id + '/resolve', {
    method: 'POST',
    body: JSON.stringify(resolution),
    signal,
  })
}

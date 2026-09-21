import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEscalationChain, getIncident, listIncidentQueue, listPlaybooks } from './api'
import type { IncidentQueueQuery } from './types'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

/**
 * Reads one incident resource, discarding cancelled requests and data that
 * belongs to a load the screen has already moved on from.
 *
 * The same shape as the family portal's `useIntakeResource`, deliberately
 * copied rather than imported: that file sits in another owner's feature
 * folder, and a shared hook would have to move to `shared/` first. Forty lines
 * is the cheaper of the two.
 *
 * `refresh` is what every write calls when it succeeds. Nothing here builds a
 * new state out of a response body — claiming an incident clears its deadline
 * and reassembling the chain changes every level, so anything assembled in the
 * browser drifts from the server within one click.
 *
 * @param load Stable function that loads the data
 * @return The current state and a function that loads it again
 * @author Wang Ziyu
 */
function useIncidentResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ load, revision }), [load, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Resource<T> }>({
    key,
    resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    key.load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'success', data } })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'error', error } })
      },
    )
    return () => controller.abort()
  }, [key])

  const resource: Resource<T> = result.key === key ? result.resource : { status: 'loading' }
  return { resource, refresh }
}

/**
 * Loads one page of the manager's queue.
 * @param query Page, size and the optional status and severity filters
 * @return The current state and a refresh function
 */
export function useIncidentQueue({ page, size, status, severity }: IncidentQueueQuery) {
  const load = useCallback(
    (signal: AbortSignal) => listIncidentQueue({ page, size, status, severity }, signal),
    [page, size, status, severity],
  )
  return useIncidentResource(load)
}

/**
 * Loads one incident and its timeline.
 * @param id Incident identifier
 * @return The current state and a refresh function
 */
export function useIncidentDetail(id: number) {
  const load = useCallback((signal: AbortSignal) => getIncident(id, signal), [id])
  return useIncidentResource(load)
}

/**
 * Loads the escalation chain as it stands now. Refreshed separately from the
 * incident, because changing the severity reassembles the chain without the
 * incident's own fields moving.
 * @param id Incident identifier
 * @return The current state and a refresh function
 */
export function useEscalationChain(id: number) {
  const load = useCallback((signal: AbortSignal) => getEscalationChain(id, signal), [id])
  return useIncidentResource(load)
}

/**
 * Loads the standard playbooks.
 * @return The current state and a refresh function
 */
export function usePlaybooks() {
  const load = useCallback((signal: AbortSignal) => listPlaybooks(signal), [])
  return useIncidentResource(load)
}

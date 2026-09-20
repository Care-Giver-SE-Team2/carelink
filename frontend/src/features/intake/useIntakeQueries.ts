import { useCallback, useEffect, useMemo, useState } from 'react'
import { getIntakeApplication, listIntakeApplications } from './api'
import type { IntakeListQuery } from './types'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

/**
 * Reads an intake resource, discarding cancelled requests and previously displayed data.
 * @param load Stable function that loads the selected application data
 * @return Current loading, success or error state and a refresh function
 * @author Wang Zhili
 */
function useIntakeResource<T>(load: (signal: AbortSignal) => Promise<T>) {
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
 * Loads a family's application list and manages refresh, errors and cancellation.
 * @param query Page number, page size and optional application status
 * @return Current request state and a refresh function
 * @author Wang Zhili
 */
export function useIntakeApplications({ page, size, status }: IntakeListQuery) {
  const load = useCallback(
    (signal: AbortSignal) => listIntakeApplications({ page, size, status }, signal),
    [page, size, status],
  )
  return useIntakeResource(load)
}

/**
 * Loads an application and manages refresh, errors and cancellation.
 * @param id Application identifier
 * @return Current request state and a refresh function
 * @author Wang Zhili
 */
export function useIntakeApplication(id: string) {
  const load = useCallback((signal: AbortSignal) => getIntakeApplication(id, signal), [id])
  return useIntakeResource(load)
}

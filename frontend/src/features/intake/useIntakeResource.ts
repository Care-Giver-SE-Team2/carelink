import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../shared/api/client'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

/**
 * Reads an intake resource, discarding cancelled requests and previously displayed data.
 * @param path API path including any pagination and status filters
 * @return Current loading, success or error state and a refresh function
 * @author Wang Zhili
 */
export function useIntakeResource<T>(path: string) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ path, revision }), [path, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Resource<T> }>({
    key,
    resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    api<T>(key.path, { signal: controller.signal }).then(
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

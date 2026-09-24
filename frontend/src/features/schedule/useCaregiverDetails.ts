import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { getFamilyCaregiver, listFamilyCredentials } from './caregiverApi'

export type CaregiverResource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

function useDetailResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onAccessError: (error: unknown) => void,
) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ load, revision }), [load, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: CaregiverResource<T> }>({
    key, resource: { status: 'loading' },
  })
  const retry = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    key.load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'success', data } })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          onAccessError(error)
        } else {
          setResult({ key, resource: { status: 'error', error } })
        }
      },
    )
    return () => controller.abort()
  }, [key, onAccessError])

  const resource: CaregiverResource<T> = result.key === key ? result.resource : { status: 'loading' }
  return { resource, retry }
}

/**
 * Loads public caregiver details independently and cancels requests when closed.
 * @param caregiverId Caregiver assigned to the selected visit
 * @param onAccessError Clears protected page data when authentication or access is lost
 * @return Profile and qualification states with separate retries and a combined refresh
 * @author Wang Zhili
 */
export function useCaregiverDetails(caregiverId: number, onAccessError: (error: unknown) => void) {
  const loadProfile = useCallback((signal: AbortSignal) => getFamilyCaregiver(caregiverId, signal), [caregiverId])
  const loadCredentials = useCallback((signal: AbortSignal) => listFamilyCredentials(caregiverId, signal), [caregiverId])
  const profile = useDetailResource(loadProfile, onAccessError)
  const credentials = useDetailResource(loadCredentials, onAccessError)
  const refresh = () => {
    profile.retry()
    credentials.retry()
  }
  return {
    profile: profile.resource,
    credentials: credentials.resource,
    retryProfile: profile.retry,
    retryCredentials: credentials.retry,
    refresh,
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../auth/api'
import { ApiError } from '../../shared/api/client'
import { getFamilyReport } from './api'
import type { FamilyReportDetail } from './types'

type Resource =
  | { status: 'loading' }
  | { status: 'success'; data: FamilyReportDetail }
  | { status: 'error'; error: unknown }

async function loadReport(id: string, signal: AbortSignal): Promise<FamilyReportDetail> {
  const user = await getCurrentUser(signal)
  if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
    throw new ApiError('Sign in with a family account to view care reports.', 403)
  }
  signal.throwIfAborted()
  return getFamilyReport(id, signal)
}

/** Rechecks family access and hides old text during refresh or report changes.
 * @author Wang Zhili
 */
export function useFamilyReport(id: string) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ id, revision }), [id, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Resource }>({
    key, resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    loadReport(key.id, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'success', data } })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'error', error } })
      },
    )
    return () => controller.abort()
  }, [key])

  const resource: Resource = result.key === key ? result.resource : { status: 'loading' }
  return { resource, refresh }
}

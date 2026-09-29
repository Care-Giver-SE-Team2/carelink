import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../auth/api'
import { ApiError } from '../../shared/api/client'
import { fetchElderList } from '../../shared/api/profile'
import type { ElderListItem } from '../../shared/api/profile'
import { listReports } from './api'
import type { ReportPage } from './types'

type Selection = { elderId: number | null; page: number }
type FamilyReportData = {
  elders: ElderListItem[]
  selectedElderId: number | null
  reports: ReportPage | null
}
type Resource =
  | { status: 'loading' }
  | { status: 'success'; data: FamilyReportData }
  | { status: 'error'; error: unknown }

async function loadReports(selection: Selection, signal: AbortSignal): Promise<FamilyReportData> {
  const user = await getCurrentUser(signal)
  if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
    throw new ApiError('Sign in with a family account to view care reports.', 403)
  }
  signal.throwIfAborted()
  const elders = await fetchElderList(signal)
  signal.throwIfAborted()
  const selectedElderId = selection.elderId ?? elders[0]?.id ?? null
  if (selectedElderId === null) return { elders, selectedElderId, reports: null }
  if (!elders.some((elder) => elder.id === selectedElderId)) {
    throw new ApiError('This elder is no longer available to this account.', 403)
  }
  const reports = await listReports({ elderId: selectedElderId, audience: 'FAMILY', page: selection.page, size: 20 }, signal)
  return { elders, selectedElderId, reports }
}

/**
 * Rechecks family access for each page and drops cancelled or outdated results.
 * @author Wang Zhili
 */
export function useFamilyReportPage({ elderId, page }: Selection) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ elderId, page, revision }), [elderId, page, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Resource }>({
    key, resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    loadReports(key, controller.signal).then(
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

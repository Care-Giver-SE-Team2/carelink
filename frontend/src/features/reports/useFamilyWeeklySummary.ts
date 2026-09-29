import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../auth/api'
import { ApiError } from '../../shared/api/client'
import { fetchElderList } from '../../shared/api/profile'
import type { ElderListItem } from '../../shared/api/profile'
import { shiftDays } from '../schedule/presentation'
import { getFamilyReport, getFamilyWeeklySummary } from './api'
import type { FamilyReportDetail, FamilyWeeklySummary } from './types'

type Selection = { elderId: number | null; week: string }
type Data = {
  elders: ElderListItem[]
  selectedElderId: number | null
  weekly: { summary: FamilyWeeklySummary; detail: FamilyReportDetail } | null
}
type Resource =
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: unknown }

async function loadSummary(selection: Selection, signal: AbortSignal): Promise<Data> {
  const user = await getCurrentUser(signal)
  if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
    throw new ApiError('Sign in with a family account to view care reports.', 403)
  }
  signal.throwIfAborted()
  const elders = await fetchElderList(signal)
  signal.throwIfAborted()
  const selectedElderId = selection.elderId ?? elders[0]?.id ?? null
  if (selectedElderId === null) return { elders, selectedElderId, weekly: null }
  if (!elders.some((elder) => elder.id === selectedElderId)) {
    throw new ApiError('This elder is no longer available to this account.', 403)
  }
  let summary: FamilyWeeklySummary
  try {
    summary = await getFamilyWeeklySummary(selectedElderId, selection.week, signal)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { elders, selectedElderId, weekly: null }
    throw error
  }
  signal.throwIfAborted()
  if (summary.elderId !== selectedElderId || summary.periodStart !== selection.week || summary.periodEnd !== shiftDays(selection.week, 6)) {
    throw new Error('The summary does not match the selected elder and week.')
  }
  const detail = await getFamilyReport(String(summary.reportId), signal)
  if (detail.id !== summary.reportId || detail.elderId !== summary.elderId || detail.periodStart !== summary.periodStart || detail.periodEnd !== summary.periodEnd) {
    throw new Error('The summary and source report do not match.')
  }
  return { elders, selectedElderId, weekly: { summary, detail } }
}

/** Publishes the summary only with its source report's completeness and corrections.
 * @author Wang Zhili
 */
export function useFamilyWeeklySummary({ elderId, week }: Selection) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ elderId, week, revision }), [elderId, week, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Resource }>({ key, resource: { status: 'loading' } })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    loadSummary(key, controller.signal).then(
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

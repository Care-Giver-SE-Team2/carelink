import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../auth/api'
import { ApiError } from '../../shared/api/client'
import { fetchElderList } from '../../shared/api/profile'
import type { ElderListItem } from '../../shared/api/profile'
import { listFamilyVisits } from './api'
import { shiftDays } from './presentation'
import type { FamilyVisitPage } from './types'

export type ScheduleSelection = { elderId: number | null; week: string; page: number }
type ScheduleData = {
  elders: ElderListItem[]
  selectedElderId: number | null
  visits: FamilyVisitPage | null
}
type ScheduleResource =
  | { status: 'loading' }
  | { status: 'success'; data: ScheduleData }
  | { status: 'error'; error: unknown }

async function loadSchedule(selection: ScheduleSelection, signal: AbortSignal): Promise<ScheduleData> {
  const user = await getCurrentUser(signal)
  if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
    throw new ApiError('Sign in with a family account to view schedules.', 403)
  }
  signal.throwIfAborted()
  const elders = await fetchElderList(signal)
  signal.throwIfAborted()
  const selectedElderId = selection.elderId ?? elders[0]?.id ?? null
  if (selectedElderId === null) return { elders, selectedElderId, visits: null }
  if (!elders.some((elder) => elder.id === selectedElderId)) {
    throw new ApiError('This elder is no longer available to this account.', 403)
  }
  const visits = await listFamilyVisits({
    elderId: selectedElderId,
    dateFrom: selection.week,
    dateTo: shiftDays(selection.week, 6),
    page: selection.page,
    size: 20,
  }, signal)
  return { elders, selectedElderId, visits }
}

/**
 * Loads one schedule page and discards data from cancelled selections or refreshes.
 * @param selection Elder, Singapore week start and zero-based page
 * @return Request state and functions to reload or clear protected schedule data
 * @author Wang Zhili
 */
export function useFamilySchedule({ elderId, week, page }: ScheduleSelection) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ elderId, week, page, revision }), [elderId, week, page, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: ScheduleResource }>({
    key,
    resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const invalidateAccess = useCallback((error: unknown) => {
    setResult((current) => current.key === key
      ? { key, resource: { status: 'error', error } }
      : current)
  }, [key])

  useEffect(() => {
    const controller = new AbortController()
    loadSchedule(key, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'success', data } })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, resource: { status: 'error', error } })
      },
    )
    return () => controller.abort()
  }, [key])

  const resource: ScheduleResource = result.key === key ? result.resource : { status: 'loading' }
  return { resource, refresh, invalidateAccess }
}

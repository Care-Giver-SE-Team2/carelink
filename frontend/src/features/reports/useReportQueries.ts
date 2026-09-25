import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReport, listReports } from './api'
import type { ReportListQuery } from './types'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown }

/**
 * Reads one report resource, discarding cancelled requests and data that
 * belongs to a load the screen has already moved on from.
 *
 * The same shape as the incident screens' `useIncidentResource`, copied rather
 * than imported: that hook is private to its feature, and a shared one would
 * belong in `shared/`, which is a conversation rather than a commit.
 *
 * `refresh` is what every write calls when it succeeds. A report is read back
 * after a correction rather than having the correction pushed onto it in the
 * browser, so what is on the screen is what is on file.
 *
 * @param load Stable function that loads the data
 * @return The current state and a function that loads it again
 * @author Wang Ziyu
 */
function useReportResource<T>(load: (signal: AbortSignal) => Promise<T>) {
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
 * Loads one page of filed reports.
 * @param query Page, size and the optional elder and reader filters
 * @return The current state and a refresh function
 */
export function useReportPage({ page, size, elderId, audience }: ReportListQuery) {
  const load = useCallback(
    (signal: AbortSignal) => listReports({ page, size, elderId, audience }, signal),
    [page, size, elderId, audience],
  )
  return useReportResource(load)
}

/**
 * Loads one report with its sections and corrections.
 * @param id Report identifier
 * @return The current state and a refresh function
 */
export function useReportDetail(id: number) {
  const load = useCallback((signal: AbortSignal) => getReport(id, signal), [id])
  return useReportResource(load)
}

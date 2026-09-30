import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { getCurrentUser } from '../auth/api'
import type { FamilyVisit } from '../schedule/types'
import { getFamilyVisit, getFamilyVisitTasks, getFamilyVisitTimeline } from './api'
import type { FamilyVisitTask, FamilyVisitTimelineEntry } from './types'

export type VisitPart<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T; loadedAt: string }
  | { status: 'error'; error: unknown }

type VisitData = { details: FamilyVisit; timeline: FamilyVisitTimelineEntry[]; tasks: FamilyVisitTask[] }
type Parts = { [K in keyof VisitData]: VisitPart<VisitData[K]> }
type Progress =
  | { status: 'loading' }
  | { status: 'ready'; parts: Parts }
  | { status: 'error'; error: unknown }

/** Independent reads with one access boundary; refreshing or changing visit clears old data.
 * @author Wang Zhili
 */
export function useFamilyVisitProgress(id: string) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ id, revision }), [id, revision])
  const [result, setResult] = useState<{ key: typeof key; resource: Progress }>({
    key, resource: { status: 'loading' },
  })
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const failAll = (error: unknown) => {
      if (signal.aborted) return
      controller.abort()
      setResult({ key, resource: { status: 'error', error } })
    }
    const setPart = <K extends keyof VisitData>(part: K, value: VisitPart<VisitData[K]>) => {
      if (signal.aborted) return
      setResult((current) => current.key === key && current.resource.status === 'ready'
        ? { key, resource: { status: 'ready', parts: { ...current.resource.parts, [part]: value } } }
        : current)
    }
    const loadPart = async <K extends keyof VisitData>(part: K, request: Promise<VisitData[K]>) => {
      try {
        const data = await request
        setPart(part, { status: 'success', data, loadedAt: new Date().toISOString() })
      } catch (error) {
        if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) failAll(error)
        else setPart(part, { status: 'error', error })
      }
    }
    async function load() {
      try {
        if (!/^[1-9]\d{0,18}$/.test(key.id) || BigInt(key.id) > 9223372036854775807n) {
          throw new ApiError('Invalid visit link.', 400)
        }
        const user = await getCurrentUser(signal)
        signal.throwIfAborted()
        if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
          throw new ApiError('Family access is required.', 403)
        }
        setResult({ key, resource: { status: 'ready', parts: {
          details: { status: 'loading' }, timeline: { status: 'loading' }, tasks: { status: 'loading' },
        } } })
        void loadPart('details', getFamilyVisit(key.id, signal))
        void loadPart('timeline', getFamilyVisitTimeline(key.id, signal))
        void loadPart('tasks', getFamilyVisitTasks(key.id, signal))
      } catch (error) {
        failAll(error)
      }
    }
    void load()
    return () => controller.abort()
  }, [key])

  const resource: Progress = result.key === key ? result.resource : { status: 'loading' }
  return { resource, refresh }
}

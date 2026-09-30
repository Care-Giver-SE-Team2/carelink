import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { getCurrentUser } from '../auth/api'
import type { FamilyVisit } from '../schedule/types'
import { getFamilyVisit, getFamilyVisitTasks, getFamilyVisitTimeline } from './api'
import type { FamilyVisitTask, FamilyVisitTimelineEntry } from './types'

type Saved<T> = { data: T; loadedAt: string }
export type VisitPart<T> =
  | { status: 'loading' | 'error'; previous?: Saved<T> }
  | ({ status: 'success' } & Saved<T>)

type VisitData = { details: FamilyVisit; timeline: FamilyVisitTimelineEntry[]; tasks: FamilyVisitTask[] }
type Parts = { [K in keyof VisitData]: VisitPart<VisitData[K]> }
type Progress =
  | { status: 'loading' }
  | { status: 'ready'; parts: Parts }
  | { status: 'error'; error: unknown }
type State = { resource: Progress; refreshing: boolean; retrySeconds: number | null; pause: 'offline' | 'hidden' | null }
const initialState: State = { resource: { status: 'loading' }, refreshing: false, retrySeconds: null, pause: null }
const pauseReason = (): State['pause'] => !navigator.onLine ? 'offline' : document.visibilityState === 'hidden' ? 'hidden' : null
const emptyParts = (): Parts => ({ details: { status: 'loading' }, timeline: { status: 'loading' }, tasks: { status: 'loading' } })
const saved = <T>(part: VisitPart<T>): Saved<T> | undefined => part.status === 'success' ? part : part.previous

/** Independent reads retain only this visit's last known family data; access failures clear it.
 * @author Wang Zhili
 */
export function useFamilyVisitProgress(id: string) {
  const key = useMemo(() => ({ id }), [id])
  const [result, setResult] = useState({ key, ...initialState })
  const reload = useRef<(() => void) | undefined>(undefined)
  const refresh = useCallback(() => reload.current?.(), [])

  useEffect(() => {
    let state = { ...initialState, pause: pauseReason() }
    let parts = emptyParts()
    let account: number | undefined
    let controller: AbortController | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = 15000
    let stopped = false
    let disposed = false
    const publish = (change: Partial<State>) => {
      state = { ...state, ...change }
      setResult({ key, ...state })
    }
    const markParts = (status: 'loading' | 'error') => {
      parts = {
        details: { status, previous: saved(parts.details) },
        timeline: { status, previous: saved(parts.timeline) },
        tasks: { status, previous: saved(parts.tasks) },
      }
      return { status: 'ready' as const, parts }
    }
    const failAll = (error: unknown) => {
      stopped = true
      controller?.abort()
      controller = undefined
      parts = emptyParts()
      account = undefined
      publish({ resource: { status: 'error', error }, refreshing: false, retrySeconds: null })
    }
    async function load(manual = false) {
      if (disposed || controller || state.pause || (stopped && !manual)) return
      stopped = false
      clearTimeout(timer)
      const request = new AbortController()
      controller = request
      const { signal } = request
      const active = () => !signal.aborted && !disposed
      let failed = false
      publish({ refreshing: true, retrySeconds: null,
        resource: state.resource.status === 'ready' ? markParts('loading') : { status: 'loading' } })
      const loadPart = async <K extends keyof VisitData>(part: K, response: Promise<VisitData[K]>) => {
        try {
          const data = await response
          if (!active()) return
          parts = { ...parts, [part]: { status: 'success', data, loadedAt: new Date().toISOString() } }
        } catch (error) {
          if (!active()) return
          if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) { failAll(error); return }
          failed = true
          parts = { ...parts, [part]: { status: 'error', previous: saved(parts[part]) } }
        }
        publish({ resource: { status: 'ready', parts } })
      }
      try {
        if (!/^[1-9]\d{0,18}$/.test(key.id) || BigInt(key.id) > 9223372036854775807n) {
          throw new ApiError('Invalid visit link.', 400)
        }
        const user = await getCurrentUser(signal)
        if (!active()) return
        if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) {
          throw new ApiError('Family access is required.', 403)
        }
        if (account !== user.id) parts = emptyParts()
        account = user.id
        publish({ resource: { status: 'ready', parts } })
        await Promise.all([
          loadPart('details', getFamilyVisit(key.id, signal)),
          loadPart('timeline', getFamilyVisitTimeline(key.id, signal)),
          loadPart('tasks', getFamilyVisitTasks(key.id, signal)),
        ])
      } catch (error) {
        if (!active()) return
        if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) { failAll(error); return }
        failed = true
        publish({ resource: state.resource.status === 'ready' ? markParts('error') : { status: 'error', error } })
      } finally {
        if (active()) {
          controller = undefined
          delay = failed ? Math.min(delay * 2, 60000) : 15000
          publish({ refreshing: false, retrySeconds: failed ? delay / 1000 : null })
          timer = setTimeout(() => { void load() }, delay)
        }
      }
    }
    const activityChanged = () => {
      const pause = pauseReason()
      if (pause === state.pause) return
      clearTimeout(timer)
      controller?.abort()
      controller = undefined
      publish({ pause, refreshing: false, retrySeconds: null })
      if (!pause) void load()
    }
    reload.current = () => { void load(true) }
    document.addEventListener('visibilitychange', activityChanged)
    window.addEventListener('online', activityChanged)
    window.addEventListener('offline', activityChanged)
    publish({ pause: state.pause })
    void load()
    return () => {
      disposed = true
      controller?.abort()
      clearTimeout(timer)
      reload.current = undefined
      document.removeEventListener('visibilitychange', activityChanged)
      window.removeEventListener('online', activityChanged)
      window.removeEventListener('offline', activityChanged)
    }
  }, [key])

  return { ...(result.key === key ? result : initialState), refresh }
}

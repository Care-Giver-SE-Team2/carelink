import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../shared/api/client'
import { getCurrentUser } from '../auth/api'
import { acknowledgeFamilyIncident, getFamilyIncident, viewFamilyIncident } from './familyApi'
import type { FamilyIncidentAcknowledgement, FamilyIncidentDetail } from './familyTypes'

type Resource = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'success'; data: FamilyIncidentDetail }
type CommandState = 'idle' | 'saving' | 'saved' | 'error'
type State = { resource: Resource; view: CommandState; acknowledgement: CommandState }
const initial: State = { resource: { status: 'loading' }, view: 'idle', acknowledgement: 'idle' }

/** Cancels obsolete reads/writes and keeps recipient receipts independent under racing responses.
 * @author Wang Zhili
 */
export function useFamilyIncident(id: string) {
  const [revision, setRevision] = useState(0)
  const key = useMemo(() => ({ id, revision }), [id, revision])
  const [result, setResult] = useState({ key, ...initial })
  const operations = useRef<{ view: () => void; acknowledge: (note: string) => void } | null>(null)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const recordView = useCallback(() => operations.current?.view(), [])
  const acknowledge = useCallback((note: string) => operations.current?.acknowledge(note), [])

  useEffect(() => {
    let state: State = initial
    let disposed = false
    let account: number
    const requests = new Set<AbortController>()
    const publish = (change: Partial<State>) => {
      state = { ...state, ...change }
      setResult({ key, ...state })
    }
    const stop = (error: unknown) => {
      operations.current = null
      requests.forEach((request) => request.abort())
      publish({ ...initial, resource: { status: 'error', error } })
    }
    async function checkSession(signal: AbortSignal) {
      const user = await getCurrentUser(signal)
      signal.throwIfAborted()
      if (!user.roles.some((role) => role.replace(/^ROLE_/, '') === 'FAMILY')) throw new ApiError('Family access is required.', 403)
      return user.id
    }
    // A late view response must not erase awareness saved by a concurrent command.
    const mergeReceipt = (receipt: FamilyIncidentAcknowledgement) => {
      if (state.resource.status !== 'success') return
      const old = state.resource.data.acknowledgement
      const acknowledgement = { ...receipt, viewedAt: receipt.viewedAt ?? old.viewedAt,
        acknowledgedAt: receipt.acknowledgedAt ?? old.acknowledgedAt,
        responseNote: receipt.acknowledgedAt ? receipt.responseNote : old.responseNote }
      publish({ resource: { status: 'success', data: { ...state.resource.data, acknowledgement } } })
    }
    async function command(action: 'view' | 'acknowledgement', note = '') {
      if (disposed || state.resource.status !== 'success' || state[action] === 'saving' || state[action] === 'saved') return
      const request = new AbortController()
      requests.add(request)
      publish({ [action]: 'saving' })
      try {
        if (await checkSession(request.signal) !== account) throw new ApiError('The family session has changed.', 403)
        const receipt = action === 'view' ? await viewFamilyIncident(key.id, request.signal)
          : await acknowledgeFamilyIncident(key.id, note, request.signal)
        if (disposed || request.signal.aborted) return
        mergeReceipt(receipt)
        publish({ [action]: 'saved' })
      } catch (error) {
        if (disposed || request.signal.aborted) return
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) stop(error)
        else publish({ [action]: 'error' })
      } finally { requests.delete(request) }
    }
    const request = new AbortController()
    requests.add(request)
    async function load() {
      try {
        if (!/^[1-9]\d{0,18}$/.test(key.id) || BigInt(key.id) > 9223372036854775807n) throw new ApiError('Invalid incident link.', 400)
        account = await checkSession(request.signal)
        const data = await getFamilyIncident(key.id, request.signal)
        if (disposed || request.signal.aborted) return
        operations.current = { view: () => { void command('view') }, acknowledge: (note) => { void command('acknowledgement', note) } }
        publish({ resource: { status: 'success', data }, view: data.acknowledgement.viewedAt ? 'saved' : 'idle',
          acknowledgement: data.acknowledgement.acknowledgedAt ? 'saved' : 'idle' })
      } catch (error) {
        if (!disposed && !request.signal.aborted) stop(error)
      } finally { requests.delete(request) }
    }
    void load()
    return () => {
      disposed = true
      operations.current = null
      requests.forEach((request) => request.abort())
    }
  }, [key])

  // Hide the previous incident synchronously, before effects run for the new link or refresh.
  const state = result.key === key ? result : initial
  return { ...state, refresh, recordView, acknowledge }
}

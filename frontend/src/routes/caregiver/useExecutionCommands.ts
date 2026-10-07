import { useEffect, useRef, useState } from 'react'
import { checkIn, completeTask, type CheckInInput, type TaskInput } from '../../features/caregiver-execution/api'
import { isAccessFailure, useSelfServiceWrite } from './selfService'
import { unknownResult } from './commandErrors'

type TaskDraft = { status: 'DONE' | 'SKIPPED' | 'REFUSED'; outcome: string; caregiverNote: string }
type Attempt = { visitId: number } & ({ kind: 'CHECK_IN'; input: CheckInInput } | { kind: 'TASK_RESULT'; taskId: number; input: TaskInput })
/** Mounted in the work-pack query owner, so a return refresh does not erase drafts. */
export function useExecutionCommands(reload: () => void) {
  const write = useSelfServiceWrite()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [drafts, setDrafts] = useState<Record<number, TaskDraft>>({})
  const [mode, setMode] = useState<'GPS' | 'MANUAL_LOCATION_NOTE'>('GPS')
  const [note, setNote] = useState('')
  const [fix, setFix] = useState<{ latitude: number; longitude: number; accuracy: number; clientCapturedAt: string } | null>(null)
  const [locating, setLocating] = useState(false)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])
  const [validation, setValidation] = useState('')
  const [saved, setSaved] = useState('')
  const accessError = isAccessFailure(write.error) ? write.error : null
  function clearProtected() {
    generation.current++; setDrafts({}); setAttempt(null); setNote(''); setFix(null); setSaved(''); setValidation(''); setLocating(false)
  }
  function send(next: Attempt) {
    setAttempt(next); setSaved(''); setValidation('')
    void write.send(signal => next.kind === 'CHECK_IN' ? checkIn(next.visitId, next.input, signal) : completeTask(next.visitId, next.taskId, next.input, signal), () => {
      if (next.kind === 'TASK_RESULT') setDrafts(old => { const copy = { ...old }; delete copy[next.taskId]; return copy })
      setAttempt(null); setNote(''); setFix(null); setSaved('Saved on the server. Reloading the work pack…'); reload()
    })
  }
  function locate() {
    if (!navigator.geolocation) { setValidation('Location is unavailable. You may choose a clearly marked manual location note.'); return }
    const token = ++generation.current; setLocating(true); setValidation('')
    navigator.geolocation.getCurrentPosition(position => {
      if (token !== generation.current) return
      setFix({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, clientCapturedAt: new Date(position.timestamp).toISOString() }); setLocating(false)
    }, () => {
      if (token !== generation.current) return
      setLocating(false); setValidation('GPS could not be obtained. Retry GPS or choose a manual location note; no GPS verification will be claimed.')
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }
  return { write, attempt, drafts, setDrafts, mode, setMode, note, setNote, fix, locating, locate, validation, setValidation, saved, accessError, clearProtected,
    blocked: write.pending || attempt !== null || locating,
    uncertain: write.error != null && unknownResult(write.error),
    send, retry: () => { if (attempt) send(attempt) }, edit: () => { setAttempt(null); reload() }, recover: () => { write.clearError(); reload() },
    start: (visitId: number, version: number) => {
      if (mode === 'GPS' && !fix) { setValidation('Obtain a GPS fix before checking in.'); return }
      if (mode === 'MANUAL_LOCATION_NOTE' && (!note.trim() || note.trim().length > 500)) { setValidation('Write a manual location note of 1 to 500 characters.'); return }
      send({ kind: 'CHECK_IN', visitId, input: { expectedVersion: version, clientRequestId: crypto.randomUUID(), locationSource: mode, ...(mode === 'GPS' ? fix! : { locationNote: note.trim() }) } })
    },
    finishTask: (visitId: number, taskId: number, version: number) => {
      const draft = drafts[taskId] ?? { status: 'DONE' as const, outcome: '', caregiverNote: '' }
      if (draft.status !== 'DONE' && !draft.caregiverNote.trim()) { setValidation('Skipped or refused tasks require a factual reason.'); return }
      send({ kind: 'TASK_RESULT', visitId, taskId, input: { ...draft, expectedVersion: version, clientRequestId: crypto.randomUUID() } })
    },
  }
}

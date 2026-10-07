import { api } from '../../shared/api/client'
export type CommandResult = { visitId: number; visitVersion: number; savedState: string | null; taskId: number | null; replayed: boolean }
export type CommandIdentity = { expectedVersion: number; clientRequestId: string }
export type CheckInInput = CommandIdentity & { locationSource: 'GPS' | 'MANUAL_LOCATION_NOTE'; latitude?: number; longitude?: number; accuracy?: number; locationNote?: string; clientCapturedAt?: string }
export type TaskInput = CommandIdentity & { status: 'DONE' | 'SKIPPED' | 'REFUSED'; outcome: string; caregiverNote: string }
async function write(path: string, input: unknown, signal?: AbortSignal) {
  await api('/auth/csrf', { signal })
  return api<CommandResult>(path, { method: 'POST', body: JSON.stringify(input), signal })
}
export function checkIn(id: number, input: CheckInInput, signal?: AbortSignal) { return write(`/visits/${id}/check-in`, input, signal) }
export function completeTask(id: number, task: number, input: TaskInput, signal?: AbortSignal) { return write(`/visits/${id}/tasks/${task}/complete`, input, signal) }

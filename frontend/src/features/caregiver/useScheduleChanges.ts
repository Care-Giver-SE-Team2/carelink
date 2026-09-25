import { useState } from 'react'
import type { Schedule } from './api'
import type { QueryResult } from './useCaregiverQuery'

// Memory-only comparison: never retain elder names, addresses or clinical data.
export type VisitStamp = { id: number; scheduledStart: string; scheduledEnd: string | null; status: string }
export function scheduleChanges(previous: VisitStamp[], current: VisitStamp[]): string[] {
  const before = new Map(previous.map(v => [v.id, v]))
  const changes: string[] = []
  for (const visit of current) {
    const old = before.get(visit.id)
    if (!old) changes.push(`Visit #${visit.id} added to this schedule.`)
    else {
      if (old.scheduledStart !== visit.scheduledStart || old.scheduledEnd !== visit.scheduledEnd)
        changes.push(`Visit #${visit.id} time changed.`)
      if (old.status !== visit.status) changes.push(`Visit #${visit.id} status changed.`)
    }
  }
  const ids = new Set(current.map(v => v.id))
  const removed = previous.filter(v => !ids.has(v.id)).length
  if (removed) changes.push(`${removed} visit${removed === 1 ? '' : 's'} moved out of this schedule. Review your current assignments.`)
  return changes
}

type Comparison = { key: string; revision: number; baseline: VisitStamp[] | null; messages: string[] }
export function useScheduleChanges(key: string, result: QueryResult<Schedule>) {
  const [comparison, setComparison] = useState<Comparison>({ key, revision: -1, baseline: null, messages: [] })
  if (comparison.key !== key || (result.status === 'error' && comparison.baseline !== null)) {
    setComparison({ key, revision: -1, baseline: null, messages: [] })
    return []
  }
  if (result.status === 'success' && result.revision !== comparison.revision) {
    const baseline = result.data.upcomingVisits.map(({ id, scheduledStart, scheduledEnd, status }) =>
      ({ id, scheduledStart, scheduledEnd, status }))
    const messages = comparison.baseline ? scheduleChanges(comparison.baseline, baseline) : []
    setComparison({ key, revision: result.revision, baseline, messages })
    return messages
  }
  return result.status === 'success' ? comparison.messages : []
}

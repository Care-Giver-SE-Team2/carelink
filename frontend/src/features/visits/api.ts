import { api } from '../../shared/api/client'
import type { FamilyVisit } from '../schedule/types'
import type { FamilyVisitTask, FamilyVisitTimelineEntry } from './types'

/** Session-authorized family visit reads; each endpoint validates its own access.
 * @author Wang Zhili
 */
export function getFamilyVisit(id: string, signal: AbortSignal): Promise<FamilyVisit> {
  return api<FamilyVisit>(`/visits/${encodeURIComponent(id)}`, { signal })
}

export function getFamilyVisitTimeline(id: string, signal: AbortSignal): Promise<FamilyVisitTimelineEntry[]> {
  return api<FamilyVisitTimelineEntry[]>(`/visits/${encodeURIComponent(id)}/timeline`, { signal })
}

export function getFamilyVisitTasks(id: string, signal: AbortSignal): Promise<FamilyVisitTask[]> {
  return api<FamilyVisitTask[]>(`/visits/${encodeURIComponent(id)}/tasks`, { signal })
}

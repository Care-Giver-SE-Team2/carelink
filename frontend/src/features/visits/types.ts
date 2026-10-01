import type { FamilyVisitStatus } from '../schedule/types'

/** Family projections of recorded service activity.
 * @author Wang Zhili
 */
export interface FamilyVisitTimelineEntry {
  id: number
  visitId: number
  fromState: FamilyVisitStatus
  toState: FamilyVisitStatus
  result: 'APPLIED'
  occurredAt: string
}

export interface FamilyVisitTask {
  id: number
  visitId: number
  name: string
  status: 'PENDING' | 'DONE' | 'SKIPPED' | 'REFUSED'
  completedAt: string | null
}

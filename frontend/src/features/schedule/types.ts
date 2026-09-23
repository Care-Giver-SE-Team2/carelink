export type FamilyVisitStatus =
  | 'SCHEDULED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'AUTO_CLOSED'
  | 'EXCEPTION'
  | 'CANCELLED'

/**
 * Family-visible visit details and the server's read time.
 * @author Wang Zhili
 */
export interface FamilyVisit {
  id: number
  elderId: number
  caregiverId: number | null
  serviceType: string | null
  scheduledStart: string
  scheduledEnd: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  status: FamilyVisitStatus
  asOf: string
}

export interface FamilyVisitPage {
  items: FamilyVisit[]
  page: number
  size: number
  totalElements: number
}

export interface ScheduleQuery {
  elderId: number
  dateFrom: string
  dateTo: string
  page: number
  size: number
}

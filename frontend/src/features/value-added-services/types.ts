export type ValueAddedService = {
  id: number
  name: string
  description: string | null
  /** How long the visit lasts once the family approves it. */
  durationMinutes: number
  status: 'AVAILABLE' | 'UNAVAILABLE'
}

export type ValueAddedServiceRequestStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED'

export type ValueAddedServiceRequest = {
  id: number
  elderId: number
  valueAddedServiceId: number
  serviceName: string
  requestedByFamilyMemberId: number | null
  approvingFamilyMemberId: number | null
  visitId: number | null
  requestedSchedule: string | null
  specialInstructions: string | null
  status: ValueAddedServiceRequestStatus
  decidedAt: string | null
  createdAt: string
}

export type ValueAddedServiceRequestCreate = {
  valueAddedServiceId: number
  requestedSchedule: string
  specialInstructions: string | null
}

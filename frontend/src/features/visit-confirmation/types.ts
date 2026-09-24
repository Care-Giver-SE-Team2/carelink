export type ConfirmationStatus =
  | 'CONFIRMED'
  | 'DISPUTED'

export interface PendingElderVisit {
  visitId: number
  serviceType: string | null
  scheduledStart: string
  scheduledEnd: string | null
  checkedOutAt: string | null
  status: 'COMPLETED'
}

export interface SubmitVisitConfirmationRequest {
  confirmationStatus: ConfirmationStatus
  rating: number | null
  comment: string | null
}

export interface ElderVisitConfirmation {
  id: number
  visitId: number
  elderId: number
  confirmationStatus: ConfirmationStatus
  rating: number | null
  comment: string | null
  confirmedAt: string
}
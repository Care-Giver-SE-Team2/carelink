/**
 * The shapes of UC-MG08 home service spot checks, as the incident module's
 * SpotCheckService and SpotCheckController send them. Times are Singapore
 * local time without an offset.
 *
 * @author Wang Ziyu
 */

export type SpotCheckStage =
  | 'AWAITING_FAMILY'
  | 'SCHEDULED'
  | 'DECLINED'
  | 'COMPLETED'
  | 'CAREGIVER_NO_SHOW'
  | 'WITHDRAWN'

export type SpotCheckResult = 'MEETS_STANDARD' | 'NEEDS_IMPROVEMENT'

export type SpotCheck = {
  id: number
  elderId: number
  elderName: string
  caregiverId: number
  caregiverName: string
  visitId: number
  visitTime: string
  purpose: string
  stage: SpotCheckStage
  decidedAt: string | null
  result: SpotCheckResult | null
  notes: string | null
  checkedAt: string | null
  closingReason: string | null
  incidentId: number | null
  caregiverResponse: string | null
}

/** A visit a manager may choose to check. */
export type VisitChoice = {
  visitId: number
  start: string
  serviceType: string | null
  caregiverId: number
  caregiverName: string
}

export type SpotCheckQuery = {
  stage?: SpotCheckStage
  caregiverId?: number
  elderId?: number
}

export type IntakeStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
export type MobilityLevel = 'INDEPENDENT' | 'ASSISTIVE_CANE' | 'WHEELCHAIR_BEDBOUND'

/**
 * Family-editable fields accepted when submitting an application.
 * @author Wang Zhili
 */
export interface IntakeApplicationCreateRequest {
  targetElderName: string
  targetAddress: string
  postalCode: string
  targetElderAge?: number
  mobilityLevel?: MobilityLevel
  preferredDialects?: string
  careNeeds?: string[]
  medicalNotes?: string
}

export interface IntakeListQuery {
  page: number
  size: number
  status?: IntakeStatus
}

/**
 * The login created for the elder on approval, while the elder still has its temporary password.
 * Only the detail endpoint sends it, and only to the family member who applied.
 */
export interface PendingElderLogin {
  username: string
  temporaryPassword: string
}

/**
 * Family projection returned by the intake API.
 * @author Wang Zhili
 */
export interface IntakeApplication {
  id: number
  applicantFamilyMemberId: number
  targetElderName: string
  targetElderAge: number | null
  targetAddress: string
  postalCode: string
  mobilityLevel: MobilityLevel
  preferredDialects: string | null
  careNeeds: string[]
  medicalNotes: string | null
  status: IntakeStatus
  reviewRemarks: string | null
  createdAt: string
  reviewedAt: string | null
  elderId: number | null
  /** Absent once the elder has chosen their own password, and on the list endpoint. */
  elderLogin?: PendingElderLogin
}

export interface IntakeApplicationPage {
  items: IntakeApplication[]
  page: number
  size: number
  totalElements: number
}

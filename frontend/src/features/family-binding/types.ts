export type Relationship =
  | 'SON'
  | 'DAUGHTER'
  | 'SPOUSE'
  | 'GUARDIAN'
  | 'OTHER'

export type AccessScope =
  | 'FULL'
  | 'READ_ONLY'

export type BindingStatus =
  | 'PENDING_CONFIRMATION'
  | 'ACTIVE'
  | 'REJECTED'
  | 'REVOKED'

export interface FamilyBinding {
  id: number
  familyMemberId: number
  familyMemberName: string
  relationship: Relationship
  primaryContact: boolean
  accessScope: AccessScope
  status: BindingStatus
  confirmedAt: string | null
  createdAt: string | null
}

export interface CreateFamilyBindingRequest {
  familyUsername: string
  relationship: Relationship
  primaryContact: boolean
  accessScope: AccessScope
}
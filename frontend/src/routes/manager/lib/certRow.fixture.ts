import type { CredentialRegisterRow } from '../../../shared/api/profile'

/** A register row for tests: Devi Raman's pending first aid renewal, 12 days before the old one lapses. */
export function certRow(overrides: Partial<CredentialRegisterRow> = {}): CredentialRegisterRow {
  return {
    id: 1,
    caregiverId: 114,
    caregiverName: 'Devi Raman',
    credentialTypeId: 11,
    credentialTypeName: 'First aid',
    renewal: true,
    state: 'SUBMITTED',
    watchedExpiry: '2026-10-14',
    daysUntilExpiry: 12,
    expiring: true,
    certificateNo: 'SRC-FA-88412',
    issuingBody: 'Singapore Red Cross',
    validFrom: null,
    expiryDate: '2028-08-27',
    submittedAt: '2026-08-27T21:04:00',
    reviewNote: null,
    reviewedAt: null,
    replacesId: 9,
    replacesExpiryDate: '2026-09-09',
    ...overrides,
  }
}

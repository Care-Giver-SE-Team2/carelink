import type { CredentialRegisterRow } from '../../../shared/api/profile'

/** Days before expiry the scheduled scan reminds a caregiver — the policy line's "cert warning 30d". */
export const CERT_WARNING_DAYS = 30
export const CERT_PAGE_SIZE = 10

export type CertFilter = 'review' | 'expiring' | 'all'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Rows the filter shows: waiting for review, due within the warning window, or everything. */
export function filterRows(rows: CredentialRegisterRow[], filter: CertFilter): CredentialRegisterRow[] {
  if (filter === 'review') return rows.filter((row) => row.state === 'SUBMITTED')
  if (filter === 'expiring') return rows.filter((row) => row.expiring)
  return rows
}

export function filterCounts(rows: CredentialRegisterRow[]): Record<CertFilter, number> {
  return {
    review: filterRows(rows, 'review').length,
    expiring: filterRows(rows, 'expiring').length,
    all: rows.length,
  }
}

/** True while it waits for the manager's review. */
export function isSubmission(row: CredentialRegisterRow): boolean {
  return row.state === 'SUBMITTED'
}

/** "First aid · renewal", "Dementia care · new", or just the type once it has been reviewed. */
export function certificationLabel(row: CredentialRegisterRow): string {
  if (!isSubmission(row)) return row.credentialTypeName
  return `${row.credentialTypeName} · ${row.renewal ? 'renewal' : 'new'}`
}

export type ExpiryTone = 'danger' | 'ink' | 'success' | 'muted'

/**
 * The Expires column: red within 14 days or once past, ink within the warning window,
 * green beyond it (in months), and a muted dash when nothing is due.
 */
export function expiryLabel(days: number | null): { text: string; tone: ExpiryTone } {
  if (days === null) return { text: '—', tone: 'muted' }
  if (days < 0) return { text: 'expired', tone: 'danger' }
  if (days === 0) return { text: 'today', tone: 'danger' }
  const dayText = `${days} ${days === 1 ? 'day' : 'days'}`
  if (days <= 14) return { text: dayText, tone: 'danger' }
  if (days <= CERT_WARNING_DAYS) return { text: dayText, tone: 'ink' }
  const months = Math.max(1, Math.floor(days / 30.4375))
  return { text: `${months} ${months === 1 ? 'month' : 'months'}`, tone: 'success' }
}

/** "CGV-0114" — how the caregiver app and the manager refer to a caregiver. */
export function caregiverRef(caregiverId: number): string {
  return `CGV-${String(caregiverId).padStart(4, '0')}`
}

/** "2028-08-27" → "27 Aug 2028". */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`
}

/** "2026-08-27T21:04:00" → "27 Aug 21:04" (a server local time, shown as stored). */
export function formatDateTime(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split('-').map(Number)
  return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${iso.slice(11, 16)}`
}

/** When the scan will next remind the caregiver: the warning window before `expiryDate`. */
export function nextReminder(expiryDate: string): string {
  const date = new Date(`${expiryDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - CERT_WARNING_DAYS)
  return date.toISOString().slice(0, 10)
}

/** "Devi Raman — first aid renewal", "Rosnah Binte Ali — dementia care certificate", "Nur Aisyah — manual handling". */
export function reviewTitle(row: CredentialRegisterRow): string {
  const type = row.credentialTypeName.toLowerCase()
  if (!isSubmission(row)) return `${row.caregiverName} — ${type}`
  return `${row.caregiverName} — ${type} ${row.renewal ? 'renewal' : 'certificate'}`
}

/**
 * The submitted row to open after one is reviewed: the next one down the list, else the
 * nearest one above, else none.
 */
export function nextSubmittedId(rows: CredentialRegisterRow[], reviewedId: number): number | null {
  const index = rows.findIndex((row) => row.id === reviewedId)
  const waiting = (row: CredentialRegisterRow) => row.state === 'SUBMITTED' && row.id !== reviewedId
  const after = rows.slice(index + 1).find(waiting)
  if (after) return after.id
  const before = rows.slice(0, Math.max(index, 0)).reverse().find(waiting)
  return before ? before.id : null
}

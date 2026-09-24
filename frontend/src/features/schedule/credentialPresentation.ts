import { singaporeToday } from './presentation'
import type { FamilyCredential } from './types'

interface CredentialPresentation {
  statusLabel: string
  validityLabel: string
  tone: 'valid' | 'warning' | 'invalid' | 'pending'
}

/**
 * Formats a calendar date without shifting it to the browser's timezone.
 * @param date API date in YYYY-MM-DD format, or an unrecorded start date
 * @return Readable date or a missing/invalid value label
 * @author Wang Zhili
 */
export function credentialDate(date: string | null): string {
  if (date === null) return 'Not provided'
  const parsed = calendarDate(date)
  return parsed
    ? new Intl.DateTimeFormat('en-SG', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(parsed)
    : 'Not available'
}

/**
 * Labels the permanent-expiry sentinel while preserving ordinary calendar dates.
 * @param date Inclusive API expiry date
 * @return Readable expiry date or No expiry
 * @author Wang Zhili
 */
export function credentialExpiryDate(date: string): string {
  return date === '9999-12-31' ? 'No expiry' : credentialDate(date)
}

/**
 * Separates a credential's public status from its current date-based validity.
 * @param credential Public credential returned by the API
 * @param today Current Singapore calendar date, independent of the selected week
 * @return Status, validity and tone without changing the stored credential
 * @author Wang Zhili
 */
export function credentialPresentation(
  credential: FamilyCredential,
  today = singaporeToday(),
): CredentialPresentation {
  const { status, validFrom, expiryDate } = credential
  if (status === 'REVOKED') return { statusLabel: 'Revoked', validityLabel: 'Revoked', tone: 'invalid' }
  if (status === 'EXPIRED') return { statusLabel: 'Expired', validityLabel: 'Expired', tone: 'invalid' }

  const statusLabel = status === 'PUBLISHED' ? 'Published' : status === 'EXPIRING' ? 'Expiring soon' : 'Not available'
  const unavailable: CredentialPresentation = { statusLabel, validityLabel: 'Validity unavailable', tone: 'invalid' }
  if (status !== 'PUBLISHED' && status !== 'EXPIRING') return unavailable
  if (!calendarDate(today) || !calendarDate(expiryDate) || (validFrom !== null && !calendarDate(validFrom))) {
    return unavailable
  }
  if (expiryDate < today) return { statusLabel: 'Expired', validityLabel: 'Expired', tone: 'invalid' }
  if (validFrom !== null && validFrom > expiryDate) return unavailable
  if (validFrom !== null && validFrom > today) return { statusLabel, validityLabel: 'Not yet valid', tone: 'pending' }
  return { statusLabel, validityLabel: 'Currently valid', tone: status === 'EXPIRING' ? 'warning' : 'valid' }
}

function calendarDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

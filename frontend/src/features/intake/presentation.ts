import type { IntakeStatus } from './types'

export const statusLabels: Record<IntakeStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
}

export const statusDescriptions: Record<IntakeStatus, string> = {
  SUBMITTED: 'Your application has been received and is waiting for review.',
  UNDER_REVIEW: 'The care team is reviewing the information in your application.',
  APPROVED: 'The care team has approved this application. See the review details below.',
  REJECTED: 'The care team has not approved this application. Check the review notes below.',
}

export function intakeStatus(value: string | null): IntakeStatus | undefined {
  return value && Object.hasOwn(statusLabels, value) ? (value as IntakeStatus) : undefined
}

/**
 * Formats an API timestamp in Singapore time for the family portal.
 * @param value Timestamp including its UTC offset
 * @return Readable date and time, or a placeholder when unavailable
 * @author Wang Zhili
 */
export function intakeDate(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Singapore',
      }).format(date)
}

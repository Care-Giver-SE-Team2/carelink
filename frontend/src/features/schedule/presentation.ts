import type { FamilyVisitStatus } from './types'

const singapore = 'Asia/Singapore'

export const visitStatusLabels: Record<FamilyVisitStatus, string> = {
  SCHEDULED: 'Scheduled',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified',
  AUTO_CLOSED: 'Automatically closed',
  EXCEPTION: 'Exception',
  CANCELLED: 'Cancelled',
}

/**
 * Gets today's calendar date in Singapore, regardless of the browser's timezone.
 * @param now Current instant
 * @return Date in YYYY-MM-DD format
 * @author Wang Zhili
 */
export function singaporeToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-SG', {
    timeZone: singapore,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * Finds the Monday containing a calendar date.
 * @param date Date in YYYY-MM-DD format
 * @return Monday in YYYY-MM-DD format
 * @author Wang Zhili
 */
export function weekStart(date: string): string {
  const weekday = calendarDate(date).getUTCDay()
  return shiftDays(date, -((weekday + 6) % 7))
}

/**
 * Moves a calendar date without applying browser timezone or daylight saving rules.
 * @param date Date in YYYY-MM-DD format
 * @param days Number of calendar days to move
 * @return Shifted date in YYYY-MM-DD format
 * @author Wang Zhili
 */
export function shiftDays(date: string, days: number): string {
  const result = calendarDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

/**
 * Labels a Monday-to-Sunday calendar range, including both years when needed.
 * @param monday Week's first date in YYYY-MM-DD format
 * @return Readable weekly date range
 * @author Wang Zhili
 */
export function weekLabel(monday: string): string {
  const start = calendarDate(monday)
  const end = calendarDate(shiftDays(monday, 6))
  const startLabel = new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: start.getUTCFullYear() === end.getUTCFullYear() ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(end)
  return `${startLabel} – ${endLabel}`
}

/**
 * Formats a visit's calendar day in Singapore.
 * @param timestamp API timestamp with a UTC offset
 * @return Readable date or an unavailable placeholder
 * @author Wang Zhili
 */
export function visitDate(timestamp: string): string {
  return formatTimestamp(timestamp, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Formats a visit time in Singapore using the 24-hour clock.
 * @param timestamp API timestamp with a UTC offset
 * @return Hour and minute or an unavailable placeholder
 * @author Wang Zhili
 */
export function visitTime(timestamp: string): string {
  return formatTimestamp(timestamp, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/**
 * Labels known services and makes other service names readable.
 * @param raw Service type returned by the API
 * @return A service label, including a fallback when no type was recorded
 * @author Wang Zhili
 */
export function serviceLabel(raw: string | null): string {
  const service = raw?.trim()
  if (!service) return 'Care visit'
  if (service === 'BATHING') return 'Bathing assistance'
  if (service === 'VITALS') return 'Vital signs monitoring'
  const readable = service.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase()
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}

function calendarDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('Expected a valid calendar date in YYYY-MM-DD format')
  }
  return date
}

function formatTimestamp(timestamp: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-SG', { ...options, timeZone: singapore }).format(date)
}

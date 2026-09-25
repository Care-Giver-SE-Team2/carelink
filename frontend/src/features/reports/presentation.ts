import { ApiError } from '../../shared/api/client'
import type { ReportAudience, ReportGeneratedBy, ReportStatus } from './types'

/**
 * Everything the report screens display but do not fetch: labels, the date
 * formats, the default period and the one way of reading an error body.
 *
 * Pure functions, so the parts that go wrong quietly - a date read in the
 * wrong zone, a week that starts on the wrong day, an error that says nothing
 * - are testable without rendering a page.
 *
 * @author Wang Ziyu
 */

export const audienceLabels: Record<ReportAudience, string> = {
  FAMILY: 'Family',
  REGULATOR: 'Regulator',
  INTERNAL: 'Internal',
}

/** What each reader's version leaves out, in a line; shown so nobody has to open three reports to find out. */
export const audienceNotes: Record<ReportAudience, string> = {
  FAMILY: 'Caregivers by name, vital signs as ranges, with the medical disclaimer',
  REGULATOR: 'The full record with caregivers by number; notes counted, not quoted',
  INTERNAL: 'Everything, names included',
}

export const statusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

export const generatedByLabels: Record<ReportGeneratedBy, string> = {
  MODEL: 'Language-model summary',
  TEMPLATE: 'Structured template',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/*
 * The backend sends the period as a LocalDate ("2026-09-14") and createdAt as
 * a LocalDateTime with no offset. Both are read by their characters and never
 * through `new Date(value)`: an offsetless timestamp read by the browser lands
 * in the browser's zone, and a bare date read that way is midnight UTC, which
 * is the previous evening anywhere west of Greenwich.
 */
const DATE = /^(\d{4})-(\d{2})-(\d{2})/
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Formats a date.
 * @param value "2026-09-14", or the date part of a timestamp
 * @return "14 Sep 2026", or a placeholder when there is nothing to show
 */
export function reportDay(value: string | null): string {
  const match = value ? DATE.exec(value) : null
  if (!match) return 'Not available'
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`
}

/**
 * Formats a period, naming the year once when both ends share it.
 * @param start First day, "2026-09-14"
 * @param end Last day, "2026-09-20"
 * @return "14 Sep – 20 Sep 2026", "28 Dec 2026 – 3 Jan 2027" across a year end, or one day
 */
export function reportPeriod(start: string, end: string): string {
  const from = DATE.exec(start)
  const to = DATE.exec(end)
  if (!from || !to) return 'Not available'
  if (from[0] === to[0]) return reportDay(start)
  const first = from[1] === to[1]
    ? `${Number(from[3])} ${MONTHS[Number(from[2]) - 1]}`
    : reportDay(start)
  return `${first} – ${reportDay(end)}`
}

/**
 * Formats a timestamp.
 * @param value "2026-09-20T23:00:00", with or without fractional seconds
 * @return "20 Sep 2026 23:00", or a placeholder when there is nothing to show
 */
export function reportTime(value: string | null): string {
  const match = value ? TIMESTAMP.exec(value) : null
  if (!match) return 'Not available'
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]} ${match[4]}:${match[5]}`
}

/**
 * Today's date on the browser's own calendar, in the backend's LocalDate form.
 * The browser is where the manager is, which is the calendar the default
 * period should follow.
 * @return "YYYY-MM-DD"
 */
export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The Monday-to-Sunday week before the one a day falls in: what the generate
 * form offers by default ("last week").
 *
 * Worked out with Date.UTC on the date's own numbers, so no zone is involved
 * and the answer is the same on every machine.
 * @param today "YYYY-MM-DD"
 * @return The first and last day of last week, in the same form
 */
export function previousWeek(today: string): { start: string; end: string } {
  const match = DATE.exec(today)
  if (!match) throw new Error('Not a date: ' + today)
  const day = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const sinceMonday = (new Date(day).getUTCDay() + 6) % 7
  const DAY = 24 * 60 * 60 * 1000
  const thisMonday = day - sinceMonday * DAY
  return { start: isoDay(thisMonday - 7 * DAY), end: isoDay(thisMonday - DAY) }
}

function isoDay(utcMillis: number): string {
  const date = new Date(utcMillis)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/**
 * A section body as lines. The backend writes one item per line, and indents
 * the steps of an incident's timeline by two spaces under the incident.
 * @param body Section text
 * @return Each line, with whether it is one of those indented steps
 */
export function sectionLines(body: string): { text: string; nested: boolean }[] {
  return body
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => ({ text: line.trim(), nested: line.startsWith('  ') }))
}

/**
 * Reads the message out of an RFC 9457 problem body.
 *
 * The same reading as the incident screens' - the shared client looks for a
 * `message` field the backend never sends, so the sentence a manager needs is
 * in `detail`, and a 400's complaints are in `fields`. Kept as its own copy
 * rather than imported across features; the day it moves to `shared/`, both go.
 *
 * @param error Whatever was thrown
 * @return The server's own words when it supplied any, otherwise a plain fallback
 */
export function problemDetail(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'The request could not be completed. Check your connection and try again.'
  }

  const body = error.body
  if (body && typeof body === 'object') {
    const problem = body as { detail?: unknown; title?: unknown; fields?: unknown }
    const headline =
      typeof problem.detail === 'string' && problem.detail.trim()
        ? problem.detail
        : typeof problem.title === 'string' && problem.title.trim()
          ? problem.title
          : ''
    const fields =
      problem.fields && typeof problem.fields === 'object'
        ? Object.entries(problem.fields as Record<string, unknown>).map(
            ([name, message]) => `${name}: ${String(message)}`,
          )
        : []

    if (headline || fields.length) return [headline, ...fields].filter(Boolean).join(' — ')
  }

  return error.message
}

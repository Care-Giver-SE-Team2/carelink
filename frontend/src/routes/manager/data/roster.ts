import type { VisitBlockState } from '../../../shared/components/ui'
import type { CaregiverOption } from '../../../shared/api/profile'
import type { VisitResponse } from '../../../shared/api/visit'
import type { ElderRow } from './elders'

/**
 * Roster tab data — the Day timeline and Week grid, shaped from the same endpoints as the
 * Today board: GET /api/visits/roster per day, named via GET /api/elders and
 * GET /api/caregivers. Visits come from published care plans (UC-MG03); one with no
 * caregiver is shown in a "Needs cover" row of its own.
 *
 * Dates are ISO "yyyy-MM-dd" strings in Singapore time, the same wall clock the visits use.
 */

export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 20
export const CAP_HOURS_PER_DAY = 8
export const CAP_HOURS_PER_WEEK = 40
/** Caregiver rows per page. */
export const ROSTER_PAGE_SIZE = 10
/** Minutes a visit is counted for when it has no scheduled end. */
const DEFAULT_MINUTES = 60
const COVER_ROW_ID = 'needs-cover'

export type RosterBlock = {
  id: string
  elderShort: string
  label: string
  state: VisitBlockState
  /** Hour the visit starts in, e.g. 9 for 09:30 — blocks snap to their hour column. */
  hour: number
  minutes: number
  title: string
}

export type RosterRow = {
  id: string
  name: string
  subLine: string
  /** `cover` is the row of visits nobody is assigned to yet. */
  kind: 'caregiver' | 'cover'
}

export type TimelineRow = RosterRow & { blocks: RosterBlock[] }

export type DayTimeline = { rows: TimelineRow[]; startHour: number; endHour: number }

export type WeekDay = { date: string; label: string; isToday: boolean; isPast: boolean }

export type DayLoad = { visits: number; hours: number; exceptions: number }

export type WeekRow = RosterRow & { days: DayLoad[]; totalHours: number }

// ---------------------------------------------------------------------------------------
// Dates

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function fromUtc(day: Date): string {
  return day.toISOString().slice(0, 10)
}

/** Today's date in Singapore, whatever the browser's zone. */
export function singaporeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(now)
}

export function addDays(date: string, days: number): string {
  const day = toUtc(date)
  day.setUTCDate(day.getUTCDate() + days)
  return fromUtc(day)
}

/** The Monday of the week the date falls in. */
export function mondayOf(date: string): string {
  const weekday = toUtc(date).getUTCDay()
  return addDays(date, weekday === 0 ? -6 : 1 - weekday)
}

/** ISO-8601 week number. */
export function isoWeek(date: string): number {
  const thursday = toUtc(addDays(mondayOf(date), 3))
  const firstOfYear = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - firstOfYear) / 86_400_000 / 7) + 1
}

function dayAndMonth(date: string): string {
  const day = toUtc(date)
  return `${day.getUTCDate()} ${MONTH_NAMES[day.getUTCMonth()]}`
}

/** "Thu 28 Aug" */
export function dayContext(date: string): string {
  return `${DAY_NAMES[toUtc(date).getUTCDay()]} ${dayAndMonth(date)}`
}

/** "Week 35 · 25–31 Aug", or "Week 40 · 28 Sep–4 Oct" across a month end. */
export function weekContext(date: string): string {
  const monday = mondayOf(date)
  const sunday = addDays(monday, 6)
  const sameMonth = monday.slice(5, 7) === sunday.slice(5, 7)
  const range = sameMonth
    ? `${toUtc(monday).getUTCDate()}–${dayAndMonth(sunday)}`
    : `${dayAndMonth(monday)}–${dayAndMonth(sunday)}`
  return `Week ${isoWeek(date)} · ${range}`
}

/** Monday to Sunday of the date's week, today marked and the days before it flagged past. */
export function weekDays(date: string, today: string): WeekDay[] {
  const monday = mondayOf(date)
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i)
    return {
      date: day,
      label: `${DAY_NAMES[toUtc(day).getUTCDay()]} ${toUtc(day).getUTCDate()}`,
      isToday: day === today,
      isPast: day < today,
    }
  })
}

// ---------------------------------------------------------------------------------------
// Names

/** "Tan Hock Seng" → "Tan H.S."; a one-word name is left whole. */
export function elderShort(fullName: string): string {
  const [family, ...given] = fullName.trim().split(/\s+/)
  if (given.length === 0) return family
  return `${family} ${given.map((part) => `${part[0].toUpperCase()}.`).join('')}`
}

/** "S45 · Malay, English" — whichever parts are known. */
function caregiverSubLine(caregiver: CaregiverOption): string {
  const languages = (caregiver.dialects ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
  return [caregiver.sector, languages].filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------------------------------
// Visits

function minutesOf(visit: VisitResponse): number {
  if (!visit.scheduledEnd) return DEFAULT_MINUTES
  const minutes = (Date.parse(`${visit.scheduledEnd}Z`) - Date.parse(`${visit.scheduledStart}Z`)) / 60_000
  return minutes > 0 ? minutes : DEFAULT_MINUTES
}

function blockState(visit: VisitResponse): VisitBlockState {
  // An exception outranks the gap: an uncovered visit past its start is an exception.
  if (visit.caregiverId == null && visit.status !== 'EXCEPTION') return 'needs_cover'
  switch (visit.status) {
    case 'COMPLETED':
    case 'VERIFIED':
    case 'AUTO_CLOSED':
      return 'closed'
    case 'EXCEPTION':
      return 'exception'
    default:
      return 'assigned'
  }
}

/**
 * Who gets a row: every caregiver who can take visits, plus anyone else (onboarding,
 * inactive) who still has one in the range. Caregivers with an exception in the range come
 * first, so they land on page 1; then by name. "Needs cover" goes last when any visit has
 * nobody.
 */
function rosterRows(visits: VisitResponse[], caregivers: CaregiverOption[]): RosterRow[] {
  const withVisits = new Set(visits.map((visit) => visit.caregiverId))
  const withExceptions = new Set(
    visits.filter((visit) => visit.status === 'EXCEPTION').map((visit) => visit.caregiverId),
  )
  const rows: RosterRow[] = caregivers
    .filter((caregiver) => caregiver.assignable || withVisits.has(caregiver.id))
    .sort(
      (a, b) =>
        Number(withExceptions.has(b.id)) - Number(withExceptions.has(a.id)) || a.fullName.localeCompare(b.fullName),
    )
    .map((caregiver) => ({
      id: String(caregiver.id),
      name: caregiver.fullName,
      subLine: caregiverSubLine(caregiver),
      kind: 'caregiver',
    }))
  const known = new Set(rows.map((row) => row.id))
  for (const id of withVisits) {
    if (id != null && !known.has(String(id))) {
      rows.push({ id: String(id), name: `Caregiver #${id}`, subLine: '', kind: 'caregiver' })
      known.add(String(id))
    }
  }
  const uncovered = visits.filter((visit) => visit.caregiverId == null).length
  if (uncovered > 0) {
    rows.push({ id: COVER_ROW_ID, name: 'Needs cover', subLine: `${uncovered} unassigned`, kind: 'cover' })
  }
  return rows
}

function rowIdOf(visit: VisitResponse): string {
  return visit.caregiverId == null ? COVER_ROW_ID : String(visit.caregiverId)
}

/** One day as caregiver rows of hour-placed blocks, widened past 08–20 if a visit falls outside. */
export function toDayTimeline(visits: VisitResponse[], caregivers: CaregiverOption[], elders: ElderRow[]): DayTimeline {
  const elderNames = new Map(elders.map((elder) => [elder.id, elder.name]))
  const blocks = visits.map((visit) => {
    const elderName = elderNames.get(String(visit.elderId)) ?? `Elder #${visit.elderId}`
    const time = visit.scheduledStart.slice(11, 16)
    const service = visit.serviceType ?? 'visit'
    const minutes = minutesOf(visit)
    const block: RosterBlock = {
      id: String(visit.id),
      elderShort: elderShort(elderName),
      label: visit.status === 'EXCEPTION' ? 'exception' : service,
      state: blockState(visit),
      hour: Number(visit.scheduledStart.slice(11, 13)),
      minutes,
      title: `${time} · ${elderName} · ${service} · ${minutes} min`,
    }
    return { rowId: rowIdOf(visit), block }
  })

  const startHour = Math.min(DAY_START_HOUR, ...blocks.map(({ block }) => block.hour))
  const endHour = Math.max(
    DAY_END_HOUR,
    ...blocks.map(({ block }) => block.hour + Math.max(1, Math.ceil(block.minutes / 60))),
  )
  const rows = rosterRows(visits, caregivers).map((row) => ({
    ...row,
    blocks: blocks.filter(({ rowId }) => rowId === row.id).map(({ block }) => block),
  }))
  return { rows, startHour, endHour }
}

/** One week as caregiver rows of per-day load: visit count, hours and exceptions. */
export function toWeek(visitsByDay: VisitResponse[][], caregivers: CaregiverOption[]): WeekRow[] {
  return rosterRows(visitsByDay.flat(), caregivers).map((row) => {
    const days = visitsByDay.map((visits) => {
      const mine = visits.filter((visit) => rowIdOf(visit) === row.id)
      return {
        visits: mine.length,
        hours: mine.reduce((sum, visit) => sum + minutesOf(visit), 0) / 60,
        exceptions: mine.filter((visit) => visit.status === 'EXCEPTION').length,
      }
    })
    return { ...row, days, totalHours: days.reduce((sum, day) => sum + day.hours, 0) }
  })
}

/**
 * One page of caregiver rows, with the "Needs cover" row kept on every page: it is not a
 * caregiver, so it is neither counted in the total nor pushed off by paging. `page` is
 * clamped to the pages that exist.
 */
export function pageOf<T extends RosterRow>(
  rows: T[],
  page: number,
  pageSize: number = ROSTER_PAGE_SIZE,
): { rows: T[]; page: number; total: number } {
  const caregivers = rows.filter((row) => row.kind === 'caregiver')
  const cover = rows.filter((row) => row.kind === 'cover')
  const lastPage = Math.max(1, Math.ceil(caregivers.length / pageSize))
  const current = Math.min(Math.max(1, page), lastPage)
  const start = (current - 1) * pageSize
  return { rows: [...caregivers.slice(start, start + pageSize), ...cover], page: current, total: caregivers.length }
}

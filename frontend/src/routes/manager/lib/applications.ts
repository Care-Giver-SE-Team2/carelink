import type { IntakeCheck, IntakeMobilityLevel, IntakeReview } from '../../../shared/api/profile'
import type { TagTone } from '../../../shared/components/ui'

/** Families are promised an answer within this many working days of submitting. */
export const RESPONSE_WORKING_DAYS = 2

/** Under this much time left, the countdown turns red. */
const URGENT_MS = 4 * 60 * 60 * 1000

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export const APPLICATION_PAGE_SIZE = 12

export type ApplicationFlag = 'new' | 'noCover'

export const FLAG_TAG: Record<ApplicationFlag, { label: string; tone: TagTone }> = {
  new: { label: 'NEW', tone: 'accent' },
  noCover: { label: 'NO COVER', tone: 'muted' },
}

/** The list's one-word summary of the checks: NO COVER when the sector has nobody free. */
export function applicationFlag(checks: IntakeCheck[]): ApplicationFlag {
  if (checks.some((c) => c.key === 'sector' && !c.pass)) return 'noCover'
  return 'new'
}

/** "Hokkien" → "Hokkien-speaking caregiver"; "Cantonese, Mandarin" → "Cantonese or Mandarin-speaking caregiver". */
function dialectCheckLabel(preferredDialects: string | null): string {
  const dialects = (preferredDialects ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
  return dialects.length ? `${dialects.join(' or ')}-speaking caregiver` : 'Caregiver speaking their language'
}

export function checkLabel(check: IntakeCheck, application: IntakeReview): string {
  switch (check.key) {
    case 'contact':
      return 'Mobile number on file'
    case 'sector':
      return application.sector ? `Sector ${application.sector} covered` : 'Postcode in a covered sector'
    case 'dialect':
      return dialectCheckLabel(application.preferredDialects)
  }
}

function caregivers(count: number): string {
  return `${count} ${count === 1 ? 'caregiver' : 'caregivers'}`
}

/** The result beside a check: "4 caregivers free", "2 in S31", "no mobile number". */
export function checkDetail(check: IntakeCheck, application: IntakeReview): string {
  const sector = application.sector
  switch (check.key) {
    case 'contact':
      return check.pass ? 'on file' : 'no mobile number'
    case 'sector':
      if (!sector) return 'no elders nearby yet'
      return check.pass ? `${caregivers(check.count ?? 0)} free` : 'no caregivers free'
    case 'dialect':
      if (!sector) return 'no sector yet'
      return check.pass ? `${check.count ?? 0} in ${sector}` : `none in ${sector}`
  }
}

const MOBILITY: Record<IntakeMobilityLevel, string> = {
  INDEPENDENT: 'moves independently',
  ASSISTIVE_CANE: 'walking aid',
  WHEELCHAIR_BEDBOUND: 'wheelchair / bed-bound',
}

export function mobilityLabel(level: IntakeMobilityLevel): string {
  return MOBILITY[level]
}

/** The two care needs the family form offers as checkboxes; anything else is the family's own words. */
const CARE_NEEDS: Record<string, string> = {
  BATHING: 'Bathing assistance',
  VITALS: 'Vital signs monitoring',
}

export function careNeedsLabel(careNeeds: string[]): string {
  return careNeeds.map((need) => CARE_NEEDS[need] ?? need).join(', ')
}

/** "83 · walking aid" — the age, and the mobility when it isn't independent. */
export function careForMeta(application: IntakeReview): string {
  const age = application.targetElderAge === null ? 'age not given' : String(application.targetElderAge)
  return application.mobilityLevel === 'INDEPENDENT' ? age : `${age} · ${mobilityLabel(application.mobilityLevel)}`
}

export function applicationTitle(application: IntakeReview): string {
  return `${application.applicant.fullName}, for ${application.targetElderName}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-09-05T02:12:00Z" → "5 Sep 10:12", in Singapore time. */
export function formatReceived(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Singapore',
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1]} ${parts.hour}:${parts.minute}`
}

/** When the family should have an answer by: the submission time, RESPONSE_WORKING_DAYS weekdays later. */
export function responseDeadline(submittedAt: Date): Date {
  const deadline = new Date(submittedAt)
  let added = 0
  while (added < RESPONSE_WORKING_DAYS) {
    deadline.setDate(deadline.getDate() + 1)
    const day = deadline.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return deadline
}

/** "1 day 4 h left", "3 h left" (urgent), "overdue" (urgent). */
export function responseCountdown(submittedAt: string, now: Date): { text: string; urgent: boolean } {
  const left = responseDeadline(new Date(submittedAt)).getTime() - now.getTime()
  if (left <= 0) return { text: 'overdue', urgent: true }
  const days = Math.floor(left / DAY_MS)
  const hours = Math.floor((left % DAY_MS) / HOUR_MS)
  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours} h`)
  return { text: parts.length ? `${parts.join(' ')} left` : 'under 1 h left', urgent: left < URGENT_MS }
}

/** The row to open once `id` is answered: the next one down, else the one above, else none. */
export function nextApplicationId(rows: IntakeReview[], id: number): number | null {
  const index = rows.findIndex((row) => row.id === id)
  if (index === -1) return null
  return rows[index + 1]?.id ?? rows[index - 1]?.id ?? null
}

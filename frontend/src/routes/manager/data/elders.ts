/**
 * Fixture data for the Elders index (5d) and Care plan (2a) screens —
 * UC-MG01 "set up a care plan". Hardcoded per README.md ("现阶段" — no
 * backend yet); shapes follow the state-management notes in the design
 * handoff so swapping in a real API later only touches this file.
 */

export type PlanStatus = 'published' | 'draft' | 'none'

export type ElderRow = {
  id: string
  name: string
  age: number
  street: string
  sector: string
  planStatus: PlanStatus
  planVersion: number | null
  primaryCaregiver: string | null
  nextVisitAt: string | null
}

export type Contact = { name: string; relation: string; access: string }
export type Exception = { kind: string; date: string }

export type ElderDetail = {
  id: string
  livingSituation: string
  addressFull: string
  contacts: Contact[]
  openExceptions: Exception[]
}

export const TOTAL_ELDERS_IN_SECTORS = 62
export const ELDERS_WITHOUT_PUBLISHED_PLAN = 3

/** Sectors Tan Mei Ling manages directly. An elder outside these is visible
 * (managers can look up any elder) but their plan opens read-only. */
export const MANAGER_HOME_SECTORS = ['S31']

export function isOutOfSector(elder: Pick<ElderRow, 'sector'>): boolean {
  return !MANAGER_HOME_SECTORS.includes(elder.sector)
}

export const ELDERS: ElderRow[] = [
  {
    id: 'ELD-0311',
    name: 'Chan Bee Choo',
    age: 83,
    street: 'Bishan St 23',
    sector: 'S31',
    planStatus: 'published',
    planVersion: 4,
    primaryCaregiver: 'Aisyah N.',
    nextVisitAt: 'today 14:00',
  },
  {
    id: 'ELD-0288',
    name: 'Beatrice Lim Swee Hong',
    age: 79,
    street: 'Ang Mo Kio Ave 3',
    sector: 'S31',
    planStatus: 'published',
    planVersion: 2,
    primaryCaregiver: 'Fadhil R.',
    nextVisitAt: 'tomorrow 09:30',
  },
  {
    id: 'ELD-0354',
    name: 'Goh Bee Lian',
    age: 88,
    street: 'Bishan St 11',
    sector: 'S31',
    planStatus: 'none',
    planVersion: null,
    primaryCaregiver: null,
    nextVisitAt: null,
  },
  {
    id: 'ELD-0402',
    name: 'Kamala Devi Rajan',
    age: 76,
    street: 'Toa Payoh Lor 4',
    sector: 'S34',
    planStatus: 'draft',
    planVersion: 5,
    primaryCaregiver: 'Siti H.',
    nextVisitAt: 'Thu 11:00',
  },
  {
    id: 'ELD-0193',
    name: 'Ong Kim Bee',
    age: 91,
    street: 'Bishan St 22',
    sector: 'S31',
    planStatus: 'published',
    planVersion: 9,
    primaryCaregiver: 'Aisyah N.',
    nextVisitAt: 'today 17:30',
  },
  {
    id: 'ELD-0367',
    name: 'Tan Ah Bee',
    age: 84,
    street: 'Ang Mo Kio Ave 10',
    sector: 'S34',
    planStatus: 'published',
    planVersion: 1,
    primaryCaregiver: 'Fadhil R.',
    nextVisitAt: 'Fri 08:00',
  },
]

export const ELDER_DETAILS: Record<string, ElderDetail> = {
  'ELD-0311': {
    id: 'ELD-0311',
    livingSituation: 'lives alone',
    addressFull: 'Blk 217 Bishan St 23, #08-142',
    contacts: [
      { name: 'Grace Tan', relation: 'daughter', access: 'primary' },
      { name: 'Melvin Tan', relation: 'son', access: 'view only' },
    ],
    openExceptions: [{ kind: 'missed check-in', date: '26 Aug' }],
  },
  'ELD-0288': {
    id: 'ELD-0288',
    livingSituation: 'lives with spouse',
    addressFull: 'Blk 337 Ang Mo Kio Ave 3, #05-88',
    contacts: [{ name: 'Wong Swee Hong', relation: 'husband', access: 'primary' }],
    openExceptions: [],
  },
  'ELD-0354': {
    id: 'ELD-0354',
    livingSituation: 'lives alone',
    addressFull: 'Blk 154 Bishan St 11, #12-06',
    contacts: [{ name: 'Lian Wei Jie', relation: 'son', access: 'primary' }],
    openExceptions: [],
  },
  'ELD-0402': {
    id: 'ELD-0402',
    livingSituation: 'lives with family',
    addressFull: 'Blk 78 Toa Payoh Lor 4, #03-221',
    contacts: [
      { name: 'Priya Rajan', relation: 'daughter', access: 'primary' },
      { name: 'Suresh Rajan', relation: 'son', access: 'view only' },
    ],
    openExceptions: [{ kind: 'late visit', date: '02 Sep' }],
  },
  'ELD-0193': {
    id: 'ELD-0193',
    livingSituation: 'lives alone',
    addressFull: 'Blk 221 Bishan St 22, #10-317',
    contacts: [{ name: 'Ong Hui Min', relation: 'granddaughter', access: 'primary' }],
    openExceptions: [],
  },
  'ELD-0367': {
    id: 'ELD-0367',
    livingSituation: 'lives with spouse',
    addressFull: 'Blk 419 Ang Mo Kio Ave 10, #02-55',
    contacts: [{ name: 'Tan Guat Choo', relation: 'wife', access: 'primary' }],
    openExceptions: [],
  },
}

export function findElder(id: string): ElderRow | undefined {
  return ELDERS.find((e) => e.id === id)
}

/**
 * Stands in for `GET /api/elders` until that endpoint exists and joins in
 * planStatus/primaryCaregiver/nextVisitAt from careplan and visit. Kept async
 * so callers (React Query) don't need to change when this is swapped for a
 * real fetch.
 */
export function fetchElders(): Promise<ElderRow[]> {
  return Promise.resolve(ELDERS)
}

import { fetchElderList } from '../../../shared/api/profile'
import { ageFromDateOfBirth } from '../lib/age'

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

/**
 * GET /api/elders, mapped down to ElderRow. primaryCaregiver and nextVisitAt
 * aren't sourced yet (rostering/visit modules), so they're always null until
 * those are wired up too.
 */
export async function fetchElders(): Promise<ElderRow[]> {
  const rows = await fetchElderList()
  return rows.map((r) => ({
    id: String(r.id),
    name: r.fullName,
    age: ageFromDateOfBirth(r.dateOfBirth),
    street: r.address ?? '',
    sector: r.sector ?? '',
    planStatus: r.planStatus,
    planVersion: r.planVersion,
    primaryCaregiver: null,
    nextVisitAt: null,
  }))
}

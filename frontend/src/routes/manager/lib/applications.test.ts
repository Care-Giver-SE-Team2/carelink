import { describe, expect, it } from 'vitest'
import type { IntakeCheck, IntakeReview } from '../../../shared/api/profile'
import {
  applicationFlag,
  careForMeta,
  careNeedsLabel,
  checkDetail,
  checkLabel,
  formatReceived,
  nextApplicationId,
  responseCountdown,
  responseDeadline,
} from './applications'

function application(overrides: Partial<IntakeReview> = {}): IntakeReview {
  return {
    id: 1,
    applicantFamilyMemberId: 1,
    applicant: { fullName: 'Grace Tan Wei Ling', username: 'grace.tan', phone: '+65 9123 4488' },
    targetElderName: 'Tan Bee Choo',
    targetElderAge: 83,
    targetAddress: 'Blk 230 Bishan St 23, #04-117',
    postalCode: '570230',
    mobilityLevel: 'ASSISTIVE_CANE',
    preferredDialects: 'Hokkien',
    careNeeds: [],
    medicalNotes: null,
    status: 'SUBMITTED',
    reviewRemarks: null,
    createdAt: '2026-09-05T02:12:00Z',
    reviewedAt: null,
    elderId: null,
    sector: 'S31',
    checks: [],
    ...overrides,
  }
}

const check = (key: IntakeCheck['key'], ok: boolean, extra: Partial<IntakeCheck> = {}): IntakeCheck => ({
  key,
  pass: ok,
  count: null,
  ...extra,
})
const pass = (key: IntakeCheck['key'], extra?: Partial<IntakeCheck>) => check(key, true, extra)
const fail = (key: IntakeCheck['key'], extra?: Partial<IntakeCheck>) => check(key, false, extra)

describe('applicationFlag', () => {
  it('is NEW when the sector has someone free, NO COVER when it has nobody', () => {
    expect(applicationFlag([pass('contact'), pass('sector'), pass('dialect')])).toBe('new')
    expect(applicationFlag([pass('contact'), fail('sector')])).toBe('noCover')
  })

  it('ignores contact and dialect failures', () => {
    expect(applicationFlag([fail('contact'), fail('dialect')])).toBe('new')
  })
})

describe('checkLabel', () => {
  it('names the sector and the dialects the family asked for', () => {
    const app = application({ preferredDialects: 'Cantonese, Mandarin' })
    expect(checkLabel(pass('sector'), app)).toBe('Sector S31 covered')
    expect(checkLabel(pass('dialect'), app)).toBe('Cantonese or Mandarin-speaking caregiver')
    expect(checkLabel(fail('sector'), application({ sector: null }))).toBe('Postcode in a covered sector')
  })
})

describe('checkDetail', () => {
  it('words each result from its counts and match', () => {
    const app = application()
    expect(checkDetail(pass('contact'), app)).toBe('on file')
    expect(checkDetail(fail('contact'), app)).toBe('no mobile number')
    expect(checkDetail(pass('sector', { count: 1 }), app)).toBe('1 caregiver free')
    expect(checkDetail(pass('sector', { count: 4 }), app)).toBe('4 caregivers free')
    expect(checkDetail(fail('sector', { count: 0 }), app)).toBe('no caregivers free')
    expect(checkDetail(pass('dialect', { count: 2 }), app)).toBe('2 in S31')
    expect(checkDetail(fail('dialect', { count: 0 }), app)).toBe('none in S31')
  })

  it('says so when the sector is unknown', () => {
    const app = application({ sector: null })
    expect(checkDetail(fail('sector'), app)).toBe('no elders nearby yet')
    expect(checkDetail(fail('dialect'), app)).toBe('no sector yet')
  })
})

describe('careForMeta / careNeedsLabel', () => {
  it('shows the age, and the mobility unless independent', () => {
    expect(careForMeta(application())).toBe('83 · walking aid')
    expect(careForMeta(application({ mobilityLevel: 'INDEPENDENT', targetElderAge: null }))).toBe('age not given')
  })

  it('spells out the form’s checkbox codes and keeps the family’s own words', () => {
    expect(careNeedsLabel(['BATHING', 'VITALS', 'Meal preparation'])).toBe(
      'Bathing assistance, Vital signs monitoring, Meal preparation',
    )
  })
})

describe('formatReceived', () => {
  it('shows the submission in Singapore time', () => {
    expect(formatReceived('2026-09-05T02:12:00Z')).toBe('5 Sep 10:12')
  })
})

describe('response countdown', () => {
  it('skips the weekend when counting two working days', () => {
    // Friday 10:00 → Tuesday 10:00
    expect(responseDeadline(new Date(2026, 8, 4, 10, 0))).toEqual(new Date(2026, 8, 8, 10, 0))
    // Wednesday 10:00 → Friday 10:00
    expect(responseDeadline(new Date(2026, 8, 2, 10, 0))).toEqual(new Date(2026, 8, 4, 10, 0))
  })

  it('counts down in days and hours, turning urgent under 4 h and after the deadline', () => {
    const submitted = new Date(2026, 8, 2, 10, 0).toISOString() // Wednesday; due Friday 10:00
    expect(responseCountdown(submitted, new Date(2026, 8, 3, 6, 0))).toEqual({ text: '1 day 4 h left', urgent: false })
    expect(responseCountdown(submitted, new Date(2026, 8, 4, 7, 0))).toEqual({ text: '3 h left', urgent: true })
    expect(responseCountdown(submitted, new Date(2026, 8, 4, 9, 30))).toEqual({ text: 'under 1 h left', urgent: true })
    expect(responseCountdown(submitted, new Date(2026, 8, 4, 10, 0))).toEqual({ text: 'overdue', urgent: true })
  })
})

describe('nextApplicationId', () => {
  it('moves to the next row, or the one above at the end, or none', () => {
    const rows = [application({ id: 3 }), application({ id: 2 }), application({ id: 1 })]
    expect(nextApplicationId(rows, 3)).toBe(2)
    expect(nextApplicationId(rows, 1)).toBe(2)
    expect(nextApplicationId([application({ id: 1 })], 1)).toBeNull()
  })
})

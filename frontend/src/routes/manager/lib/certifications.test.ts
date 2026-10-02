import { describe, expect, it } from 'vitest'
import {
  caregiverRef,
  certificationLabel,
  expiryLabel,
  filterCounts,
  filterRows,
  formatDate,
  formatDateTime,
  nextReminder,
  nextSubmittedId,
  reviewTitle,
} from './certifications'
import { certRow } from './certRow.fixture'

describe('certification filters', () => {
  const rows = [
    certRow({ id: 1 }),
    certRow({ id: 2, renewal: false, watchedExpiry: null, daysUntilExpiry: null, expiring: false }),
    certRow({ id: 3, state: 'REMINDED', daysUntilExpiry: 21 }),
    certRow({ id: 4, state: 'PUBLISHED', daysUntilExpiry: 240, expiring: false }),
  ]

  it('splits submitted, expiring and all', () => {
    expect(filterRows(rows, 'review').map((r) => r.id)).toEqual([1, 2])
    expect(filterRows(rows, 'expiring').map((r) => r.id)).toEqual([1, 3])
    expect(filterCounts(rows)).toEqual({ review: 2, expiring: 2, all: 4 })
  })
})

describe('expiryLabel', () => {
  it.each([
    [null, '—', 'muted'],
    [-2, 'expired', 'danger'],
    [0, 'today', 'danger'],
    [1, '1 day', 'danger'],
    [14, '14 days', 'danger'],
    [15, '15 days', 'ink'],
    [30, '30 days', 'ink'],
    [31, '1 month', 'success'],
    [245, '8 months', 'success'],
  ])('%s days reads %s in %s', (days, text, tone) => {
    expect(expiryLabel(days)).toEqual({ text, tone })
  })
})

describe('labels', () => {
  it('names submissions as a renewal or a new certificate', () => {
    expect(certificationLabel(certRow())).toBe('First aid · renewal')
    expect(certificationLabel(certRow({ renewal: false, credentialTypeName: 'Dementia care' }))).toBe('Dementia care · new')
    expect(certificationLabel(certRow({ state: 'PUBLISHED' }))).toBe('First aid')
    expect(reviewTitle(certRow())).toBe('Devi Raman — first aid renewal')
    expect(reviewTitle(certRow({ state: 'REMINDED', caregiverName: 'Nur Aisyah', credentialTypeName: 'Manual handling' }))).toBe(
      'Nur Aisyah — manual handling',
    )
  })

  it('formats references and dates the way the mockup does', () => {
    expect(caregiverRef(114)).toBe('CGV-0114')
    expect(formatDate('2026-09-09')).toBe('09 Sep 2026')
    expect(formatDateTime('2026-08-27T21:04:00')).toBe('27 Aug 21:04')
    expect(nextReminder('2028-08-27')).toBe('2028-07-28')
  })
})

describe('nextSubmittedId', () => {
  const rows = [
    certRow({ id: 1 }),
    certRow({ id: 2 }),
    certRow({ id: 3, state: 'REMINDED' }),
    certRow({ id: 4 }),
  ]

  it('opens the next submitted row below, else the nearest above, else none', () => {
    expect(nextSubmittedId(rows, 2)).toBe(4)
    expect(nextSubmittedId(rows, 4)).toBe(2)
    expect(nextSubmittedId([certRow({ id: 1 })], 1)).toBeNull()
  })
})

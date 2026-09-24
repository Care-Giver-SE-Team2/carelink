import { afterEach, describe, expect, it, vi } from 'vitest'
import { credentialDate, credentialExpiryDate, credentialPresentation } from './credentialPresentation'
import type { FamilyCredential } from './types'

const credential: FamilyCredential = {
  id: 401,
  caregiverId: 201,
  credentialTypeId: 11,
  credentialTypeName: 'First Aid',
  issuingBody: 'Example Training Centre',
  validFrom: '2026-01-01',
  expiryDate: '2026-09-24',
  status: 'PUBLISHED',
}

afterEach(() => vi.useRealTimers())

describe('credential calendar dates', () => {
  it.each([
    ['2026-09-24', '24 Sept 2026'],
    ['2027-01-01', '1 Jan 2027'],
    ['2028-02-29', '29 Feb 2028'],
    [null, 'Not provided'],
    ['', 'Not available'],
    ['2026-02-29', 'Not available'],
    ['2026-04-31', 'Not available'],
    ['2026-9-24', 'Not available'],
    ['2026-09-24T00:00:00Z', 'Not available'],
  ])('formats %s without shifting the calendar day', (date, expected) => {
    expect(credentialDate(date)).toBe(expected)
  })

  it('reserves the permanent sentinel for expiry labels', () => {
    expect(credentialExpiryDate('9999-12-31')).toBe('No expiry')
    expect(credentialDate('9999-12-31')).toBe('31 Dec 9999')
    expect(credentialExpiryDate('2026-09-24')).toBe('24 Sept 2026')
    expect(credentialExpiryDate('invalid')).toBe('Not available')
  })
})

describe('current credential validity', () => {
  it.each([
    ['PUBLISHED', 'Published', 'valid'],
    ['EXPIRING', 'Expiring soon', 'warning'],
  ] as const)('keeps %s valid through its expiry date', (status, statusLabel, tone) => {
    expect(credentialPresentation({ ...credential, status }, '2026-09-24')).toEqual({
      statusLabel, validityLabel: 'Currently valid', tone,
    })
  })

  it.each(['PUBLISHED', 'EXPIRING'] as const)('marks past-expiry %s invalid without changing the response', (status) => {
    const original = { ...credential, status }

    expect(credentialPresentation(original, '2026-09-25')).toEqual({
      statusLabel: 'Expired', validityLabel: 'Expired', tone: 'invalid',
    })
    expect(original.status).toBe(status)
  })

  it.each([
    ['REVOKED', 'Revoked'],
    ['EXPIRED', 'Expired'],
  ] as const)('keeps %s invalid even with permanent expiry and a future start', (status, label) => {
    expect(credentialPresentation({
      ...credential, status, expiryDate: '9999-12-31', validFrom: '2027-01-01',
    }, '2026-09-24')).toEqual({ statusLabel: label, validityLabel: label, tone: 'invalid' })
  })

  it.each([
    ['PUBLISHED', 'Published'],
    ['EXPIRING', 'Expiring soon'],
  ] as const)('keeps the public %s label when a permanent credential has not started', (status, statusLabel) => {
    expect(credentialPresentation({
      ...credential, status, expiryDate: '9999-12-31', validFrom: '2027-01-01',
    }, '2026-12-31')).toEqual({ statusLabel, validityLabel: 'Not yet valid', tone: 'pending' })
  })

  it('becomes valid on the start date, including across a year boundary', () => {
    expect(credentialPresentation({
      ...credential, expiryDate: '9999-12-31', validFrom: '2027-01-01',
    }, '2027-01-01')).toEqual({ statusLabel: 'Published', validityLabel: 'Currently valid', tone: 'valid' })
  })

  it('allows an unrecorded start date and does not invent an expiry-warning threshold', () => {
    expect(credentialPresentation({ ...credential, validFrom: null }, '2026-09-23')).toEqual({
      statusLabel: 'Published', validityLabel: 'Currently valid', tone: 'valid',
    })
    expect(credentialPresentation({
      ...credential, expiryDate: '9999-12-31', status: 'EXPIRING',
    }, '2026-09-23')).toEqual({ statusLabel: 'Expiring soon', validityLabel: 'Currently valid', tone: 'warning' })
  })

  it.each([
    ['2026-09-24T15:59:59Z', 'Currently valid'],
    ['2026-09-24T16:00:00Z', 'Expired'],
  ])('uses the current Singapore day at %s', (instant, validityLabel) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(instant))

    expect(credentialPresentation(credential).validityLabel).toBe(validityLabel)
  })

  it('handles leap-day expiry using complete calendar dates', () => {
    const leapCredential = { ...credential, expiryDate: '2028-02-29' }

    expect(credentialPresentation(leapCredential, '2028-02-29').validityLabel).toBe('Currently valid')
    expect(credentialPresentation(leapCredential, '2028-03-01').validityLabel).toBe('Expired')
  })

  it.each([
    { expiryDate: 'invalid' },
    { expiryDate: '2026-02-30' },
    { expiryDate: null },
    { validFrom: '2026-09-31' },
    { validFrom: '' },
    { validFrom: undefined },
    { validFrom: '2027-01-01', expiryDate: '2026-12-31' },
    { status: 'SUBMITTED' },
    { status: '__proto__' },
  ])('does not claim validity for malformed runtime data: %j', (override) => {
    const malformed = { ...credential, ...override } as FamilyCredential

    expect(credentialPresentation(malformed, '2026-09-24')).toMatchObject({
      validityLabel: 'Validity unavailable', tone: 'invalid',
    })
  })

  it('does not claim validity when the supplied current date is invalid', () => {
    expect(credentialPresentation(credential, '2026-02-30')).toMatchObject({
      validityLabel: 'Validity unavailable', tone: 'invalid',
    })
  })
})

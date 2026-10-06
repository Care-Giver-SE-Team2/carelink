import { describe, expect, it } from 'vitest'

import { absenceDays, progressLine, settledLine, singaporeDate, visitTime } from './presentation'
import type { AbsenceSummary } from './types'

/** @author Wang Ziyu */

const absence: AbsenceSummary = {
  id: 1,
  caregiverId: 5,
  caregiverName: 'Aisha',
  type: 'SICK',
  startDate: '2026-10-08',
  endDate: '2026-10-09',
  reason: 'flu',
  status: 'APPROVED',
  reviewedByUserId: 11,
  coverageConfirmedAt: null,
  notYetRerostered: 0,
  awaitingFamily: 0,
  uncovered: 0,
  settled: 0,
}

describe('times and days', () => {
  it('reads a Singapore-local time as written', () => {
    expect(visitTime('2026-10-08T09:00:00')).toBe('Thu 8 Oct, 09:00')
    expect(visitTime(null)).toBe('Not set')
    expect(visitTime('soon')).toBe('soon')
  })

  it('names one day or a span of days', () => {
    expect(absenceDays('2026-10-08', '2026-10-08')).toBe('8 Oct')
    expect(absenceDays('2026-10-08', '2026-10-09')).toBe('8 Oct to 9 Oct')
  })

  it('gives today in Singapore whatever the browser zone', () => {
    expect(singaporeDate(new Date('2026-10-07T17:30:00Z'))).toBe('2026-10-08')
    expect(singaporeDate(new Date('2026-10-07T15:30:00Z'))).toBe('2026-10-07')
  })
})

describe('progress', () => {
  it('says where an absence stands', () => {
    expect(progressLine({ ...absence, status: 'PENDING' })).toBe('Waiting for review')
    expect(progressLine(absence)).toBe('Nothing to re-roster')
    expect(progressLine({ ...absence, notYetRerostered: 2, awaitingFamily: 1, uncovered: 1, settled: 3 }))
      .toBe('2 to re-roster · 1 waiting for families · 1 uncovered · 3 settled')
    expect(progressLine({ ...absence, coverageConfirmedAt: '2026-10-08T12:00:00' })).toBe('Coverage confirmed')
  })

  it('says what became of a settled change and who decided', () => {
    expect(settledLine({
      outcome: 'REPLACED',
      decidedBy: 'FAMILY',
      assignedCaregiver: { name: 'Farah' },
      rescheduledStart: null,
    })).toBe('Another caregiver (Farah), decided by the family')
    expect(settledLine({
      outcome: 'RESCHEDULED',
      decidedBy: 'FAMILY',
      assignedCaregiver: { name: 'Aisha' },
      rescheduledStart: '2026-10-10T09:00:00',
    })).toBe('Moved to Sat 10 Oct, 09:00 with Aisha, decided by the family')
    expect(settledLine({ outcome: 'WITHDRAWN', decidedBy: null, assignedCaregiver: null, rescheduledStart: null }))
      .toBe('Called off elsewhere')
    expect(settledLine({ outcome: null, decidedBy: null, assignedCaregiver: null, rescheduledStart: null })).toBe('')
  })
})

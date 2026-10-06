import { describe, expect, it } from 'vitest'

import { endingLine, isOpen } from './presentation'
import type { SpotCheck } from './types'

/** @author Wang Ziyu */

const check: SpotCheck = {
  id: 100,
  elderId: 7,
  elderName: 'Mdm Tan',
  caregiverId: 5,
  caregiverName: 'Aisha',
  visitId: 30,
  visitTime: '2026-10-09T10:00:00',
  purpose: 'Routine',
  stage: 'AWAITING_FAMILY',
  decidedAt: null,
  result: null,
  notes: null,
  checkedAt: null,
  closingReason: null,
  incidentId: null,
  caregiverResponse: null,
}

describe('spot check wording', () => {
  it('is open while the family decides or the day has not come', () => {
    expect(isOpen(check)).toBe(true)
    expect(isOpen({ stage: 'SCHEDULED' })).toBe(true)
    expect(isOpen({ stage: 'COMPLETED' })).toBe(false)
  })

  it('says how each check ended', () => {
    expect(endingLine({ ...check, stage: 'COMPLETED', result: 'NEEDS_IMPROVEMENT', notes: 'gloves' }))
      .toBe('Needs improvement — gloves')
    expect(endingLine({ ...check, stage: 'COMPLETED', result: 'MEETS_STANDARD' })).toBe('Meets the standard')
    expect(endingLine({ ...check, stage: 'COMPLETED' })).toBe('Concluded')
    expect(endingLine({ ...check, stage: 'CAREGIVER_NO_SHOW' })).toContain('exception queue')
    expect(endingLine({ ...check, stage: 'DECLINED', closingReason: 'unwell' })).toBe('Declined: unwell')
    expect(endingLine({ ...check, stage: 'WITHDRAWN' })).toBe('Withdrawn: no reason given')
    expect(endingLine(check)).toBe('Waiting for the family')
  })
})

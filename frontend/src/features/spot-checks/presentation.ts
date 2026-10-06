import type { SpotCheck, SpotCheckResult, SpotCheckStage } from './types'

/**
 * Words for UC-MG08's stages, shared by the manager console and the family
 * portal so both say the same thing about the same check.
 *
 * @author Wang Ziyu
 */

export const stageLabels: Record<SpotCheckStage, string> = {
  AWAITING_FAMILY: 'Waiting for the family',
  SCHEDULED: 'Agreed, on the day',
  DECLINED: 'Declined by the family',
  COMPLETED: 'Concluded',
  CAREGIVER_NO_SHOW: 'Caregiver did not come',
  WITHDRAWN: 'Withdrawn',
}

export const stages: SpotCheckStage[] = [
  'AWAITING_FAMILY',
  'SCHEDULED',
  'COMPLETED',
  'CAREGIVER_NO_SHOW',
  'DECLINED',
  'WITHDRAWN',
]

export const resultLabels: Record<SpotCheckResult, string> = {
  MEETS_STANDARD: 'Meets the standard',
  NEEDS_IMPROVEMENT: 'Needs improvement',
}

/** Whether the check is still going: waiting for the family, or agreed and not yet carried out. */
export function isOpen(check: Pick<SpotCheck, 'stage'>): boolean {
  return check.stage === 'AWAITING_FAMILY' || check.stage === 'SCHEDULED'
}

/** One line saying how a check ended, for lists. */
export function endingLine(check: SpotCheck): string {
  switch (check.stage) {
    case 'COMPLETED':
      return check.result ? resultLabels[check.result] + (check.notes ? ` — ${check.notes}` : '') : 'Concluded'
    case 'CAREGIVER_NO_SHOW':
      return 'The caregiver did not come; the missed visit went to the exception queue'
    case 'DECLINED':
      return 'Declined: ' + (check.closingReason ?? 'no reason given')
    case 'WITHDRAWN':
      return 'Withdrawn: ' + (check.closingReason ?? 'no reason given')
    default:
      return stageLabels[check.stage]
  }
}

import { api } from '../../shared/api/client'

import type {
  ElderVisitConfirmation,
  PendingElderVisit,
  SubmitVisitConfirmationRequest,
} from './types'

export function getVisitsAwaitingConfirmation():
Promise<PendingElderVisit[]> {
  return api<PendingElderVisit[]>(
    '/elders/me/visits/awaiting-confirmation',
  )
}

export function submitVisitConfirmation(
  visitId: number,
  request: SubmitVisitConfirmationRequest,
): Promise<ElderVisitConfirmation> {
  return api<ElderVisitConfirmation>(
    `/elders/me/visits/${visitId}/confirmation`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
}
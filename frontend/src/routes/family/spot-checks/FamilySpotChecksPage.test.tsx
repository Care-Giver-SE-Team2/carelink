import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

import { FamilySpotChecksPage } from './FamilySpotChecksPage'
import * as spotChecksApi from '../../../features/spot-checks/api'
import type { SpotCheck } from '../../../features/spot-checks/types'

/** The family's part of UC-MG08: agree, or decline with a reason; read the conclusions. @author Wang Ziyu */

const waiting: SpotCheck = {
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

const concluded: SpotCheck = {
  ...waiting,
  id: 101,
  visitTime: '2026-10-02T10:00:00',
  stage: 'COMPLETED',
  result: 'MEETS_STANDARD',
  notes: 'Warm and careful',
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FamilySpotChecksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('asks the family to agree and shows earlier conclusions', async () => {
  vi.spyOn(spotChecksApi, 'listSpotChecks').mockResolvedValue([waiting, concluded])
  const decide = vi.spyOn(spotChecksApi, 'decideSpotCheck').mockResolvedValue(waiting)

  renderPage()

  const card = await screen.findByRole('article', { name: 'Spot check of the visit on Fri 9 Oct, 10:00' })
  expect(within(card).getByText(/with Aisha. Why: Routine/)).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Other spot checks' })).toHaveTextContent('Meets the standard — Warm and careful')

  expect(within(card).getByRole('button', { name: 'Decline' })).toBeDisabled()
  await userEvent.type(within(card).getByLabelText('Or decline, and tell us why'), 'Mother is unwell')
  await userEvent.click(within(card).getByRole('button', { name: 'Decline' }))
  expect(decide).toHaveBeenLastCalledWith(100, false, 'Mother is unwell')

  await userEvent.click(within(card).getByRole('button', { name: 'Agree' }))
  expect(decide).toHaveBeenLastCalledWith(100, true, undefined)
})

it('says so when nobody has asked', async () => {
  vi.spyOn(spotChecksApi, 'listSpotChecks').mockResolvedValue([])

  renderPage()

  expect(await screen.findByText('No spot checks')).toBeInTheDocument()
})

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

import { FamilyRosterChangesPage } from './FamilyRosterChangesPage'
import * as absencesApi from '../../../features/absences/api'
import type { FamilyChange } from '../../../features/absences/types'
import { ApiError } from '../../../shared/api/client'

/**
 * The family's part of UC-MG04: the suggestion and the options, the time to
 * answer by, and what each answer sends.
 *
 * @author Wang Ziyu
 */

const waiting: FamilyChange = {
  id: 100,
  elderId: 7,
  elderName: 'Mdm Tan',
  visitStart: '2026-10-08T09:00:00',
  visitEnd: '2026-10-08T09:45:00',
  usualCaregiverName: 'Aisha',
  status: 'AWAITING_FAMILY',
  respondBy: '2026-10-07T11:00:00',
  suggestedCaregiverId: 9,
  options: [
    { caregiverId: 9, name: 'Farah', rank: 1, reason: 'Has visited this elder 3 times before' },
    { caregiverId: 10, name: 'Siti', rank: 2, reason: 'Free at that time' },
  ],
  outcome: null,
  decidedBy: null,
  decidedAt: null,
  assignedCaregiver: null,
  rescheduledStart: null,
  note: null,
}

const settled: FamilyChange = {
  ...waiting,
  id: 101,
  visitStart: '2026-10-09T09:00:00',
  status: 'RESOLVED',
  options: [],
  outcome: 'REPLACED',
  decidedBy: 'DEFAULT_PLAN',
  assignedCaregiver: { caregiverId: 9, name: 'Farah' },
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
        <FamilyRosterChangesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows who is away, the suggestion, the options and the time to answer by', async () => {
  vi.spyOn(absencesApi, 'listFamilyChanges').mockResolvedValue([waiting, settled])

  renderPage()

  const card = await screen.findByRole('article', { name: 'Change to the visit on Thu 8 Oct, 09:00' })
  expect(within(card).getByText(/Aisha is away for this visit. We suggest Farah/)).toBeInTheDocument()
  expect(within(card).getByText('Please answer by Wed 7 Oct, 11:00')).toBeInTheDocument()
  expect(within(card).getByRole('radio', { name: /Farah/ })).toBeChecked()
  expect(screen.getByRole('region', { name: 'Earlier changes' }))
    .toHaveTextContent('Another caregiver (Farah), decided by the default plan')
})

it('sends the caregiver picked, a new time, or a skip', async () => {
  vi.spyOn(absencesApi, 'listFamilyChanges').mockResolvedValue([waiting])
  const decide = vi.spyOn(absencesApi, 'decideChange').mockResolvedValue(settled)

  renderPage()
  const card = await screen.findByRole('article')
  await userEvent.click(within(card).getByRole('radio', { name: /Siti/ }))
  await userEvent.click(within(card).getByRole('button', { name: 'Confirm caregiver' }))
  expect(decide).toHaveBeenLastCalledWith(100, { choice: 'CHANGE_CAREGIVER', caregiverId: 10 })

  fireEvent.change(within(card).getByLabelText('Or move the visit to'), { target: { value: '2026-10-10T09:00' } })
  await userEvent.click(within(card).getByRole('button', { name: 'Move visit' }))
  expect(decide).toHaveBeenLastCalledWith(100, { choice: 'RESCHEDULE', newStart: '2026-10-10T09:00:00' })

  await userEvent.click(within(card).getByRole('button', { name: 'Skip this visit' }))
  expect(decide).toHaveBeenLastCalledWith(100, { choice: 'SKIP' })
})

it('shows why an answer was refused', async () => {
  vi.spyOn(absencesApi, 'listFamilyChanges').mockResolvedValue([waiting])
  vi.spyOn(absencesApi, 'decideChange').mockRejectedValue(
    new ApiError('conflict', 409, { detail: 'The time to choose ended at 7 Oct 11:00' }),
  )

  renderPage()
  const card = await screen.findByRole('article')
  await userEvent.click(within(card).getByRole('button', { name: 'Skip this visit' }))

  expect(await within(card).findByRole('alert')).toHaveTextContent('The time to choose ended at 7 Oct 11:00')
})

it('says so when nothing has changed', async () => {
  vi.spyOn(absencesApi, 'listFamilyChanges').mockResolvedValue([])

  renderPage()

  expect(await screen.findByText('No changes')).toBeInTheDocument()
})

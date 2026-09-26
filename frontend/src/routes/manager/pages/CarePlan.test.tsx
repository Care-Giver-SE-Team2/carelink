import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import CarePlan from './CarePlan'
import * as authApi from '../../../features/auth/api'
import * as carePlanApi from '../../../shared/api/careplan'
import * as profileApi from '../../../shared/api/profile'
import type { CarePlanNodeResponse, CarePlanResponse } from '../../../shared/api/careplan'
import type { ElderResponse } from '../../../shared/api/profile'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const everyDay = (minutes: number) =>
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({ day, minutes }))

const nodes: CarePlanNodeResponse[] = [
  { id: 1, groupName: 'Personal care', name: 'Grooming', visits: [{ day: 'Mon', minutes: 15 }, { day: 'Fri', minutes: 15 }], evidenceType: 'CHECKLIST', weeklyHours: null },
  { id: 2, groupName: 'Medication support', name: 'Morning reminder', visits: everyDay(5), evidenceType: 'CHECKLIST', weeklyHours: null },
  { id: 3, groupName: 'Medication support', name: 'Evening reminder', visits: everyDay(5), evidenceType: 'CHECKLIST', weeklyHours: null },
]

beforeEach(() => {
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(profileApi, 'fetchElder').mockResolvedValue({
    id: 7,
    fullName: 'Chan Bee Choo',
    dateOfBirth: '1943-01-01',
    address: 'Bishan St 23',
    sector: 'S31',
    livesAlone: true,
  } as ElderResponse)
  vi.spyOn(carePlanApi, 'fetchLatestCarePlan').mockResolvedValue({
    id: 42,
    version: 4,
    status: 'PUBLISHED',
    startDate: '2024-04-11',
    updatedAt: '2026-08-26T10:00:00',
    stopEffectiveDate: null,
    stopReason: null,
  } as CarePlanResponse)
  vi.spyOn(carePlanApi, 'fetchCarePlanNodes').mockResolvedValue(nodes)
})

async function renderPlanInDraft() {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/manager/elders/7']}>
        <Routes>
          <Route path="/manager/elders/:elderId" element={<CarePlan />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText('Grooming · Mon, Fri')
  // A published plan opens read-only; editing starts a draft.
  expect(screen.queryByRole('button', { name: 'Remove task from sub-plan' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Edit plan' }))
  return user
}

it('asks before deleting a sub-plan, and Cancel keeps it', async () => {
  const user = await renderPlanInDraft()

  await user.click(screen.getByRole('button', { name: 'Delete sub-plan Medication support and its tasks' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete "Medication support"?' })
  expect(dialog).toHaveTextContent('This sub-plan has 2 tasks totalling 1.17 h/week. Deleting it removes both tasks')

  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Medication support' })).toBeInTheDocument()
})

it('deletes the sub-plan and its tasks on confirm, and recomputes the total', async () => {
  const user = await renderPlanInDraft()
  expect(screen.getByText('1.67 h')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Delete sub-plan Medication support and its tasks' }))
  await user.click(screen.getByRole('button', { name: 'Delete sub-plan' }))

  expect(screen.queryByRole('button', { name: 'Medication support' })).not.toBeInTheDocument()
  expect(screen.queryByText('Morning reminder · daily')).not.toBeInTheDocument()
  // Plan total (and the Personal care row) now read 0.50 h.
  expect(screen.getAllByText('0.50 h').length).toBeGreaterThanOrEqual(2)
  expect(screen.getByRole('status')).toHaveTextContent('changes weekly effort 1.67 h → 0.50 h')
})

it('removes a task at once, without a confirmation', async () => {
  const user = await renderPlanInDraft()
  const row = screen.getByText('Morning reminder · daily').parentElement!

  await user.click(within(row).getByRole('button', { name: 'Remove task from sub-plan' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText('Morning reminder · daily')).not.toBeInTheDocument()
  expect(screen.getByText('Evening reminder · daily')).toBeInTheDocument()
})

it('adds a sub-plan from the grouped activity picker and a per-day schedule', async () => {
  const user = await renderPlanInDraft()
  await user.click(screen.getByRole('button', { name: 'Add sub-plan' }))

  const submit = screen.getByRole('button', { name: /^Add sub-plan \(/ })
  expect(submit).toBeDisabled()

  await user.selectOptions(screen.getByLabelText('Step 1 · select sub-plan'), 'Companionship walk')
  await user.click(screen.getByRole('button', { name: 'Tuesday' }))
  await user.click(screen.getByRole('button', { name: 'Saturday' }))
  expect(submit).toHaveTextContent('Add sub-plan (2 activities)')
  await user.click(submit)

  expect(screen.getByRole('button', { name: 'Social and mobility' })).toBeInTheDocument()
  expect(screen.getByText('Companionship walk · Tue, Sat')).toBeInTheDocument()
})

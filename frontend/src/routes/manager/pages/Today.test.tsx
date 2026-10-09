import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Today from './Today'
import * as authApi from '../../../features/auth/api'
import * as incidentsApi from '../../../features/incidents/api'
import * as profileApi from '../../../shared/api/profile'
import type { ElderListItem } from '../../../shared/api/profile'
import * as rosteringApi from '../../../shared/api/rostering'
import * as visitApi from '../../../shared/api/visit'
import type { VisitResponse } from '../../../shared/api/visit'

const elder = (id: number, fullName: string, sector: string): ElderListItem => ({
  id,
  fullName,
  sector,
  dateOfBirth: null,
  address: null,
  planStatus: 'none',
  planVersion: null,
  nextVisitDate: null,
  primaryCaregiverId: null,
  primaryCaregiverName: null,
  primaryCaregiverAssignedAt: null,
})

const visit = (
  id: number,
  time: string,
  elderId: number,
  caregiverId: number | null,
  serviceType: string,
  status: VisitResponse['status'],
): VisitResponse => ({
  id,
  elderId,
  caregiverId,
  serviceType,
  status,
  scheduledStart: `2026-09-27T${time}:00`,
  scheduledEnd: null,
  checkedInAt: null,
  checkedOutAt: null,
  stateDeadline: null,
  carePlanNodeId: null,
  absenceId: null,
  carePlanId: null,
  version: 0,
  createdAt: null,
  updatedAt: null,
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  // The queue's own total: 7 still need attention.
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockImplementation(async ({ size }) => ({
    items: [],
    page: 0,
    size,
    totalElements: 7,
  }))
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(profileApi, 'fetchElderList').mockResolvedValue([
    elder(1, 'Lim Ah Kow', 'S45'),
    elder(2, 'Chan Bee Choo', 'S31'),
    elder(3, 'Mohd Yusof', 'S52'),
    elder(4, 'Goh Siew Lan', 'S45'),
    elder(5, 'Tan Hock Seng', 'S31'),
  ])
  vi.spyOn(profileApi, 'fetchCaregivers').mockResolvedValue([
    { id: 10, fullName: 'Siti Rahmah', sector: 'S45', status: 'BUSY', assignable: false },
    { id: 11, fullName: 'Kamala Devi', sector: 'S52', status: 'AVAILABLE', assignable: true },
    { id: 12, fullName: 'Hafiz Rahman', sector: 'S52', status: 'BUSY', assignable: false },
  ])
  vi.spyOn(visitApi, 'fetchDayRoster').mockResolvedValue([
    visit(1, '08:00', 1, 10, 'Bathing assist', 'VERIFIED'),
    visit(2, '09:00', 2, 11, 'Vital-sign check', 'IN_PROGRESS'),
    visit(4, '09:00', 3, 12, 'Medication reminder', 'EXCEPTION'),
    visit(5, '11:00', 5, null, 'Companionship', 'SCHEDULED'),
    visit(6, '13:00', 1, 11, 'Companionship', 'SCHEDULED'),
  ])
})

function renderToday() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route path="/manager" element={<Today />} />
          <Route path="/manager/exceptions" element={<p>exceptions tab</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('counts visits from the roster, and shows the same open-exceptions figure as the nav from one query', async () => {
  renderToday()
  const kpis = screen.getByLabelText('Today at a glance')
  const scheduled = within(kpis).getByText('Visits scheduled').closest('div')
  await vi.waitFor(() => expect(scheduled).toHaveTextContent('Visits scheduled5'))
  expect(within(kpis).getByText('Completed').closest('div')).toHaveTextContent('Completed1')
  expect(within(kpis).getByText('Unassigned').closest('div')).toHaveTextContent('Unassigned1')
  expect(within(kpis).getByText('Open exceptions').closest('div')).toHaveTextContent('Open exceptions7')
  expect(within(kpis).queryByText('Escalated')).not.toBeInTheDocument()

  const nav = screen.getByRole('navigation', { name: 'Manager console' })
  expect(within(nav).getByRole('link', { name: /Exceptions/ })).toHaveTextContent('Exceptions7')
  const unfiltered = vi.mocked(incidentsApi.listIncidentQueue).mock.calls.filter(([query]) => !query.status)
  expect(unfiltered).toEqual([[{ page: 0, size: 1 }, expect.anything()]])
  expect(within(nav).getByRole('link', { name: /Today/ })).toHaveAttribute('aria-current', 'page')
})

it('leaves exceptions to the Exceptions tab: no queue or escalation chain on the board', async () => {
  renderToday()
  await screen.findByRole('table', { name: 'Visit roster' })
  expect(screen.queryByRole('region', { name: 'Exception queue' })).not.toBeInTheDocument()
  expect(screen.queryByRole('region', { name: /Escalation chain/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

it('opens the Exceptions tab from the Open exceptions figure', async () => {
  renderToday()
  await userEvent.click(await screen.findByRole('link', { name: 'Open exceptions 7' }))
  expect(await screen.findByText('exceptions tab')).toBeInTheDocument()
})

it('opens the Exceptions tab from the nav count', async () => {
  renderToday()
  const nav = screen.getByRole('navigation', { name: 'Manager console' })
  await userEvent.click(within(nav).getByRole('link', { name: /Exceptions/ }))
  expect(await screen.findByText('exceptions tab')).toBeInTheDocument()
})

it('lists today’s visits by name, flagging the unassigned one and the exception', async () => {
  renderToday()
  const table = await screen.findByRole('table', { name: 'Visit roster' })
  await within(table).findByText('Tan Hock Seng')
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(6)
  const unassigned = rows.find((row) => row.textContent?.includes('Tan Hock Seng'))!
  expect(within(unassigned).getByText('Unassigned')).toBeInTheDocument()
  expect(within(unassigned).getByText('NEEDS COVER')).toBeInTheDocument()
  const missed = rows.find((row) => row.textContent?.includes('Mohd Yusof'))!
  expect(within(missed).getByText('Hafiz Rahman')).toBeInTheDocument()
  expect(within(missed).getByText('EXCEPTION')).toBeInTheDocument()
  expect(screen.getByText('5 visits today · sector S31 / S45 / S52')).toBeInTheDocument()
})

it('assigns an unassigned visit that has not started from its row', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-27T10:00:00+08:00'))
  try {
    vi.spyOn(rosteringApi, 'fetchOpenVisitCandidates').mockResolvedValue([
      { caregiverId: 11, name: 'Kamala Devi', rank: 1, score: 75, reason: 'Lightest day', excludedBy: null },
    ])
    const assign = vi
      .spyOn(rosteringApi, 'assignOpenVisit')
      .mockResolvedValue({ visitId: 5, caregiverId: 11, caregiverName: 'Kamala Devi' })
    renderToday()

    const table = await screen.findByRole('table', { name: 'Visit roster' })
    const button = await within(table).findByRole('button', { name: 'Assign Tan Hock Seng Companionship' })
    expect(within(table).getAllByRole('button', { name: /^Assign/ })).toHaveLength(1)
    await userEvent.click(button)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Today · 11:00 · currently unassigned')).toBeInTheDocument()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Assign' }))

    expect(assign).toHaveBeenCalledWith(5, 11)
    expect(await screen.findByRole('status')).toHaveTextContent("Kamala Devi is now on Tan Hock Seng's Companionship at 11:00.")
  } finally {
    vi.useRealTimers()
  }
})

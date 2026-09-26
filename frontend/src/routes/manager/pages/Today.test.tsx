import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Today from './Today'
import * as authApi from '../../../features/auth/api'
import * as incidentsApi from '../../../features/incidents/api'
import * as profileApi from '../../../shared/api/profile'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockResolvedValue({ items: [], page: 0, size: 1, totalElements: 7 })
  vi.spyOn(profileApi, 'fetchCaregivers').mockResolvedValue([
    { id: 11, fullName: 'Kamala Devi', sector: 'S52', status: 'AVAILABLE', assignable: true },
  ])
})

function renderToday() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route path="/manager" element={<Today />} />
          <Route path="/manager/exceptions/:id" element={<p>exception workbench</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows the headline figures, and the nav counts incidents still needing attention', async () => {
  renderToday()
  const kpis = screen.getByLabelText('Today at a glance')
  expect(await within(kpis).findByText('86')).toBeInTheDocument()
  expect(within(kpis).getByText('Open exceptions').closest('div')).toHaveTextContent('Open exceptions4')

  const exceptionsLink = screen.getByRole('link', { name: /Exceptions/ })
  expect(await within(exceptionsLink).findByText('7')).toBeInTheDocument()
  expect(incidentsApi.listIncidentQueue).toHaveBeenCalledWith({ page: 0, size: 1 }, expect.anything())
  expect(screen.getByRole('link', { name: /Today/ })).toHaveAttribute('aria-current', 'page')
})

it('lists today’s visits, flagging the unassigned one, with the count of the rest', async () => {
  renderToday()
  const table = await screen.findByRole('table', { name: 'Visit roster' })
  await within(table).findByText('Tan Hock Seng')
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(8)
  const unassigned = rows.find((row) => row.textContent?.includes('Tan Hock Seng'))!
  expect(within(unassigned).getByText('— unassigned')).toBeInTheDocument()
  expect(within(unassigned).getByText('NEEDS COVER')).toBeInTheDocument()
  expect(screen.getByText('79 further visits today · filtered to sector S31 / S45')).toBeInTheDocument()
})

it('orders the queue by severity with live countdowns, and shows the SEV 1 escalation chain', async () => {
  renderToday()
  const queue = await screen.findByRole('region', { name: 'Exception queue' })
  const cards = await within(queue).findAllByRole('article')
  expect(cards.map((card) => within(card).getByText(/^EXC-/).textContent)).toEqual([
    'EXC-2088',
    'EXC-2087',
    'EXC-2085',
    'EXC-2084',
  ])
  expect(within(cards[0]).getByRole('timer')).toHaveTextContent(/^00:0[34]:\d\d$/)
  expect(within(cards[0]).getByRole('button', { name: 'Take over' })).toBeInTheDocument()
  expect(within(cards[2]).queryByRole('button')).not.toBeInTheDocument()

  const chain = await screen.findByRole('region', { name: 'Escalation chain for EXC-2088' })
  expect(within(chain).getByText('Care manager on duty · you')).toBeInTheDocument()
  expect(within(chain).getByText('at 09:16 if unacknowledged')).toBeInTheDocument()
})

it('opens the suggestion review stub from Suggest roster', async () => {
  renderToday()
  await userEvent.click(screen.getByRole('button', { name: 'Suggest roster' }))
  expect(screen.getByRole('dialog', { name: 'Review suggested roster' })).toBeInTheDocument()
})

it('reassigns the no-check-in visit through the caregiver picker', async () => {
  renderToday()
  const card = await screen.findByRole('article', { name: /EXC-2087/ })
  await userEvent.click(within(card).getByRole('button', { name: 'Reassign visit' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Currently Devi Raman')).toBeInTheDocument()
  await userEvent.click(await within(dialog).findByRole('button', { name: 'Assign' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const table = screen.getByRole('table', { name: 'Visit roster' })
  const row = within(table).getByText('Mohd Yusof').closest('[role="row"]') as HTMLElement
  expect(await within(row).findByText('Kamala Devi')).toBeInTheDocument()
  expect(row).toHaveTextContent('SCHEDULED')
})

// Last: claiming writes to the module-level mock store, which the earlier tests read.
it('claims a SEV 2 exception for the signed-in manager and stops its escalation timer', async () => {
  renderToday()
  const card = await screen.findByRole('article', { name: /EXC-2087/ })
  expect(within(card).getByText(/responder: unclaimed · escalates in/)).toBeInTheDocument()
  await userEvent.click(within(card).getByRole('button', { name: 'Claim' }))
  expect(await within(card).findByText('responder: Tan Mei Ling')).toBeInTheDocument()
  expect(within(card).getByRole('button', { name: 'Claim' })).toBeDisabled()
})

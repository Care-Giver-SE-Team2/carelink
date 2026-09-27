import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Today from './Today'
import * as authApi from '../../../features/auth/api'
import * as incidentsApi from '../../../features/incidents/api'
import type { EscalationChain, Incident } from '../../../features/incidents/types'
import * as profileApi from '../../../shared/api/profile'
import type { ElderListItem } from '../../../shared/api/profile'
import * as visitApi from '../../../shared/api/visit'
import type { VisitResponse } from '../../../shared/api/visit'

/** A backend LocalDateTime (Singapore wall clock) `seconds` from now. */
function sgFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000 + 8 * 3600_000).toISOString().slice(0, 19)
}

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

const incident = (overrides: Partial<Incident> & Pick<Incident, 'id' | 'elderId' | 'severity' | 'status'>): Incident => ({
  visitId: null,
  reportedByUserId: null,
  responderUserId: 1,
  source: 'CAREGIVER',
  category: 'OTHER',
  latitude: null,
  longitude: null,
  locationText: null,
  description: null,
  respondBy: null,
  reportedAt: sgFromNow(-600),
  resolvedAt: null,
  ...overrides,
})

const chain: EscalationChain = {
  incidentId: 2088,
  assembledAt: sgFromNow(0),
  severity: 'HIGH',
  assembledFrom: null,
  levels: [
    { position: 1, tier: 'Care manager on duty', responderUserId: 1, responderName: 'Tan Mei Ling', countdownMinutes: 5, state: 'CURRENT' },
    { position: 2, tier: 'Any manager', responderUserId: 2, responderName: 'Ben Lim', countdownMinutes: 10, state: 'PENDING' },
    { position: 3, tier: 'Registered family member', responderUserId: null, responderName: null, countdownMinutes: 0, state: 'PENDING' },
  ],
}

let incidents: Incident[]

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  incidents = [
    incident({ id: 2084, elderId: 2, severity: 'LOW', status: 'OPEN', category: 'MEDICAL', respondBy: sgFromNow(3 * 3600) }),
    incident({ id: 2085, elderId: 4, severity: 'LOW', status: 'IN_PROGRESS', description: 'Loose bathroom rail' }),
    incident({
      id: 2087,
      elderId: 3,
      visitId: 4,
      severity: 'MEDIUM',
      status: 'OPEN',
      source: 'SYSTEM_MISSED_CHECKIN',
      respondBy: sgFromNow(12 * 60),
    }),
    incident({ id: 2088, elderId: 3, severity: 'HIGH', status: 'OPEN', category: 'FALL', respondBy: sgFromNow(4 * 60 + 12) }),
    incident({ id: 2089, elderId: 5, severity: 'HIGH', status: 'UNRESOLVED_ESCALATED', category: 'SOS', responderUserId: null }),
  ]

  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockImplementation(async ({ size }) =>
    size === 1
      ? { items: [], page: 0, size: 1, totalElements: 7 }
      : { items: structuredClone(incidents), page: 0, size, totalElements: incidents.length },
  )
  vi.spyOn(incidentsApi, 'getEscalationChain').mockResolvedValue(chain)
  vi.spyOn(incidentsApi, 'claimIncident').mockImplementation(async (id) => {
    const claimed = incidents.find((i) => i.id === id)!
    Object.assign(claimed, { status: 'IN_PROGRESS', responderUserId: 1, respondBy: null })
    return claimed
  })
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
          <Route path="/manager/exceptions/:id" element={<p>exception workbench</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('counts the headline figures from the roster and the queue, and the nav counts incidents still needing attention', async () => {
  renderToday()
  const kpis = screen.getByLabelText('Today at a glance')
  const scheduled = within(kpis).getByText('Visits scheduled').closest('div')
  await vi.waitFor(() => expect(scheduled).toHaveTextContent('Visits scheduled5'))
  expect(within(kpis).getByText('Open exceptions').closest('div')).toHaveTextContent('Open exceptions5')
  expect(within(kpis).getByText('Completed').closest('div')).toHaveTextContent('Completed1')
  expect(within(kpis).getByText('Unassigned').closest('div')).toHaveTextContent('Unassigned1')
  expect(within(kpis).getByText('Escalated').closest('div')).toHaveTextContent('Escalated1')

  const exceptionsLink = screen.getByRole('link', { name: /Exceptions/ })
  expect(await within(exceptionsLink).findByText('7')).toBeInTheDocument()
  expect(incidentsApi.listIncidentQueue).toHaveBeenCalledWith({ page: 0, size: 1 }, expect.anything())
  expect(screen.getByRole('link', { name: /Today/ })).toHaveAttribute('aria-current', 'page')
})

it('lists today’s visits by name, flagging the unassigned one and the missed check-in', async () => {
  renderToday()
  const table = await screen.findByRole('table', { name: 'Visit roster' })
  await within(table).findByText('Tan Hock Seng')
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(6)
  const unassigned = rows.find((row) => row.textContent?.includes('Tan Hock Seng'))!
  expect(within(unassigned).getByText('— unassigned')).toBeInTheDocument()
  expect(within(unassigned).getByText('NEEDS COVER')).toBeInTheDocument()
  const missed = rows.find((row) => row.textContent?.includes('Mohd Yusof'))!
  expect(within(missed).getByText('Hafiz Rahman')).toBeInTheDocument()
  expect(within(missed).getByText('NO CHECK-IN')).toBeInTheDocument()
  expect(screen.getByText('5 visits today · sector S31 / S45 / S52')).toBeInTheDocument()
})

it('orders the queue by severity then deadline, and shows the SEV 1 escalation chain', async () => {
  renderToday()
  const queue = await screen.findByRole('region', { name: 'Exception queue' })
  const cards = await within(queue).findAllByRole('article')
  expect(cards.map((card) => within(card).getByText(/^EXC-/).textContent)).toEqual([
    'EXC-2088',
    'EXC-2089',
    'EXC-2087',
    'EXC-2084',
    'EXC-2085',
  ])
  expect(within(cards[0]).getByText('Fall reported — Mohd Yusof')).toBeInTheDocument()
  expect(within(cards[0]).getByRole('timer')).toHaveTextContent(/^00:0[34]:\d\d$/)
  expect(within(cards[0]).getByRole('button', { name: 'Take over' })).toBeInTheDocument()
  expect(within(cards[1]).getByText(/escalates to: family/)).toBeInTheDocument()
  expect(within(cards[4]).getByText('responder: Tan Mei Ling')).toBeInTheDocument()
  expect(within(cards[4]).getByRole('timer')).toHaveTextContent('--:--:--')

  const chainRegion = await screen.findByRole('region', { name: 'Escalation chain for EXC-2088' })
  expect(within(chainRegion).getByText('Care manager on duty · you')).toBeInTheDocument()
  expect(within(chainRegion).getByText('respond within 5 min')).toBeInTheDocument()
  expect(incidentsApi.getEscalationChain).toHaveBeenCalledWith(2088, expect.anything())
})

it('opens the suggestion review stub from Suggest roster', async () => {
  renderToday()
  await userEvent.click(screen.getByRole('button', { name: 'Suggest roster' }))
  expect(screen.getByRole('dialog', { name: 'Review suggested roster' })).toBeInTheDocument()
})

it('claims a SEV 2 exception for the signed-in manager and stops its escalation timer', async () => {
  renderToday()
  const card = await screen.findByRole('article', { name: /EXC-2087/ })
  expect(within(card).getByText(/responder: unclaimed · escalates in/)).toBeInTheDocument()
  await userEvent.click(within(card).getByRole('button', { name: 'Claim' }))
  expect(incidentsApi.claimIncident).toHaveBeenCalledWith(2087)
  expect(await within(card).findByText('responder: Tan Mei Ling')).toBeInTheDocument()
  expect(within(card).getByRole('button', { name: 'Claim' })).toBeDisabled()
})

it('takes a SEV 1 exception over and opens its workbench', async () => {
  renderToday()
  const card = await screen.findByRole('article', { name: /EXC-2088/ })
  await userEvent.click(within(card).getByRole('button', { name: 'Take over' }))
  expect(incidentsApi.claimIncident).toHaveBeenCalledWith(2088)
  expect(await screen.findByText('exception workbench')).toBeInTheDocument()
})

// Last: a reassignment is held in the board's module-level store, which earlier tests read.
it('reassigns the no-check-in visit through the caregiver picker', async () => {
  renderToday()
  const card = await screen.findByRole('article', { name: /EXC-2087/ })
  await userEvent.click(within(card).getByRole('button', { name: 'Reassign visit' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Currently Hafiz Rahman')).toBeInTheDocument()
  await userEvent.click(await within(dialog).findByRole('button', { name: 'Assign' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const table = screen.getByRole('table', { name: 'Visit roster' })
  const row = within(table).getByText('Mohd Yusof').closest('[role="row"]') as HTMLElement
  expect(await within(row).findByText('Kamala Devi')).toBeInTheDocument()
  expect(row).toHaveTextContent('SCHEDULED')
})

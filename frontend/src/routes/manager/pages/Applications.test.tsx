import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Applications from './Applications'
import * as authApi from '../../../features/auth/api'
import * as incidentsApi from '../../../features/incidents/api'
import * as profileApi from '../../../shared/api/profile'
import * as carePlanApi from '../../../shared/api/careplan'
import type { IntakeCheck, IntakeReview } from '../../../shared/api/profile'

let pending: IntakeReview[]

function check(key: IntakeCheck['key'], pass: boolean, extra: Partial<IntakeCheck> = {}): IntakeCheck {
  return { key, pass, count: null, ...extra }
}

function application(overrides: Partial<IntakeReview>): IntakeReview {
  return {
    id: 1,
    applicantFamilyMemberId: 1,
    applicant: { fullName: 'Grace Tan Wei Ling', username: 'grace.tan', phone: '+65 9123 4488' },
    targetElderName: 'Tan Bee Choo',
    targetElderAge: 83,
    targetAddress: 'Blk 230 Bishan St 23, #04-117',
    postalCode: '570230',
    mobilityLevel: 'ASSISTIVE_CANE',
    preferredDialects: 'Hokkien',
    careNeeds: ['BATHING', 'Companionship'],
    medicalNotes: 'Hard of hearing on the left side.',
    status: 'SUBMITTED',
    reviewRemarks: null,
    createdAt: '2026-09-05T02:12:00Z',
    reviewedAt: null,
    elderId: null,
    sector: 'S31',
    checks: [
      check('contact', true),
      check('sector', true, { count: 4 }),
      check('dialect', true, { count: 2 }),
    ],
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  pending = [
    application({ id: 42 }),
    application({
      id: 40,
      applicant: { fullName: 'Kevin Goh', username: 'kevin.goh', phone: null },
      targetElderName: 'Goh Bee Lian',
      targetElderAge: null,
      createdAt: '2026-09-04T00:03:00Z',
      preferredDialects: 'Cantonese',
      checks: [check('contact', false), check('sector', true, { count: 4 }), check('dialect', false, { count: 0 })],
    }),
    application({
      id: 39,
      applicant: { fullName: 'Rachel Ng', username: 'rachel.ng', phone: '+65 9000 0000' },
      targetElderName: 'Ng Kim Lan',
      sector: null,
      createdAt: '2026-09-02T07:26:00Z',
      checks: [check('sector', false)],
    }),
  ]
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockImplementation(async ({ size }) => ({ items: [], page: 0, size, totalElements: 0 }))
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(profileApi, 'fetchCredentialRegister').mockResolvedValue([])
  vi.spyOn(profileApi, 'fetchIntakeReviews').mockImplementation(async () => [...pending])
  vi.spyOn(carePlanApi, 'fetchCareActivities').mockResolvedValue([
    { code: 'BATHING', label: 'Bathing assistance', category: 'Personal care' },
  ])
})

function answer(id: number) {
  pending = pending.filter((a) => a.id !== id)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/manager/applications']}>
        <Routes>
          <Route path="/manager/applications" element={<Applications />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function panel() {
  return screen.getByRole('complementary', { name: 'Application detail' })
}

it('lists pending applications with their check flag and opens the newest', async () => {
  renderPage()

  const table = await screen.findByRole('table', { name: 'Applications' })
  const rows = within(table).getAllByRole('row').slice(1)
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Grace Tan Wei Ling')
  expect(rows[0]).toHaveTextContent('83 · walking aid')
  expect(rows[0]).toHaveTextContent('5 Sep 10:12')
  expect(rows[0]).toHaveTextContent('NEW')
  expect(rows[1]).toHaveTextContent('age not given · walking aid')
  expect(rows[1]).toHaveTextContent('NEW') // a failed dialect check informs, it doesn't flag
  expect(rows[2]).toHaveTextContent('NO COVER')
  expect(rows[0]).toHaveAttribute('aria-selected', 'true')

  const nav = screen.getByRole('link', { name: /Applications/ })
  expect(nav).toHaveAttribute('aria-current', 'page')
  expect(within(nav).getByText('3')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Elders/ })).toHaveTextContent(/^EElders$/)

  const detail = panel()
  expect(within(detail).getByRole('heading', { name: 'Grace Tan Wei Ling, for Tan Bee Choo' })).toBeInTheDocument()
  expect(within(detail).getByText('Application · #42')).toBeInTheDocument()
  expect(within(detail).getByText('Blk 230 Bishan St 23, #04-117 · 570230')).toBeInTheDocument()
  expect(await within(detail).findByText('Bathing assistance, Companionship')).toBeInTheDocument()
  expect(within(detail).getByText('Hokkien-speaking caregiver')).toBeInTheDocument()
  expect(within(detail).getByText('✓ 2 in S31')).toBeInTheDocument()
})

it('shows failing checks in the panel without blocking approval', async () => {
  renderPage()
  await userEvent.click(await screen.findByText('Kevin Goh'))

  const detail = panel()
  expect(within(detail).getByRole('heading', { name: 'Kevin Goh, for Goh Bee Lian' })).toBeInTheDocument()
  expect(within(detail).getByText('not given')).toBeInTheDocument() // no mobile
  expect(within(detail).getByText('no mobile number')).toBeInTheDocument()
  expect(within(detail).getByText('Cantonese-speaking caregiver')).toBeInTheDocument()
  expect(within(detail).getByText('none in S31')).toBeInTheDocument()
  expect(within(detail).getByRole('button', { name: 'Approve' })).toBeEnabled()
})

it('approves with the optional message, shows the elder login once, then opens the next application', async () => {
  const approve = vi.spyOn(profileApi, 'approveIntakeApplication').mockImplementation(async (id) => {
    answer(id)
    return { id, status: 'APPROVED', elderId: 900, elderLogin: { username: 'tan.bee.choo', temporaryPassword: 'Kq7mT4xPa2' } }
  })
  renderPage()
  await screen.findByRole('heading', { name: 'Grace Tan Wei Ling, for Tan Bee Choo' })

  await userEvent.type(within(panel()).getByRole('textbox'), 'Welcome aboard')
  await userEvent.click(within(panel()).getByRole('button', { name: 'Approve' }))

  expect(approve).toHaveBeenCalledWith(42, 'Welcome aboard')
  const dialog = await screen.findByRole('dialog', { name: 'Login created for Tan Bee Choo' })
  expect(within(dialog).getByText('tan.bee.choo')).toBeInTheDocument()
  expect(within(dialog).getByText('Kq7mT4xPa2')).toBeInTheDocument()
  expect(within(dialog).getByText(/shown only now/)).toHaveTextContent('Pass it to Grace Tan Wei Ling or Tan Bee Choo')

  // Esc must not throw the password away; only the dialog's own button closes it.
  await userEvent.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('button', { name: "I've noted it down" }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  expect(await screen.findByRole('heading', { name: 'Kevin Goh, for Goh Bee Lian' })).toBeInTheDocument()
  expect(screen.queryByText('Grace Tan Wei Ling')).not.toBeInTheDocument()
  expect(within(screen.getByRole('link', { name: /Applications/ })).getByText('2')).toBeInTheDocument()
})

it('needs a message to decline', async () => {
  const decline = vi.spyOn(profileApi, 'declineIntakeApplication').mockImplementation(async (id) => {
    answer(id)
    return { id, status: 'REJECTED', elderId: null, elderLogin: null }
  })
  renderPage()
  await screen.findByRole('heading', { name: 'Grace Tan Wei Ling, for Tan Bee Choo' })

  await userEvent.click(within(panel()).getByRole('button', { name: 'Decline' }))
  expect(within(panel()).getByText('Tell Grace Tan Wei Ling why')).toBeInTheDocument()
  expect(within(panel()).getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  expect(decline).not.toHaveBeenCalled()

  await userEvent.type(within(panel()).getByRole('textbox'), 'We do not cover Yishun yet')
  expect(within(panel()).queryByText('Tell Grace Tan Wei Ling why')).not.toBeInTheDocument()
  await userEvent.click(within(panel()).getByRole('button', { name: 'Decline' }))

  expect(decline).toHaveBeenCalledWith(42, 'We do not cover Yishun yet')
  expect(await screen.findByRole('heading', { name: 'Kevin Goh, for Goh Bee Lian' })).toBeInTheDocument()
})

it('keeps the application open and shows why when the decision fails', async () => {
  vi.spyOn(profileApi, 'approveIntakeApplication').mockRejectedValue(new Error('Application #42 has already been answered.'))
  renderPage()
  await screen.findByRole('heading', { name: 'Grace Tan Wei Ling, for Tan Bee Choo' })

  await userEvent.click(within(panel()).getByRole('button', { name: 'Approve' }))

  expect(await within(panel()).findByRole('alert')).toHaveTextContent('Application #42 has already been answered.')
  expect(within(panel()).getByRole('button', { name: 'Approve' })).toBeEnabled()
})

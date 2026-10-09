import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getIntakeApplication } from '../../features/intake/api'
import type { IntakeApplication } from '../../features/intake/types'
import { IntakeDetailPage } from './intake/IntakeDetailPage'

vi.mock('../../features/intake/api', () => ({ getIntakeApplication: vi.fn() }))

const approved: IntakeApplication = {
  id: 23,
  applicantFamilyMemberId: 2,
  targetElderName: 'Tan Bee Choo',
  targetElderAge: 83,
  targetAddress: 'Blk 230 Bishan St 23',
  postalCode: '570230',
  mobilityLevel: 'INDEPENDENT',
  preferredDialects: null,
  careNeeds: [],
  medicalNotes: null,
  status: 'APPROVED',
  reviewRemarks: 'Welcome',
  createdAt: '2026-10-05T01:00:00Z',
  reviewedAt: '2026-10-05T02:00:00Z',
  elderId: 900,
}

function openApplication(application: IntakeApplication) {
  vi.mocked(getIntakeApplication).mockResolvedValue(application)
  return render(
    <MemoryRouter initialEntries={['/family/intake/23']}>
      <Routes>
        <Route path="/family/intake/:id" element={<IntakeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('elder sign-in on an approved application', () => {
  it('shows the username and keeps the temporary password hidden until asked', async () => {
    openApplication({ ...approved, elderLogin: { username: 'tan.bee.choo', temporaryPassword: 'Kq7mT4xPa2' } })

    const section = await screen.findByRole('region', { name: 'Sign-in for Tan Bee Choo' })
    expect(within(section).getByText('tan.bee.choo')).toBeInTheDocument()
    expect(within(section).queryByText('Kq7mT4xPa2')).not.toBeInTheDocument()
    expect(within(section).getByText(/they will choose their own password/)).toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'Show password' }))
    expect(within(section).getByText('Kq7mT4xPa2')).toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'Hide password' }))
    expect(within(section).queryByText('Kq7mT4xPa2')).not.toBeInTheDocument()
  })

  it('shows no sign-in once the elder has chosen their own password', async () => {
    openApplication(approved)

    expect(await screen.findByRole('heading', { name: 'Tan Bee Choo' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Sign-in for/ })).not.toBeInTheDocument()
  })
})

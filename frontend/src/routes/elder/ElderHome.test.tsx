import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useElderUser } from './lib/useElderSession'
import ElderHome from './index'

vi.mock('./lib/useElderSession', () => ({ useElderUser: vi.fn() }))
vi.mock('./pages/ChoosePassword', () => ({ default: () => <h1>Choose your own password</h1> }))
vi.mock('./pages/ConfirmVisit', () => ({ default: () => <h1>Confirm visit</h1> }))
vi.mock('./components/ElderShell', () => ({
  ElderShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const elder = { id: 1, username: 'tan.bee.choo', displayName: 'Tan Bee Choo', roles: ['ELDER'] }

function openElderApp(path: string, passwordChangeRequired: boolean) {
  vi.mocked(useElderUser).mockReturnValue({
    data: { ...elder, passwordChangeRequired },
    isPending: false,
  } as ReturnType<typeof useElderUser>)
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/elder/*" element={<ElderHome />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('elder app with a temporary password', () => {
  it('asks for a new password instead of any other screen', () => {
    openElderApp('/elder/confirm-service', true)

    expect(screen.getByRole('heading', { name: 'Choose your own password' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Confirm visit' })).not.toBeInTheDocument()
  })

  it('shows the normal screens once the password is the elder’s own', () => {
    openElderApp('/elder/confirm-service', false)

    expect(screen.getByRole('heading', { name: 'Confirm visit' })).toBeInTheDocument()
  })
})

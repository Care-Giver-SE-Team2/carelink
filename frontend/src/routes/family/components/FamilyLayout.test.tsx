import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signOut } from '../../../features/auth/api'
import { ApiError } from '../../../shared/api/client'
import { FamilyLayout } from './FamilyLayout'
import { FamilySignIn } from './FamilySignIn'

vi.mock('../../../features/auth/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../features/auth/api')>()),
  signOut: vi.fn(),
}))

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.mocked(signOut).mockReset()
})

function renderSchedule() {
  render(
    <MemoryRouter initialEntries={['/family/schedule']}>
      <Routes>
        <Route path="/" element={<h1>Landing</h1>} />
        <Route element={<FamilyLayout />}>
          <Route path="/family/schedule" element={<h1>Your weekly schedule</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Family workspace', () => {
  it('navigates between applications and the weekly schedule and identifies the current page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/family/intake/new']}>
        <Routes>
          <Route element={<FamilyLayout />}>
            <Route path="/family/intake/new" element={<h1>New application</h1>} />
            <Route path="/family/schedule" element={<h1>Your weekly schedule</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'My applications' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))
    expect(screen.getByRole('heading', { name: 'Your weekly schedule' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Weekly schedule' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'My applications' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#family-content')
  })

  it('uses the page title and explains the current sign-in purpose', () => {
    const previousTitle = document.title
    const { unmount } = render(
      <MemoryRouter initialEntries={['/family/schedule']}>
        <Routes>
          <Route element={<FamilyLayout title="Weekly schedule" />}>
            <Route
              path="/family/schedule"
              element={<FamilySignIn onSignedIn={vi.fn()} description="Sign in to view your loved one's care schedule." />}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(document.title).toBe('Weekly schedule · CareLink')
    expect(screen.getByText("Sign in to view your loved one's care schedule.")).toBeInTheDocument()
    unmount()
    expect(document.title).toBe(previousTitle)
  })

  it('signs out and returns to the landing page', async () => {
    vi.mocked(signOut).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderSchedule()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(await screen.findByRole('heading', { name: 'Landing' })).toBeInTheDocument()
  })

  it('treats an expired session as already signed out', async () => {
    vi.mocked(signOut).mockRejectedValue(new ApiError('Unauthorized', 401))
    const user = userEvent.setup()
    renderSchedule()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Landing' })).toBeInTheDocument()
  })

  it('stays on the page and explains when sign-out fails', async () => {
    vi.mocked(signOut).mockRejectedValue(new ApiError('Server error', 500))
    const user = userEvent.setup()
    renderSchedule()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign out. Please try again.')
    expect(screen.getByRole('heading', { name: 'Your weekly schedule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
  })
})

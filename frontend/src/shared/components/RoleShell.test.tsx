import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getCurrentUser,
  signOut,
} from '../../features/auth/api'
import { ApiError } from '../api/client'
import { RoleShell } from './RoleShell'

vi.mock(
  '../../features/auth/api',
  () => ({
    getCurrentUser: vi.fn(),
    signOut: vi.fn(),
  }),
)

const mockedGetCurrentUser =
  vi.mocked(getCurrentUser)

const mockedSignOut =
  vi.mocked(signOut)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderShell() {
  return render(
    <MemoryRouter
      initialEntries={['/elder']}
    >
      <Routes>
        <Route
          path="/elder"
          element={
            <RoleShell
              title="Elder"
              theme="elder"
            >
              <div>
                Elder content
              </div>
            </RoleShell>
          }
        />

        <Route
          path="/"
          element={
            <div>
              Landing page
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleShell', () => {
  it('shows the current authenticated user', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    })

    renderShell()

    expect(
      await screen.findByText(
        'Test Elder',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText('ELDER'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole(
        'button',
        {
          name: 'Sign out',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Elder content',
      ),
    ).toBeInTheDocument()
  })

  it('falls back to the username when display name is empty', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'elder_test',
      displayName: '',
      roles: ['ELDER'],
    })

    renderShell()

    expect(
      await screen.findByText(
        'elder_test',
      ),
    ).toBeInTheDocument()
  })

  it('signs out and returns to the landing page', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    })

    mockedSignOut.mockResolvedValue()

    renderShell()

    const user =
      userEvent.setup()

    await user.click(
      await screen.findByRole(
        'button',
        {
          name: 'Sign out',
        },
      ),
    )

    await waitFor(() => {
      expect(
        mockedSignOut,
      ).toHaveBeenCalledTimes(1)
    })

    expect(
      await screen.findByText(
        'Landing page',
      ),
    ).toBeInTheDocument()
  })

  it('returns to the sign-in page when the session has expired', async () => {
    mockedGetCurrentUser.mockRejectedValue(
      new ApiError(
        'Authentication is required.',
        401,
      ),
    )

    renderShell()

    expect(
      await screen.findByText(
        'Landing page',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        'Elder content',
      ),
    ).not.toBeInTheDocument()
  })

  it('treats an already-expired session as signed out when Sign out is pressed', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    })

    mockedSignOut.mockRejectedValue(
      new ApiError(
        'Authentication is required.',
        401,
      ),
    )

    renderShell()

    const user =
      userEvent.setup()

    await user.click(
      await screen.findByRole(
        'button',
        {
          name: 'Sign out',
        },
      ),
    )

    expect(
      await screen.findByText(
        'Landing page',
      ),
    ).toBeInTheDocument()
  })

  it('shows an error when sign out fails for another reason', async () => {
    mockedGetCurrentUser.mockResolvedValue({
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    })

    mockedSignOut.mockRejectedValue(
      new Error(
        'Network failure',
      ),
    )

    renderShell()

    const user =
      userEvent.setup()

    await user.click(
      await screen.findByRole(
        'button',
        {
          name: 'Sign out',
        },
      ),
    )

    expect(
      await screen.findByRole(
        'alert',
      ),
    ).toHaveTextContent(
      'Unable to sign out. Please try again.',
    )

    expect(
      screen.getByText(
        'Test Elder',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the page available when loading the current user fails for a non-authentication reason', async () => {
    mockedGetCurrentUser.mockRejectedValue(
      new Error(
        'Network failure',
      ),
    )

    renderShell()

    await waitFor(() => {
      expect(
        mockedGetCurrentUser,
      ).toHaveBeenCalledTimes(1)
    })

    expect(
      screen.queryByRole(
        'button',
        {
          name: 'Sign out',
        },
      ),
    ).not.toBeInTheDocument()

    expect(
      screen.getByText(
        'Elder content',
      ),
    ).toBeInTheDocument()
  })
})
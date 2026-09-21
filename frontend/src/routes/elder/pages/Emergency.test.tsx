import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createEmergencyCall,
} from '../../../features/emergency/api'
import { ApiError } from '../../../shared/api/client'
import Emergency from './Emergency'

vi.mock(
  '../../../features/emergency/api',
  () => ({
    createEmergencyCall: vi.fn(),
  }),
)

vi.mock(
  '../../../shared/components/RoleShell',
  () => ({
    RoleShell: ({
      children,
    }: {
      children: React.ReactNode
    }) => (
      <div>{children}</div>
    ),
  }),
)

const mockedCreateEmergencyCall =
  vi.mocked(createEmergencyCall)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderEmergency() {
  return render(
    <MemoryRouter>
      <Emergency />
    </MemoryRouter>,
  )
}

describe('Emergency page', () => {
  it('creates an SOS and shows the returned incident', async () => {
    mockedCreateEmergencyCall.mockResolvedValue({
      id: 5,
      elderId: 1,
      reportedByUserId: 1,
      source: 'ELDER_SOS',
      category: 'SOS',
      severity: 'HIGH',
      status: 'OPEN',
      latitude: null,
      longitude: null,
      locationText: null,
      description: null,
      createdAt:
        '2026-09-21T10:29:18',
    })

    renderEmergency()

    const user = userEvent.setup()

    await user.click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      mockedCreateEmergencyCall,
    ).toHaveBeenCalledTimes(1)

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'SOS sent',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Emergency ID: 5',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Status: OPEN',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Severity: HIGH',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    ).not.toBeInTheDocument()
  })

  it('shows the session-ended message for 401', async () => {
    mockedCreateEmergencyCall.mockRejectedValue(
      new ApiError(
        'Authentication required',
        401,
      ),
    )

    renderEmergency()

    await userEvent.setup().click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Your session has ended. Please sign in again.',
    )
  })

  it('shows the authorisation message for 403', async () => {
    mockedCreateEmergencyCall.mockRejectedValue(
      new ApiError(
        'Forbidden',
        403,
      ),
    )

    renderEmergency()

    await userEvent.setup().click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'This account is not authorised to send an elder SOS.',
    )
  })

  it('shows the missing-profile message for 404', async () => {
    mockedCreateEmergencyCall.mockRejectedValue(
      new ApiError(
        'Not found',
        404,
      ),
    )

    renderEmergency()

    await userEvent.setup().click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'No elder profile is linked to this account.',
    )
  })

  it('shows the backend error for another API failure', async () => {
    mockedCreateEmergencyCall.mockRejectedValue(
      new ApiError(
        'Service unavailable',
        500,
      ),
    )

    renderEmergency()

    await userEvent.setup().click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Service unavailable',
    )
  })

  it('shows a generic message for a non-API failure', async () => {
    mockedCreateEmergencyCall.mockRejectedValue(
      new TypeError('Network error'),
    )

    renderEmergency()

    await userEvent.setup().click(
      screen.getByRole(
        'button',
        {
          name: 'SOS — GET HELP NOW',
        },
      ),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Unable to send the SOS. Please try again.',
    )
  })
})
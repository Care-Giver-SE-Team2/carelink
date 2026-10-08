import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
} from 'react-router-dom'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createElderValueAddedServiceRequest,
  fetchElderValueAddedServiceRequests,
  fetchValueAddedServices,
} from '../../../features/value-added-services/api'
import ValueAddedServices from './ValueAddedServices'

vi.mock(
  '../../../features/value-added-services/api',
  () => ({
    createElderValueAddedServiceRequest:
      vi.fn(),
    fetchElderValueAddedServiceRequests:
      vi.fn(),
    fetchValueAddedServices:
      vi.fn(),
  }),
)

/*
 * ElderShell (session handling) is not under test here.
 */
vi.mock(
  '../components/ElderShell',
  () => ({
    ElderShell: ({
      children,
    }: {
      children:
        React.ReactNode
    }) => (
      <div>{children}</div>
    ),
  }),
)

const mockedCatalogue =
  vi.mocked(
    fetchValueAddedServices,
  )

const mockedRequests =
  vi.mocked(
    fetchElderValueAddedServiceRequests,
  )

const mockedCreate =
  vi.mocked(
    createElderValueAddedServiceRequest,
  )

const catalogue = [
  {
    id: 1,
    name:
      'Hospital escort',
    description:
      'Escort to medical appointments',
    status:
      'AVAILABLE' as const,
  },
  {
    id: 2,
    name:
      'Companionship',
    description:
      'Additional companionship',
    status:
      'AVAILABLE' as const,
  },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ValueAddedServices />
    </MemoryRouter>,
  )
}

describe(
  'EL02 value-added service request',
  () => {
    it('loads catalogue and empty request history', async () => {
      mockedCatalogue
        .mockResolvedValue(
          catalogue,
        )

      mockedRequests
        .mockResolvedValue([])

      renderPage()

      expect(
        await screen.findByRole(
          'heading',
          {
            name:
              'New request',
          },
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByRole(
          'button',
          {
            name:
              /^Hospital escort/,
            pressed: true,
          },
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByText(
          'No requests yet.',
        ),
      ).toBeInTheDocument()
    })

    it('shows empty catalogue state', async () => {
      mockedCatalogue
        .mockResolvedValue([])

      mockedRequests
        .mockResolvedValue([])

      renderPage()

      expect(
        await screen.findByRole(
          'heading',
          {
            name:
              'No extra services available',
          },
        ),
      ).toBeInTheDocument()
    })

    it('requires service and schedule before submission', async () => {
      mockedCatalogue
        .mockResolvedValue(
          catalogue,
        )

      mockedRequests
        .mockResolvedValue([])

      renderPage()

      await screen.findByText(
        'Hospital escort',
      )

      await userEvent
        .setup()
        .click(
          screen.getByRole(
            'button',
            {
              name:
                /Request Hospital escort/,
            },
          ),
        )

      expect(
        screen.getByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'Choose a service and requested date/time.',
      )

      expect(
        mockedCreate,
      ).not.toHaveBeenCalled()
    })

    it('creates pending approval request', async () => {
      mockedCatalogue
        .mockResolvedValue(
          catalogue,
        )

      mockedRequests
        .mockResolvedValue([])

      mockedCreate
        .mockResolvedValue({
          id: 5,
          elderId: 1,
          valueAddedServiceId: 1,
          serviceName:
            'Hospital escort',
          requestedByFamilyMemberId:
            null,
          approvingFamilyMemberId:
            null,
          visitId:
            null,
          requestedSchedule:
            '2026-10-10T10:00:00',
          specialInstructions:
            'Please accompany me.',
          status:
            'PENDING_APPROVAL',
          decidedAt:
            null,
          createdAt:
            '2026-10-07T17:00:00',
        })

      renderPage()

      const user =
        userEvent.setup()

      await screen.findByText(
        'Hospital escort',
      )

      await user.type(
        screen.getByLabelText(
          'Requested date and time',
        ),
        '2026-10-10T10:00',
      )

      await user.type(
        screen.getByLabelText(
          'Anything we should know?',
        ),
        '  Please accompany me.  ',
      )

      await user.click(
        screen.getByRole(
          'button',
          {
            name:
              /Request Hospital escort/,
          },
        ),
      )

      await waitFor(() => {
        expect(
          mockedCreate,
        ).toHaveBeenCalledWith({
          valueAddedServiceId: 1,
          requestedSchedule:
            '2026-10-10T10:00',
          specialInstructions:
            'Please accompany me.',
        })
      })

      expect(
        await screen.findByText(
          'Request sent. Status: Pending approval.',
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByText(
          'PENDING_APPROVAL',
        ),
      ).toBeInTheDocument()
    })

    it('loads existing request history', async () => {
      mockedCatalogue
        .mockResolvedValue(
          catalogue,
        )

      mockedRequests
        .mockResolvedValue([
          {
            id: 5,
            elderId: 1,
            valueAddedServiceId: 1,
            serviceName:
              'Hospital escort',
            requestedByFamilyMemberId:
              null,
            approvingFamilyMemberId:
              null,
            visitId:
              null,
            requestedSchedule:
              '2026-10-10T10:00:00',
            specialInstructions:
              'Need assistance',
            status:
              'PENDING_APPROVAL',
            decidedAt:
              null,
            createdAt:
              '2026-10-07T17:00:00',
          },
        ])

      renderPage()

      expect(
        await screen.findByText(
          'Need assistance',
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByText(
          /PENDING_APPROVAL/,
        ),
      ).toBeInTheDocument()
    })

    it('shows loading failure', async () => {
      mockedCatalogue
        .mockRejectedValue(
          new Error('network'),
        )

      mockedRequests
        .mockResolvedValue([])

      renderPage()

      expect(
        await screen.findByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'Unable to load extra services.',
      )
    })
  },
)
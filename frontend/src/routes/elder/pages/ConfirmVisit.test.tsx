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
  getVisitsAwaitingConfirmation,
  submitVisitConfirmation,
} from '../../../features/visit-confirmation/api'
import {
  ApiError,
} from '../../../shared/api/client'
import ConfirmVisit from './ConfirmVisit'

vi.mock(
  '../../../features/visit-confirmation/api',
  () => ({
    getVisitsAwaitingConfirmation:
      vi.fn(),
    submitVisitConfirmation:
      vi.fn(),
  }),
)

vi.mock(
  '../../../shared/components/RoleShell',
  () => ({
    RoleShell: ({
      children,
    }: {
      children:
        React.ReactNode
    }) => (
      <div>{children}</div>
    ),
  }),
)

const mockedGet =
  vi.mocked(
    getVisitsAwaitingConfirmation,
  )

const mockedSubmit =
  vi.mocked(
    submitVisitConfirmation,
  )

const visit = {
  visitId: 15,
  serviceType:
    'Personal care',
  scheduledStart:
    '2026-09-24T10:00:00',
  scheduledEnd:
    '2026-09-24T11:00:00',
  checkedOutAt:
    '2026-09-24T10:55:00',
  status:
    'COMPLETED' as const,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ConfirmVisit />
    </MemoryRouter>,
  )
}

describe(
  'EL01 elder visit confirmation',
  () => {
    it('shows an empty state when nothing needs confirmation', async () => {
      mockedGet
        .mockResolvedValue([])

      renderPage()

      expect(
        await screen.findByRole(
          'heading',
          {
            name:
              'Nothing to confirm',
          },
        ),
      ).toBeInTheDocument()
    })

    it('loads a completed visit', async () => {
      mockedGet
        .mockResolvedValue(
          [visit],
        )

      renderPage()

      expect(
        await screen.findByRole(
          'heading',
          {
            name:
              'Completed visit',
          },
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByText(
          'Personal care',
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByRole(
          'radio',
          {
            name:
              /Yes, service was completed/,
          },
        ),
      ).toBeChecked()
    })

    it('submits a confirmed visit with rating and trimmed feedback', async () => {
      mockedGet
        .mockResolvedValue(
          [visit],
        )

      mockedSubmit
        .mockResolvedValue({
          id: 8,
          visitId: 15,
          elderId: 1,
          confirmationStatus:
            'CONFIRMED',
          rating: 5,
          comment:
            'Very good service.',
          confirmedAt:
            '2026-09-24T11:00:00',
        })

      renderPage()

      const user =
        userEvent.setup()

      await screen.findByText(
        'Personal care',
      )

      await user.click(
        screen.getByRole(
          'radio',
          {
            name: '5',
          },
        ),
      )

      await user.type(
        screen.getByPlaceholderText(
          'Tell us how the visit went',
        ),
        '  Very good service.  ',
      )

      await user.click(
        screen.getByRole(
          'button',
          {
            name:
              'Submit confirmation',
          },
        ),
      )

      await waitFor(() => {
        expect(
          mockedSubmit,
        ).toHaveBeenCalledWith(
          15,
          {
            confirmationStatus:
              'CONFIRMED',
            rating: 5,
            comment:
              'Very good service.',
          },
        )
      })

      expect(
        await screen.findByText(
          'Thank you. Your confirmation has been recorded.',
        ),
      ).toBeInTheDocument()

      expect(
        screen.getByRole(
          'heading',
          {
            name:
              'Nothing to confirm',
          },
        ),
      ).toBeInTheDocument()
    })

    it('submits a disputed visit', async () => {
      mockedGet
        .mockResolvedValue(
          [visit],
        )

      mockedSubmit
        .mockResolvedValue({
          id: 8,
          visitId: 15,
          elderId: 1,
          confirmationStatus:
            'DISPUTED',
          rating: 2,
          comment:
            'Caregiver left early.',
          confirmedAt:
            '2026-09-24T11:00:00',
        })

      renderPage()

      const user =
        userEvent.setup()

      await screen.findByText(
        'Personal care',
      )

      await user.click(
        screen.getByRole(
          'radio',
          {
            name:
              /No, there was a problem/,
          },
        ),
      )

      await user.click(
        screen.getByRole(
          'radio',
          {
            name: '2',
          },
        ),
      )

      await user.type(
        screen.getByPlaceholderText(
          'Tell us how the visit went',
        ),
        'Caregiver left early.',
      )

      await user.click(
        screen.getByRole(
          'button',
          {
            name:
              'Submit confirmation',
          },
        ),
      )

      await waitFor(() => {
        expect(
          mockedSubmit,
        ).toHaveBeenCalledWith(
          15,
          {
            confirmationStatus:
              'DISPUTED',
            rating: 2,
            comment:
              'Caregiver left early.',
          },
        )
      })

      expect(
        await screen.findByText(
          'Thank you. Your concern has been recorded and sent for follow-up.',
        ),
      ).toBeInTheDocument()
    })

    it('shows load failure', async () => {
      mockedGet
        .mockRejectedValue(
          new Error(
            'network',
          ),
        )

      renderPage()

      expect(
        await screen.findByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'Unable to load visits awaiting confirmation.',
      )
    })

    it('shows conflict message for a duplicate confirmation', async () => {
      mockedGet
        .mockResolvedValue(
          [visit],
        )

      mockedSubmit
        .mockRejectedValue(
          new ApiError(
            'Conflict',
            409,
          ),
        )

      renderPage()

      const user =
        userEvent.setup()

      await screen.findByText(
        'Personal care',
      )

      await user.click(
        screen.getByRole(
          'button',
          {
            name:
              'Submit confirmation',
          },
        ),
      )

      expect(
        await screen.findByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'This visit has already been confirmed or is no longer awaiting confirmation.',
      )
    })

    it('shows not-found message', async () => {
      mockedGet
        .mockResolvedValue(
          [visit],
        )

      mockedSubmit
        .mockRejectedValue(
          new ApiError(
            'Not found',
            404,
          ),
        )

      renderPage()

      const user =
        userEvent.setup()

      await screen.findByText(
        'Personal care',
      )

      await user.click(
        screen.getByRole(
          'button',
          {
            name:
              'Submit confirmation',
          },
        ),
      )

      expect(
        await screen.findByRole(
          'alert',
        ),
      ).toHaveTextContent(
        'This visit could not be found.',
      )
    })
  },
)
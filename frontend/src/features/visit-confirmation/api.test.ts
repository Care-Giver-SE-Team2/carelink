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
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()

  document.cookie =
    'XSRF-TOKEN=; Max-Age=0; path=/'
})

function json(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    },
  )
}

describe(
  'visit confirmation API',
  () => {
    it('loads visits awaiting elder confirmation', async () => {
      const visits = [
        {
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
        },
      ]

      const fetchMock =
        vi.fn()
          .mockResolvedValue(
            json(visits),
          )

      vi.stubGlobal(
        'fetch',
        fetchMock,
      )

      await expect(
        getVisitsAwaitingConfirmation(),
      ).resolves.toEqual(
        visits,
      )

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        '/api/elders/me/visits/awaiting-confirmation',
      )

      const init =
        fetchMock.mock.calls[0][1]

      expect(init.credentials)
        .toBe('include')
    })

    it('submits elder confirmation with csrf token', async () => {
      document.cookie =
        'XSRF-TOKEN=visit%2Btoken; path=/'

      const confirmation = {
        id: 8,
        visitId: 15,
        elderId: 1,
        confirmationStatus:
          'CONFIRMED' as const,
        rating: 5,
        comment:
          'Good service',
        confirmedAt:
          '2026-09-24T11:00:00',
      }

      const fetchMock =
        vi.fn()
          .mockResolvedValue(
            json(
              confirmation,
              201,
            ),
          )

      vi.stubGlobal(
        'fetch',
        fetchMock,
      )

      await expect(
        submitVisitConfirmation(
          15,
          {
            confirmationStatus:
              'CONFIRMED',
            rating: 5,
            comment:
              'Good service',
          },
        ),
      ).resolves.toEqual(
        confirmation,
      )

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        '/api/elders/me/visits/15/confirmation',
      )

      const init =
        fetchMock.mock.calls[0][1]

      expect(init.method)
        .toBe('POST')

      expect(
        JSON.parse(
          init.body as string,
        ),
      ).toEqual({
        confirmationStatus:
          'CONFIRMED',
        rating: 5,
        comment:
          'Good service',
      })

      expect(
        init.headers.get(
          'X-XSRF-TOKEN',
        ),
      ).toBe(
        'visit+token',
      )
    })
  },
)
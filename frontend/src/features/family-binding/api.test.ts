import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createFamilyBinding,
  getFamilyBindings,
  revokeFamilyBinding,
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

const binding = {
  id: 10,
  familyMemberId: 3,
  familyMemberName:
    'Family Test',
  relationship: 'SON' as const,
  primaryContact: true,
  accessScope: 'FULL' as const,
  status:
    'PENDING_CONFIRMATION' as const,
  confirmedAt: null,
  createdAt:
    '2026-09-21T10:00:00',
}

describe(
  'family binding API',
  () => {
    it('loads bindings for the current elder', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          json([binding]),
        )

      vi.stubGlobal(
        'fetch',
        fetchMock,
      )

      await expect(
        getFamilyBindings(),
      ).resolves.toEqual(
        [binding],
      )

      expect(fetchMock)
        .toHaveBeenCalledTimes(1)

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        '/api/elders/me/family-bindings',
      )

      const init =
        fetchMock.mock.calls[0][1]

      expect(init.credentials)
        .toBe('include')

      expect(init.method)
        .toBeUndefined()
    })

    it('creates a binding request for the current elder', async () => {
      document.cookie =
        'XSRF-TOKEN=binding%2Btoken; path=/'

      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          json(binding, 201),
        )

      vi.stubGlobal(
        'fetch',
        fetchMock,
      )

      await expect(
        createFamilyBinding({
          familyUsername:
            'family_test',
          relationship: 'SON',
          primaryContact: true,
          accessScope: 'FULL',
        }),
      ).resolves.toEqual(binding)

      expect(fetchMock)
        .toHaveBeenCalledTimes(1)

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        '/api/elders/me/family-bindings',
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
        familyUsername:
          'family_test',
        relationship: 'SON',
        primaryContact: true,
        accessScope: 'FULL',
      })

      expect(
        init.headers.get(
          'Content-Type',
        ),
      ).toBe(
        'application/json',
      )

      expect(
        init.headers.get(
          'X-XSRF-TOKEN',
        ),
      ).toBe(
        'binding+token',
      )

      expect(init.credentials)
        .toBe('include')
    })

    it('revokes a binding belonging to the current elder', async () => {
      document.cookie =
        'XSRF-TOKEN=revoke-token; path=/'

      const revoked = {
        ...binding,
        status:
          'REVOKED' as const,
      }

      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          json(revoked),
        )

      vi.stubGlobal(
        'fetch',
        fetchMock,
      )

      await expect(
        revokeFamilyBinding(10),
      ).resolves.toEqual(
        revoked,
      )

      expect(fetchMock)
        .toHaveBeenCalledTimes(1)

      expect(
        fetchMock.mock.calls[0][0],
      ).toBe(
        '/api/elders/me/family-bindings/10',
      )

      const init =
        fetchMock.mock.calls[0][1]

      expect(init.method)
        .toBe('DELETE')

      expect(
        init.headers.get(
          'X-XSRF-TOKEN',
        ),
      ).toBe(
        'revoke-token',
      )

      expect(init.credentials)
        .toBe('include')
    })
  },
)
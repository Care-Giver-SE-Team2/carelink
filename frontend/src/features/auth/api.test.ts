import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getCurrentUser,
  signInWithSession,
  signOut,
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
        'Content-Type': 'application/json',
      },
    },
  )
}

describe('authentication API', () => {
  it('initialises CSRF before signing in', async () => {
    const currentUser = {
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        json(currentUser),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      signInWithSession({
        username: 'elder_test',
        password: 'password',
      }),
    ).resolves.toEqual(currentUser)

    expect(fetchMock)
      .toHaveBeenCalledTimes(2)

    expect(fetchMock.mock.calls[0][0])
      .toBe('/api/auth/csrf')

    expect(fetchMock.mock.calls[1][0])
      .toBe('/api/auth/login')

    expect(fetchMock.mock.calls[1][1].method)
      .toBe('POST')

    expect(fetchMock.mock.calls[1][1].body)
      .toBe(
        JSON.stringify({
          username: 'elder_test',
          password: 'password',
        }),
      )
  })

  it('loads the current authenticated user', async () => {
    const currentUser = {
      id: 1,
      username: 'elder_test',
      displayName: 'Test Elder',
      roles: ['ELDER'],
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json(currentUser),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getCurrentUser(),
    ).resolves.toEqual(currentUser)

    expect(fetchMock)
      .toHaveBeenCalledTimes(1)

    expect(fetchMock.mock.calls[0][0])
      .toBe('/api/auth/me')

    expect(
      fetchMock.mock.calls[0][1].method,
    ).toBeUndefined()
  })

  it('initialises CSRF before signing out', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      signOut(),
    ).resolves.toBeUndefined()

    expect(fetchMock)
      .toHaveBeenCalledTimes(2)

    expect(fetchMock.mock.calls[0][0])
      .toBe('/api/auth/csrf')

    expect(fetchMock.mock.calls[1][0])
      .toBe('/api/auth/logout')

    expect(fetchMock.mock.calls[1][1].method)
      .toBe('POST')
  })
})
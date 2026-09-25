import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { api, ApiError } from './client'

afterEach(() => {
  vi.unstubAllGlobals()

  document.cookie =
    'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('API error responses', () => {
  it.each([
    'application/problem+json',
    'application/problem+json; charset=UTF-8',
    'Application/Problem+JSON; charset=utf-8',
    'application/json; charset=utf-8',
  ])('reads structured errors from %s and retains their fields', async (contentType) => {
    const body = {
      title: 'Invalid request',
      detail: 'The date range must include both dates.',
      status: 500,
      fields: { dateTo: 'Required' },
      code: 'INVALID_DATE_RANGE',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'Content-Type': contentType },
    })))

    const failure = await api('/visits').catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({
      name: 'ApiError',
      status: 400,
      message: body.detail,
      body,
    })
  })

  it.each([
    {
      body: { message: 'Existing message', detail: 'Specific detail', title: 'Title' },
      expected: 'Existing message',
    },
    {
      body: { message: '  ', detail: 'Specific detail', title: 'Title' },
      expected: 'Specific detail',
    },
    {
      body: { message: 4, detail: null, title: 'Invalid request' },
      expected: 'Invalid request',
    },
    {
      body: { message: false, detail: { reason: 'Invalid' }, title: '  ' },
      expected: 'Request failed with status 400.',
    },
  ])('selects a usable message: $expected', async ({ body, expected }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'Content-Type': 'application/problem+json' },
    })))

    await expect(api('/visits')).rejects.toMatchObject({ status: 400, message: expected, body })
  })

  it.each([null, [], 123, false])('falls back for JSON without an error message: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    })))

    await expect(api('/visits')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500.',
      body,
    })
  })

  it.each([
    ['application/problem+json', '{invalid'],
    ['application/problem+json', ''],
    ['application/json', '{invalid'],
  ])('retains the HTTP error for unreadable %s bodies', async (contentType, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
      status: 401,
      headers: { 'Content-Type': contentType },
    })))

    await expect(api('/visits')).rejects.toMatchObject({
      status: 401,
      message: 'Authentication is required.',
      body: null,
    })
  })

  it('keeps the status fallback when reading a text error fails', async () => {
    const response = new Response('Unavailable', { status: 503 })
    vi.spyOn(response, 'text').mockRejectedValue(new TypeError('Body stream failed'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(api('/visits')).rejects.toMatchObject({
      status: 503,
      message: 'Request failed with status 503.',
      body: null,
    })
  })

  it.each([
    new TypeError('Failed to fetch'),
    new DOMException('Request cancelled', 'AbortError'),
  ])('preserves fetch failures without fabricating an HTTP status: %s', async (failure) => {
    const fetchMock = vi.fn().mockRejectedValue(failure)
    const controller = new AbortController()
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/visits', { signal: controller.signal })).rejects.toBe(failure)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/visits', expect.objectContaining({
      signal: controller.signal,
      credentials: 'include',
    }))
  })

  it('preserves caller headers and successful JSON parsing', async () => {
    document.cookie = 'XSRF-TOKEN=cookie-token; path=/'
    const headers = new Headers({ 'X-XSRF-TOKEN': 'explicit-token', 'Content-Type': 'text/plain' })
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"saved":true}', {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api('/example', { method: 'POST', headers, body: 'example' }))
      .resolves.toEqual({ saved: true })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.get('X-XSRF-TOKEN')).toBe('explicit-token')
    expect(init.headers.get('Content-Type')).toBe('text/plain')
    expect(headers.get('X-XSRF-TOKEN')).toBe('explicit-token')
  })
})

describe('API client', () => {
  it('keeps the HTTP status when an unauthenticated response has no body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    )

    await expect(
      api('/intake-applications'),
    ).rejects.toMatchObject({
      status: 401,
    })
  })

  it('does not redirect a failed login request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    )

    await expect(
      api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'elder_test',
          password: 'wrong',
        }),
      }),
    ).rejects.toMatchObject({
      status: 401,
      message:
        'Authentication is required.',
    })

    expect(
      window.location.pathname,
    ).toBe('/')
  })

  it('accepts an empty CSRF bootstrap response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
        }),
      ),
    )

    await expect(
      api<void>('/auth/csrf'),
    ).resolves.toBeUndefined()
  })

  it('sends the session cookie and echoes the CSRF cookie on writes', async () => {
    document.cookie =
      'XSRF-TOKEN=sample%2Btoken; path=/'

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          '{"id":1}',
          {
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      )

    vi.stubGlobal(
      'fetch',
      fetchMock,
    )

    await expect(
      api(
        '/auth/login',
        {
          method: 'POST',
          body: '{}',
        },
      ),
    ).resolves.toEqual({
      id: 1,
    })

    const [, init] =
      fetchMock.mock.calls[0]

    expect(init.credentials)
      .toBe('include')

    expect(
      init.headers.get(
        'X-XSRF-TOKEN',
      ),
    ).toBe('sample+token')

    expect(
      init.headers.get(
        'Content-Type',
      ),
    ).toBe(
      'application/json',
    )
  })

  it('preserves an error message and does not add CSRF to reads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              'Not permitted',
          }),
          {
            status: 403,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      )

    vi.stubGlobal(
      'fetch',
      fetchMock,
    )

    await expect(
      api(
        '/intake-applications/1',
      ),
    ).rejects.toMatchObject({
      message:
        'Not permitted',
      status: 403,
    })

    expect(
      fetchMock
        .mock.calls[0][1]
        .headers
        .has('X-XSRF-TOKEN'),
    ).toBe(false)
  })

  it('uses the default forbidden message when a 403 response has no body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 403,
        }),
      ),
    )

    await expect(
      api('/protected'),
    ).rejects.toMatchObject({
      status: 403,
      message:
        'You are not authorised to perform this action.',
    })
  })

  it('uses the response text as the error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          'Service unavailable',
          {
            status: 500,
          },
        ),
      ),
    )

    await expect(
      api('/protected'),
    ).rejects.toMatchObject({
      status: 500,
      message:
        'Service unavailable',
    })
  })

  it('uses a generic message when the error response is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 500,
        }),
      ),
    )

    await expect(
      api('/protected'),
    ).rejects.toMatchObject({
      status: 500,
      message:
        'Request failed with status 500.',
    })
  })

  it('accepts a successful response without content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 204,
        }),
      ),
    )

    await expect(
      api(
        '/auth/logout',
        {
          method: 'POST',
        },
      ),
    ).resolves.toBeUndefined()
  })

  it('returns text from a successful non-JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          'CareLink',
          {
            status: 200,
            headers: {
              'Content-Type':
                'text/plain',
            },
          },
        ),
      ),
    )

    await expect(
      api<string>('/text'),
    ).resolves.toBe(
      'CareLink',
    )
  })
})

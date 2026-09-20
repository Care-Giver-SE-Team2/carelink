import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('API client', () => {
  it('keeps the HTTP status when an unauthenticated response has no body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    await expect(api('/intake-applications')).rejects.toMatchObject({ status: 401 })
  })

  it('accepts an empty CSRF bootstrap response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    await expect(api<void>('/auth/csrf')).resolves.toBeUndefined()
  })

  it('sends the session cookie and echoes the CSRF cookie on writes', async () => {
    document.cookie = 'XSRF-TOKEN=sample%2Btoken; path=/'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":1}'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(api('/auth/login', { method: 'POST', body: '{}' })).resolves.toEqual({ id: 1 })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('include')
    expect(init.headers.get('X-XSRF-TOKEN')).toBe('sample+token')
    expect(init.headers.get('Content-Type')).toBe('application/json')
  })

  it('preserves a ProblemDetail message and does not add CSRF to reads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"detail":"Not permitted"}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(api('/intake-applications/1')).rejects.toMatchObject({
      message: 'Not permitted',
      status: 403,
    })
    expect(fetchMock.mock.calls[0][1].headers.has('X-XSRF-TOKEN')).toBe(false)
  })

  it('accepts a successful response without content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})

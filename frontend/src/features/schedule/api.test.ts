import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/client'
import { fetchElderList } from '../../shared/api/profile'
import { listFamilyVisits } from './api'
import type { FamilyVisitPage, ScheduleQuery } from './types'

const query: ScheduleQuery = {
  elderId: 101,
  dateFrom: '2026-09-21',
  dateTo: '2026-09-27',
  page: 0,
  size: 20,
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
}

describe('family schedule API', () => {
  it('sends the selected elder, inclusive week and page through the session client', async () => {
    const page: FamilyVisitPage = {
      items: [{
        id: 301,
        elderId: 101,
        caregiverId: null,
        serviceType: null,
        scheduledStart: '2026-09-22T09:00:00+08:00',
        scheduledEnd: null,
        checkedInAt: null,
        checkedOutAt: null,
        status: 'SCHEDULED',
        asOf: '2026-09-21T08:00:00+08:00',
      }],
      page: 0,
      size: 20,
      totalElements: 21,
    }
    const controller = new AbortController()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(page))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=example-token; path=/'

    await expect(listFamilyVisits(query, controller.signal)).resolves.toEqual(page)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/visits?elderId=101&dateFrom=2026-09-21&dateTo=2026-09-27&page=0&size=20',
      expect.objectContaining({ credentials: 'include', signal: controller.signal }),
    )
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(options.method).toBeUndefined()
    expect(options.body).toBeUndefined()
    const headers = new Headers(options.headers)
    expect(headers.has('X-XSRF-TOKEN')).toBe(false)
    expect(headers.has('Authorization')).toBe(false)
  })

  it('reads a subsequent page without changing the elder or week', async () => {
    const page: FamilyVisitPage = { items: [], page: 2, size: 20, totalElements: 21 }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(page))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFamilyVisits({ ...query, page: 2 })).resolves.toEqual(page)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/visits?elderId=101&dateFrom=2026-09-21&dateTo=2026-09-27&page=2&size=20',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('preserves the API permission error for the page to handle', async () => {
    const body = { status: 403, detail: 'This elder is no longer accessible.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 403,
      headers: { 'Content-Type': 'application/problem+json' },
    })))

    const error = await listFamilyVisits(query).catch((failure: unknown) => failure)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, message: body.detail, body })
  })

  it('lets the caller cancel an outstanding schedule request', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })
    })))

    const request = listFamilyVisits(query, controller.signal)
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('preserves network failures instead of reporting an empty week', async () => {
    const error = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    await expect(listFamilyVisits(query)).rejects.toBe(error)
  })
})

describe('shared elder list API', () => {
  it('keeps the array response and includes the session with an optional cancellation signal', async () => {
    const elders = [{
      id: 101,
      fullName: 'Tan Mei',
      dateOfBirth: null,
      address: null,
      sector: null,
      planStatus: 'none',
      planVersion: null,
      nextVisitDate: null,
    }]
    const controller = new AbortController()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(elders))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchElderList(controller.signal)).resolves.toEqual(elders)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/elders', expect.objectContaining({
      credentials: 'include',
      signal: controller.signal,
    }))
  })

  it('keeps existing calls without arguments working, including an empty list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchElderList()).resolves.toEqual([])

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/elders', expect.objectContaining({
      credentials: 'include',
      signal: undefined,
    }))
  })
})

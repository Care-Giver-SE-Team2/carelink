import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  concludeSpotCheck,
  decideSpotCheck,
  listCaregiverConclusions,
  listSpotChecks,
  listVisitsToCheck,
  moveSpotCheck,
  reportNoShow,
  requestSpotCheck,
  respondToSpotCheck,
  withdrawSpotCheck,
} from './api'

/** The request each UC-MG08 function makes: path, method, body, and CSRF before every write. @author Wang Ziyu */

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/csrf')) {
      document.cookie = 'XSRF-TOKEN=spot-token; path=/'
      return Promise.resolve(new Response(null))
    }
    return Promise.resolve(new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls.filter(([url]) => !String(url).endsWith('/csrf'))
  const [url, init] = calls[calls.length - 1]
  return { url: String(url), init: init as RequestInit, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('spot check reads', () => {
  it('narrows the list only by what was asked', async () => {
    const fetchMock = stubFetch()

    await listSpotChecks()
    expect(lastRequest(fetchMock).url).toBe('/api/spot-checks')
    await listSpotChecks({ stage: 'SCHEDULED', caregiverId: 5, elderId: 7 })
    expect(lastRequest(fetchMock).url).toBe('/api/spot-checks?stage=SCHEDULED&caregiverId=5&elderId=7')
    await listVisitsToCheck(7)
    expect(lastRequest(fetchMock).url).toBe('/api/spot-checks/visits?elderId=7')
    await listCaregiverConclusions(5)
    expect(lastRequest(fetchMock).url).toBe('/api/caregivers/5/spot-checks')
  })
})

describe('spot check writes', () => {
  it('initialises CSRF and posts each step with its body', async () => {
    const fetchMock = stubFetch()

    await requestSpotCheck(30, 'Routine')
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/auth/csrf')
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks', body: { visitId: 30, purpose: 'Routine' } })
    expect(new Headers(lastRequest(fetchMock).init.headers).get('X-XSRF-TOKEN')).toBe('spot-token')

    await decideSpotCheck(100, false, 'unwell')
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks/100/decision', body: { approve: false, reason: 'unwell' } })
    await concludeSpotCheck(100, 'NEEDS_IMPROVEMENT', 'gloves')
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks/100/conclusion', body: { result: 'NEEDS_IMPROVEMENT' } })
    await reportNoShow(100)
    expect(lastRequest(fetchMock).url).toBe('/api/spot-checks/100/no-show')
    await moveSpotCheck(100, 31)
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks/100/move', body: { visitId: 31 } })
    await withdrawSpotCheck(100, 'moved elders')
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks/100/withdrawal', body: { reason: 'moved elders' } })
    await respondToSpotCheck(100, 'noted')
    expect(lastRequest(fetchMock)).toMatchObject({ url: '/api/spot-checks/100/response', body: { response: 'noted' } })
    expect(lastRequest(fetchMock).init.method).toBe('POST')
  })
})

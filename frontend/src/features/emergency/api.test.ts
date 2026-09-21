import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { createEmergencyCall } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie =
    'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('emergency API', () => {
  it('creates an emergency call for the current elder', async () => {
    const incident = {
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
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify(incident),
          {
            status: 201,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createEmergencyCall(),
    ).resolves.toEqual(incident)

    expect(fetchMock)
      .toHaveBeenCalledTimes(1)

    expect(fetchMock.mock.calls[0][0])
      .toBe(
        '/api/elders/me/emergency-calls',
      )

    expect(fetchMock.mock.calls[0][1].method)
      .toBe('POST')

    expect(fetchMock.mock.calls[0][1].body)
      .toBe('{}')

    expect(fetchMock.mock.calls[0][1].credentials)
      .toBe('include')
  })
})
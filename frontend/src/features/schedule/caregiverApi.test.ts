import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/client'
import { getFamilyCaregiver, listFamilyCredentials } from './caregiverApi'
import type { FamilyCaregiver, FamilyCredential } from './types'

const caregiver: FamilyCaregiver = { id: 201, fullName: 'Lim Jia Hui', dialects: ['Mandarin', 'Hokkien'] }
const credentials: FamilyCredential[] = [{
  id: 401,
  caregiverId: 201,
  credentialTypeId: 11,
  credentialTypeName: 'First Aid',
  issuingBody: null,
  validFrom: null,
  expiryDate: '9999-12-31',
  status: 'PUBLISHED',
}]

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe.each([
  { name: 'caregiver profile', read: getFamilyCaregiver, path: '/api/caregivers/201', body: caregiver },
  { name: 'public credentials', read: listFamilyCredentials, path: '/api/caregivers/201/credentials', body: credentials },
])('family $name API', ({ read, path, body }) => {
  it('reads the exact resource through the shared session client with cancellation', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    document.cookie = 'XSRF-TOKEN=example-token; path=/'

    await expect(read(201, controller.signal)).resolves.toEqual(body)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(path, expect.objectContaining({
      credentials: 'include', signal: controller.signal,
    }))
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(options.method).toBeUndefined()
    expect(options.body).toBeUndefined()
    const headers = new Headers(options.headers)
    expect(headers.has('X-XSRF-TOKEN')).toBe(false)
    expect(headers.has('Authorization')).toBe(false)
  })

  it.each([401, 403, 404, 500])('preserves HTTP %i and its problem detail for the caller', async (status) => {
    const problem = { status, detail: 'Unable to read this caregiver.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), {
      status, headers: { 'Content-Type': 'application/problem+json' },
    })))

    const error = await read(201).catch((failure: unknown) => failure)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, message: problem.detail, body: problem })
  })

  it('preserves a network failure', async () => {
    const error = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

    await expect(read(201)).rejects.toBe(error)
  })

  it('lets the caller cancel an outstanding request', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })
    })))

    const request = read(201, controller.signal)
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})

it('preserves an empty credential array as a successful response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', {
    headers: { 'Content-Type': 'application/json' },
  })))

  await expect(listFamilyCredentials(201)).resolves.toEqual([])
})

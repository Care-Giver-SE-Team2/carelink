import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FamilyHome from './index'

const application = {
  id: 12,
  applicantFamilyMemberId: 2,
  targetElderName: 'Tan Mei',
  targetElderAge: null,
  targetAddress: '12 Example Road',
  postalCode: '123456',
  mobilityLevel: 'INDEPENDENT',
  preferredDialects: null,
  careNeeds: ['BATHING', 'VITALS'],
  medicalNotes: null,
  status: 'SUBMITTED',
  reviewRemarks: null,
  createdAt: '2026-09-20T04:54:01Z',
  reviewedAt: null,
  elderId: null,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function openFamily(path = '/family') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/family/*" element={<FamilyHome />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('Family intake pages', () => {
  it('signs in after an empty 401, then loads the originally requested detail', async () => {
    const user = userEvent.setup()
    let signedIn = false
    const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      if (url === '/api/auth/csrf') {
        document.cookie = 'XSRF-TOKEN=login-token; path=/'
        return Promise.resolve(new Response(null, { status: 200 }))
      }
      if (url === '/api/auth/login') {
        expect(JSON.parse(init.body as string)).toEqual({
          username: 'family_test',
          password: 'example-password',
        })
        expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('login-token')
        signedIn = true
        return Promise.resolve(
          json({
            id: 1,
            username: 'family_test',
            displayName: 'Family Test',
            roles: ['FAMILY'],
          }),
        )
      }
      return Promise.resolve(signedIn ? json(application) : new Response(null, { status: 401 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    openFamily('/family/intake/12')
    await user.type(await screen.findByLabelText('Username'), 'family_test')
    await user.type(screen.getByLabelText('Password'), 'example-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Tan Mei' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/intake-applications/12')
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
  })

  it('opens a detail page and preserves the list filter when returning', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.includes('?')
              ? json({ items: [application], page: 0, size: 20, totalElements: 1 })
              : json(application),
          ),
        ),
    )
    openFamily('/family/intake?status=SUBMITTED')
    await user.click(await screen.findByRole('link', { name: /Tan Mei/ }))
    expect(await screen.findByRole('heading', { name: 'Elder information' })).toBeInTheDocument()
    expect(screen.getByText('Bathing assistance')).toBeInTheDocument()
    expect(screen.getByText('Vital signs monitoring')).toBeInTheDocument()
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getAllByText('Not provided')).toHaveLength(3)
    expect(screen.queryByText('null')).not.toBeInTheDocument()
    const back = screen.getByRole('link', { name: /Back to applications/ })
    expect(back).toHaveAttribute('href', '/family/intake?status=SUBMITTED')
    await user.click(back)
    expect(await screen.findByRole('link', { name: /Tan Mei/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submitted', pressed: true })).toBeInTheDocument()
  })

  it('does not send login credentials when CSRF initialisation fails', async () => {
    const user = userEvent.setup()
    let finishBootstrap!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/csrf') {
        return new Promise<Response>((resolve) => {
          finishBootstrap = resolve
        })
      }
      return Promise.resolve(new Response(null, { status: 401 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    openFamily()
    await user.type(await screen.findByLabelText('Username'), 'family_test')
    await user.type(screen.getByLabelText('Password'), 'example-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/auth/login')
    await act(async () => finishBootstrap(new Response(null, { status: 500 })))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in')
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/auth/login')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it.each(['/api/auth/csrf', '/api/auth/login'])(
    'cancels a pending %s request when the user leaves the page',
    async (pendingPath) => {
      let pendingSignal: AbortSignal | undefined
      const fetchMock = vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url === pendingPath) {
          pendingSignal = init.signal ?? undefined
          return new Promise<Response>((_resolve, reject) => {
            pendingSignal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Request cancelled', 'AbortError'))
              },
              { once: true },
            )
          })
        }
        return Promise.resolve(new Response(null, { status: url.endsWith('/csrf') ? 200 : 401 }))
      })
      vi.stubGlobal('fetch', fetchMock)
      const view = openFamily()
      const user = userEvent.setup()
      await user.type(await screen.findByLabelText('Username'), 'family_test')
      await user.type(screen.getByLabelText('Password'), 'example-password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() => expect(pendingSignal).toBeDefined())
      await act(async () => view.unmount())
      expect(pendingSignal?.aborted).toBe(true)
      if (pendingPath.endsWith('/csrf')) {
        expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/auth/login')
      }
    },
  )

  it('preserves the full application identifier when requesting a detail page', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    openFamily('/family/intake/9223372036854775807')
    expect(
      await screen.findByRole('heading', { name: 'Application not found' }),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/intake-applications/9223372036854775807')
  })

  it('loads the current family’s applications through the session-authenticated API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ items: [application], page: 0, size: 20, totalElements: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    openFamily()
    expect(await screen.findByRole('link', { name: /Tan Mei/ })).toHaveAttribute(
      'href',
      '/family/intake/12',
    )
    expect(screen.getByText('12 Example Road')).toBeInTheDocument()
    expect(screen.getByText('1 application')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/intake-applications?page=0&size=20')
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include')
  })

  it('paginates on the server and resets to the first page when the status changes', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const query = new URL(url, 'http://localhost').searchParams
      const page = Number(query.get('page'))
      const approved = query.get('status') === 'APPROVED'
      return Promise.resolve(
        json({
          items: [{ ...application, id: page + 12, status: approved ? 'APPROVED' : 'SUBMITTED' }],
          page,
          size: 20,
          totalElements: approved ? 1 : 21,
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    openFamily('/family/intake')
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    await user.click(screen.getByRole('button', { name: 'Approved' }))
    expect(await screen.findByText('1 application')).toBeInTheDocument()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      '/api/intake-applications?page=0&size=20&status=APPROVED',
    )
    expect(screen.queryByRole('navigation', { name: 'Application pages' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tan Mei/ })).toHaveAttribute(
      'href',
      '/family/intake/12?status=APPROVED',
    )
    await user.click(screen.getByRole('button', { name: 'All applications' }))
    expect(await screen.findByText('21 applications')).toBeInTheDocument()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/intake-applications?page=0&size=20')
  })

  it.each([
    ['/family/intake', 'No applications yet'],
    ['/family/intake?status=REJECTED', 'No matching applications'],
    ['/family/intake?page=99', 'No applications on this page'],
  ])('shows a useful empty state for %s', async (path, heading) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(json({ items: [], page: 0, size: 20, totalElements: 0 })),
        ),
    )
    openFamily(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    if (path.includes('?')) {
      await userEvent.setup().click(screen.getByRole('button', { name: 'View all applications' }))
      expect(
        await screen.findByRole('heading', { name: 'No applications yet' }),
      ).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: /Tan Mei/ })).not.toBeInTheDocument()
  })

  it('uses safe defaults for invalid URL filters and page numbers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ items: [], page: 0, size: 20, totalElements: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    openFamily('/family/intake?page=-10&status=PRIVATE&applicantFamilyMemberId=999')
    await screen.findByText('No applications yet')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/intake-applications?page=0&size=20')
  })

  it.each([401, 403])(
    'removes previously visible application data after a %s on refresh',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json({ items: [application], page: 0, size: 20, totalElements: 1 }))
        .mockResolvedValueOnce(new Response(null, { status }))
      vi.stubGlobal('fetch', fetchMock)
      openFamily()
      await screen.findByRole('link', { name: /Tan Mei/ })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }))
      expect(
        await screen.findByRole('heading', {
          name: status === 401 ? 'Sign in to continue' : 'Access unavailable',
        }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
      expect(screen.queryByText('12 Example Road')).not.toBeInTheDocument()
    },
  )

  it.each([
    [400, 'Invalid application request'],
    [403, 'Access unavailable'],
    [404, 'Application not found'],
  ])('explains detail HTTP %s without showing data', async (status, title) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: status as number })),
    )
    openFamily('/family/intake/12')
    expect(await screen.findByRole('heading', { name: title as string })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to applications/ })).toBeInTheDocument()
    expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
  })

  it('allows signing in with another account after a permission failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    openFamily()
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Sign in with another account' }))
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it.each(['network', 'server'])(
    'retries a %s failure and recovers the application list',
    async (failure) => {
      const fetchMock = vi.fn()
      if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      else fetchMock.mockResolvedValueOnce(json({ detail: 'Internal database details' }, 500))
      fetchMock.mockResolvedValueOnce(
        json({ items: [application], page: 0, size: 20, totalElements: 1 }),
      )
      vi.stubGlobal('fetch', fetchMock)
      openFamily()
      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load applications')
      expect(screen.queryByText('Internal database details')).not.toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('link', { name: /Tan Mei/ })).toBeInTheDocument()
    },
  )

  it('ignores a slow response for a filter that is no longer selected', async () => {
    let finishOldRequest!: (response: Response) => void
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finishOldRequest = resolve
          }),
      )
      .mockResolvedValueOnce(
        json({
          items: [{ ...application, targetElderName: 'Lim Wei', status: 'APPROVED' }],
          page: 0,
          size: 20,
          totalElements: 1,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    openFamily()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Approved' }))
    expect(await screen.findByRole('link', { name: /Lim Wei/ })).toBeInTheDocument()
    await act(async () =>
      finishOldRequest(json({ items: [application], page: 0, size: 20, totalElements: 1 })),
    )
    expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
    expect(screen.getByText('Lim Wei')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('shows approved review information, Singapore dates and unknown care needs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          ...application,
          targetElderAge: 0,
          preferredDialects: 'Hokkien',
          medicalNotes: 'Check blood pressure.',
          mobilityLevel: 'ASSISTIVE_CANE',
          status: 'APPROVED',
          reviewRemarks: 'Approved after assessment.',
          reviewedAt: '2026-09-20T18:00:00Z',
          elderId: 42,
          careNeeds: ['CUSTOM_CARE'],
        }),
      ),
    )
    openFamily('/family/intake/12')
    expect(await screen.findByText('Approved after assessment.')).toBeInTheDocument()
    expect(screen.getByText('0 years')).toBeInTheDocument()
    expect(screen.getByText('Hokkien')).toBeInTheDocument()
    expect(screen.getByText('Uses a walking aid')).toBeInTheDocument()
    expect(screen.getByText('Check blood pressure.')).toBeInTheDocument()
    expect(screen.getByText('CUSTOM_CARE')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText(/21 Sept 2026/)).toHaveTextContent('2:00 am')
    expect(screen.queryByText('Awaiting review')).not.toBeInTheDocument()
  })

  it.each(['UNDER_REVIEW', 'REJECTED'])(
    'renders the %s review state and empty care needs',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json({ ...application, status, careNeeds: [] })),
      )
      openFamily('/family/intake/12')
      expect(await screen.findByText('No care needs recorded.')).toBeInTheDocument()
      expect(
        screen.getByText(
          status === 'REJECTED'
            ? 'No review notes recorded.'
            : 'The care team has not added any review notes yet.',
        ),
      ).toBeInTheDocument()
    },
  )

  it('clears detail data when access expires during refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(application))
        .mockResolvedValueOnce(new Response(null, { status: 401 })),
    )
    openFamily('/family/intake/12')
    await screen.findByText('Tan Mei', { selector: 'h1' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh application' }))
    expect(await screen.findByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()
    expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
  })

  it.each([401, 403, 500])(
    'keeps the login form and explains a failed sign-in (%s)',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.endsWith('/csrf')
              ? new Response(null)
              : new Response(null, { status: url.endsWith('/login') ? status : 401 }),
          ),
        )
      vi.stubGlobal('fetch', fetchMock)
      openFamily()
      const user = userEvent.setup()
      await user.type(await screen.findByLabelText('Username'), 'family_test')
      await user.type(screen.getByLabelText('Password'), 'wrong-password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        status === 401
          ? 'username or password is incorrect'
          : status === 403
            ? 'sign-in request expired'
            : 'Unable to sign in',
      )
      expect(screen.getByLabelText('Password')).toHaveValue('')
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
      expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
    },
  )

  it('cancels an outstanding request when the page is unmounted', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const view = openFamily()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    view.unmount()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('does not redisplay an old result when returning to a filter before the next request finishes', async () => {
    let finishRefresh!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ items: [application], page: 0, size: 20, totalElements: 1 }))
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              finishRefresh = resolve
            }),
        ),
    )
    const user = userEvent.setup()
    openFamily()
    await screen.findByText('Tan Mei')
    await user.click(screen.getByRole('button', { name: 'Approved' }))
    await user.click(screen.getByRole('button', { name: 'All applications' }))
    expect(screen.queryByText('Tan Mei')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    await act(async () => finishRefresh(new Response(null, { status: 401 })))
    expect(await screen.findByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()
  })

  it('offers a way back for an unknown family route', () => {
    openFamily('/family/missing')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to applications' })).toHaveAttribute(
      'href',
      '/family/intake',
    )
  })
})

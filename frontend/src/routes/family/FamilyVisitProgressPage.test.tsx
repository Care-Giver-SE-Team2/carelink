import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FamilyHome from './index'

const family = { id: 7, username: 'family-a', displayName: 'Family A', roles: ['FAMILY'] }
const visit = {
  id: 501, elderId: 101, caregiverId: 201, serviceType: 'Home care', status: 'IN_PROGRESS',
  scheduledStart: '2026-09-30T09:00:00+08:00', scheduledEnd: '2026-09-30T10:00:00+08:00',
  checkedInAt: '2026-09-30T09:03:00+08:00', checkedOutAt: null, asOf: '2026-09-30T09:20:00+08:00',
}
const timeline = [
  { id: 801, visitId: 501, fromState: 'SCHEDULED', toState: 'ARRIVED', result: 'APPLIED', occurredAt: '2026-09-30T09:03:00+08:00' },
  { id: 802, visitId: 501, fromState: 'ARRIVED', toState: 'IN_PROGRESS', result: 'APPLIED', occurredAt: '2026-09-30T09:05:00+08:00' },
]
const tasks = [
  { id: 901, visitId: 501, name: 'Assist with walking', status: 'DONE', completedAt: '2026-09-30T09:15:00+08:00' },
  { id: 902, visitId: 501, name: 'Meal preparation', status: 'PENDING', completedAt: null },
  { id: 903, visitId: 501, name: 'Exercise', status: 'SKIPPED', completedAt: null },
  { id: 904, visitId: 501, name: 'Optional activity', status: 'REFUSED', completedAt: null },
]
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}
function installApi(override?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined) {
  const fetchMock = vi.fn((path: string, init: RequestInit) => {
    const url = new URL(path, 'http://localhost')
    const response = override?.(url, init)
    if (response !== undefined) return Promise.resolve(response)
    if (url.pathname === '/api/auth/me') return Promise.resolve(json(family))
    if (url.pathname === '/api/elders') return Promise.resolve(json([{ id: 101, fullName: 'Elder A' }]))
    if (url.pathname === '/api/visits') return Promise.resolve(json({
      items: [visit, { ...visit, id: 502, caregiverId: null }], page: 0, size: 20, totalElements: 2,
    }))
    if (url.pathname === '/api/visits/501') return Promise.resolve(json(visit))
    if (url.pathname === '/api/visits/501/timeline') return Promise.resolve(json(timeline))
    if (url.pathname === '/api/visits/501/tasks') return Promise.resolve(json(tasks))
    throw new Error(`Unexpected API request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
function CurrentUrl() {
  const navigate = useNavigate()
  const location = useLocation()
  return <>
    <button onClick={() => navigate('/family/visits/502')}>Open another visit</button>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <div aria-label="Current URL">{location.pathname}{location.search}</div>
  </>
}
function openProgress(path = '/family/visits/501') {
  return render(<MemoryRouter initialEntries={[path]}>
    <CurrentUrl />
    <Routes><Route path="/family/*" element={<FamilyHome />} /></Routes>
  </MemoryRouter>)
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('Family visit progress', () => {
  it.each([401, 403].flatMap((status) => ['details', 'timeline', 'tasks'].map((part) => [status, part] as const)))(
    'clears every section on %s from %s and ignores later successes', async (status, part) => {
      let refreshing = false
      const pending = new Map<string, (response: Response) => void>()
      const fetchMock = installApi((url) => refreshing && url.pathname.startsWith('/api/visits/')
        ? new Promise<Response>((resolve) => { pending.set(url.pathname, resolve) }) : undefined)
      openProgress()
      await screen.findByText('1 of 4 tasks completed')
      refreshing = true
      await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh progress' }))
      expect(screen.queryByText('Home care')).not.toBeInTheDocument()
      await waitFor(() => expect(pending.size).toBe(3))
      const failedPath = '/api/visits/501' + (part === 'details' ? '' : '/' + part)
      await act(async () => pending.get(failedPath)!(json({}, status)))
      expect(await screen.findByRole('heading', { name: status === 401 ? 'Sign in to continue' : 'Visit access unavailable' })).toBeInTheDocument()
      for (const [path, finish] of pending) {
        if (path !== failedPath) await act(async () => finish(json(path.endsWith('/tasks') ? tasks : path.endsWith('/timeline') ? timeline : visit)))
      }
      expect(screen.queryByText('Home care')).not.toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Visit tasks' })).not.toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Service updates' })).not.toBeInTheDocument()
      expect(fetchMock.mock.calls.slice(-3).every(([, init]) => init.signal?.aborted)).toBe(true)
    },
  )

  it('ignores the first visit response after switching away and back to the same ID', async () => {
    let first = true
    const pending: Array<(response: Response) => void> = []
    const fetchMock = installApi((url) => {
      if (!url.pathname.startsWith('/api/visits/')) return
      if (url.pathname.startsWith('/api/visits/501') && first) return new Promise<Response>((resolve) => { pending.push(resolve) })
      if (url.pathname.endsWith('/tasks') || url.pathname.endsWith('/timeline')) return json([])
      return json({ ...visit, serviceType: url.pathname.endsWith('/502') ? 'Other care' : 'Fresh care' })
    })
    const user = userEvent.setup()
    openProgress()
    await waitFor(() => expect(pending).toHaveLength(3))
    first = false
    await user.click(screen.getByRole('button', { name: 'Open another visit' }))
    expect(await screen.findByText('Other care')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(await screen.findByText('Fresh care')).toBeInTheDocument()
    await act(async () => { pending[0](json(visit)); pending[1](json(timeline)); pending[2](json(tasks)) })
    expect(screen.getByText('Fresh care')).toBeInTheDocument()
    expect(screen.queryByText('Home care')).not.toBeInTheDocument()
    expect(screen.queryByText('Assist with walking')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.slice(1, 4).every(([, init]) => init.signal?.aborted)).toBe(true)
  })

  it.each(['session', 'sections'])('cancels pending %s requests on leaving and ignores their late responses', async (stage) => {
    const pending: Array<(response: Response) => void> = []
    const fetchMock = installApi((url) => (stage === 'session' || url.pathname.startsWith('/api/visits/'))
      ? new Promise<Response>((resolve) => { pending.push(resolve) }) : undefined)
    const view = openProgress()
    await waitFor(() => expect(pending).toHaveLength(stage === 'session' ? 1 : 3))
    view.unmount()
    expect(fetchMock.mock.calls.every(([, init]) => init.signal?.aborted)).toBe(true)
    await act(async () => {
      if (stage === 'session') pending[0](json(family))
      else { pending[0](json(visit)); pending[1](json({}, 401)); pending[2](json({}, 503)) }
    })
    expect(fetchMock).toHaveBeenCalledTimes(stage === 'session' ? 1 : 4)
  })

  it.each([[401, true], [401, false], [403, false]] as const)(
    'rechecks the same visit after signing in from %s (access granted: %s)', async (initialStatus, granted) => {
      let signedIn = false
      const fetchMock = installApi((url) => {
        if (url.pathname === '/api/auth/me' && !signedIn) return json({}, initialStatus)
        if (url.pathname === '/api/auth/csrf') {
          document.cookie = 'XSRF-TOKEN=visit-token; path=/'
          return new Response(null, { status: 204 })
        }
        if (url.pathname === '/api/auth/login') { signedIn = true; return json(family) }
        if (signedIn && !granted && url.pathname.endsWith('/tasks')) return json({}, 403)
      })
      const user = userEvent.setup()
      openProgress()
      if (initialStatus === 403) await user.click(await screen.findByRole('button', { name: 'Sign in with another account' }))
      await user.type(await screen.findByLabelText('Username'), 'family-a')
      await user.type(screen.getByLabelText('Password'), 'test-only-password')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))
      if (granted) expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
      else {
        expect(await screen.findByRole('heading', { name: 'Visit access unavailable' })).toBeInTheDocument()
        expect(screen.queryByText('Home care')).not.toBeInTheDocument()
      }
      const login = fetchMock.mock.calls.find(([path]) => path === '/api/auth/login')!
      expect(login[1].method).toBe('POST')
      expect(new Headers(login[1].headers).get('X-XSRF-TOKEN')).toBe('visit-token')
      expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/me')).toHaveLength(2)
      expect(fetchMock.mock.calls.map(([path]) => path)).toContain('/api/visits/501/tasks')
    },
  )

  it.each([400, 404])('clears all sections when a child endpoint returns %s', async (status) => {
    installApi((url) => url.pathname.endsWith('/timeline') ? json({}, status) : undefined)
    openProgress()
    expect(await screen.findByRole('heading', { name: status === 400 ? 'Invalid visit link' : 'Visit not found' })).toBeInTheDocument()
    expect(screen.queryByText('Home care')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it.each(['network', 'server'])('recovers from a %s session-check failure without showing care data', async (failure) => {
    let unavailable = true
    const fetchMock = installApi((url) => url.pathname === '/api/auth/me' && unavailable
      ? failure === 'network' ? Promise.reject(new TypeError('Failed to fetch')) : json({}, 503) : undefined)
    openProgress()
    expect(await screen.findByRole('heading', { name: 'Unable to load visit progress' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    unavailable = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
  })

  it.each([
    ['SCHEDULED', 'Scheduled'], ['ARRIVED', 'Arrived'], ['IN_PROGRESS', 'In progress'],
    ['COMPLETED', 'Completed'], ['VERIFIED', 'Verified'], ['AUTO_CLOSED', 'Automatically closed'],
    ['EXCEPTION', 'Exception'], ['CANCELLED', 'Cancelled'],
  ])('shows stored %s without advancing it based on the clock', async (status, label) => {
    installApi((url) => url.pathname === '/api/visits/501' ? json({ ...visit, status }) : undefined)
    openProgress()
    const detail = await screen.findByRole('region', { name: 'Visit details' })
    expect(await within(detail).findByText(label)).toBeInTheDocument()
  })

  it('keeps missing visit facts and empty sections distinct from completed care', async () => {
    installApi((url) => {
      if (url.pathname === '/api/visits/501') return json({ ...visit, serviceType: null, caregiverId: null,
        status: 'SCHEDULED', scheduledEnd: null, checkedInAt: null, checkedOutAt: null })
      if (/\/(timeline|tasks)$/.test(url.pathname)) return json([])
    })
    openProgress()
    expect(await screen.findByText('No task records yet.')).toBeInTheDocument()
    expect(screen.getByText('No service updates recorded yet.')).toBeInTheDocument()
    expect(screen.getByText('Care visit')).toBeInTheDocument()
    expect(screen.getByText('Caregiver awaiting assignment')).toBeInTheDocument()
    expect(screen.getAllByText('Not recorded')).toHaveLength(3)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders names as plain text and counts DONE even when its completion time is missing', async () => {
    const name = '<img src=x onerror=alert(1)>\n  A very long task description'
    installApi((url) => url.pathname.endsWith('/tasks') ? json([
      { ...tasks[0], name, completedAt: null }, { ...tasks[2], completedAt: visit.checkedInAt }, tasks[3],
    ]) : undefined)
    const { container } = openProgress()
    expect(await screen.findByText('1 of 3 tasks completed')).toBeInTheDocument()
    expect(screen.getByText(/<img src=x/).textContent).toBe(name)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Completion time not recorded.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '3')
  })

  it('formats overnight and UTC timestamps in Singapore and labels each section separately', async () => {
    installApi((url) => url.pathname === '/api/visits/501' ? json({ ...visit,
      scheduledStart: '2026-09-30T15:30:00Z', scheduledEnd: '2026-09-30T16:30:00Z' }) : undefined)
    const { container } = openProgress()
    await screen.findByText('1 of 4 tasks completed')
    expect(container.querySelector('time[datetime="2026-09-30T15:30:00Z"]')).toHaveTextContent('23:30')
    expect(container.querySelector('time[datetime="2026-09-30T16:30:00Z"]')).toHaveTextContent(/1 Oct 2026, 00:30/)
    expect(screen.getByText(/Visit details checked/)).toHaveTextContent('09:20')
    expect(screen.getByText(/Timeline loaded/).querySelector('time')).not.toHaveAttribute('datetime', visit.asOf)
    expect(screen.getByText(/Tasks loaded/).querySelector('time')).not.toHaveAttribute('datetime', visit.asOf)
  })

  it.each(['0', '-1', 'abc', '1.5', '1e3', '9223372036854775808', '%2Fprivate'])('rejects invalid visit ID %s without querying care data', async (id) => {
    const fetchMock = installApi()
    openProgress('/family/visits/' + id)
    expect(await screen.findByRole('heading', { name: 'Invalid visit link' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves a valid long ID in requests without JavaScript number rounding', async () => {
    const id = '9223372036854775807'
    const fetchMock = installApi((url) => url.pathname.startsWith('/api/visits/') ? json({}, 404) : undefined)
    openProgress('/family/visits/' + id)
    expect(await screen.findByRole('heading', { name: 'Visit not found' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([path]) => path)).toContain('/api/visits/' + id)
    expect(screen.queryByText('No task records yet.')).not.toBeInTheDocument()
  })

  it.each(['MANAGER', 'CAREGIVER'])('does not request visit data for a %s session', async (role) => {
    const fetchMock = installApi((url) => url.pathname === '/api/auth/me' ? json({ ...family, roles: [role] }) : undefined)
    openProgress()
    expect(await screen.findByRole('heading', { name: 'Visit access unavailable' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me'])
  })

  it('accepts the prefixed family role', async () => {
    installApi((url) => url.pathname === '/api/auth/me' ? json({ ...family, roles: ['ROLE_FAMILY'] }) : undefined)
    openProgress()
    expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
  })

  it.each([
    ['/api/visits/501', 'Visit details'], ['/api/visits/501/timeline', 'Service timeline'], ['/api/visits/501/tasks', 'Task progress'],
  ])('allows independent sections to load while %s is pending', async (path, title) => {
    let finish!: (response: Response) => void
    installApi((url) => url.pathname === path ? new Promise<Response>((resolve) => { finish = resolve }) : undefined)
    openProgress()
    const section = await screen.findByRole('region', { name: title })
    expect(within(section).getByRole('status')).toHaveTextContent('Loading')
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Refresh progress' })).toBeDisabled()
    await act(async () => finish(json(path.endsWith('/tasks') ? tasks : path.endsWith('/timeline') ? timeline : visit)))
    expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh progress' })).toBeEnabled()
  })

  it.each([
    ['/api/visits/501', 'Visit details'], ['/api/visits/501/timeline', 'Service timeline'], ['/api/visits/501/tasks', 'Task progress'],
  ])('clears stale data on refresh and distinguishes %s failure from an empty result', async (path, title) => {
    let failed = false
    installApi((url) => failed && url.pathname === path ? json({ detail: 'PRIVATE server message' }, 503) : undefined)
    openProgress()
    await screen.findByText('1 of 4 tasks completed')
    failed = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh progress' }))
    const section = await screen.findByRole('region', { name: title })
    expect(await within(section).findByRole('alert')).toHaveTextContent('Unable to load')
    expect(within(section).queryByRole('list')).not.toBeInTheDocument()
    expect(within(section).queryByText(/loaded|checked|No task|No service/)).not.toBeInTheDocument()
    expect(screen.queryByText('PRIVATE server message')).not.toBeInTheDocument()
    failed = false
    await userEvent.setup().click(within(section).getByRole('button'))
    expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('opens progress from assigned and unassigned schedule cards and returns to the schedule', async () => {
    installApi()
    const user = userEvent.setup()
    openProgress('/family/schedule')
    const link = await screen.findByRole('link', { name: 'View progress for visit 501' })
    expect(link).toHaveAttribute('href', '/family/visits/501')
    expect(screen.getByRole('link', { name: 'View progress for visit 502' })).toHaveAttribute('href', '/family/visits/502')
    await user.click(link)
    await screen.findByText('1 of 4 tasks completed')
    await user.click(screen.getByRole('link', { name: 'Back to schedule' }))
    expect(await screen.findByRole('list', { name: 'Scheduled visits' })).toBeInTheDocument()
  })
  it('opens a deep link through the family session and reads the three family projections', async () => {
    const fetchMock = installApi()
    openProgress('/family/visits/501?elderId=999&role=MANAGER&familyMemberId=999')
    expect(await screen.findByRole('heading', { name: 'Visit progress', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText('1 of 4 tasks completed')).toBeInTheDocument()
    expect(document.title).toBe('Visit progress · CareLink')
    const detail = screen.getByRole('region', { name: 'Visit details' })
    expect(within(detail).getByText('Home care')).toBeInTheDocument()
    expect(within(detail).getByText('In progress')).toBeInTheDocument()
    expect(within(detail).getByText('Not recorded')).toBeInTheDocument()
    const history = screen.getByRole('list', { name: 'Service updates' })
    expect(within(history).getAllByRole('listitem')).toHaveLength(2)
    expect(history).toHaveTextContent('Scheduled → Arrived')
    expect(history).toHaveTextContent('Arrived → In progress')
    const taskList = screen.getByRole('list', { name: 'Visit tasks' })
    expect(within(taskList).getByText('Skipped')).toBeInTheDocument()
    expect(within(taskList).getByText('Refused')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Completed tasks' })).toHaveAttribute('value', '1')
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/auth/me', '/api/visits/501', '/api/visits/501/timeline', '/api/visits/501/tasks',
    ])
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.credentials).toBe('include')
      expect(init.signal).toBeInstanceOf(AbortSignal)
      expect(init.method ?? 'GET').toBe('GET')
    }
    expect(screen.getByRole('link', { name: 'Back to schedule' })).toHaveAttribute('href', '/family/schedule')
  })
})

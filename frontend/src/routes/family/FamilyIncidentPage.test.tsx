import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FamilyHome from './index'
import type { FamilyIncidentAcknowledgement } from '../../features/incidents/familyTypes'

const family = { id: 7, username: 'family-a', displayName: 'Family A', roles: ['FAMILY'] }
const emptyReceipt = { id: null, incidentId: 601, familyMemberId: 42, viewedAt: null, acknowledgedAt: null, responseNote: null }
const viewed = { ...emptyReceipt, id: 51, viewedAt: '2026-10-07T16:10:00+08:00' }
const acknowledged = { ...viewed, acknowledgedAt: '2026-10-07T16:20:00+08:00', responseNote: 'I have spoken to the team.' }
const detail = { id: 601, elderId: 101, visitId: 201, source: 'CAREGIVER', category: 'FALL', severity: 'HIGH', status: 'OPEN',
  description: 'A fall was reported.\n\n  The care team is responding.', reportedAt: '2026-10-07T07:00:00Z', resolvedAt: null,
  acknowledgeBy: '2026-10-07T18:00:00+08:00', acknowledgement: emptyReceipt }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done }); return { promise, resolve } }
function installApi(override?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined) {
  let receipt: FamilyIncidentAcknowledgement = { ...emptyReceipt }
  const fetchMock = vi.fn((path: string, init: RequestInit) => {
    const url = new URL(path, 'http://localhost')
    const response = override?.(url, init)
    if (response !== undefined) return Promise.resolve(response)
    if (url.pathname === '/api/auth/me') return Promise.resolve(json(family))
    if (url.pathname === '/api/auth/csrf') { document.cookie = 'XSRF-TOKEN=test-token; path=/'; return Promise.resolve(new Response(null, { status: 204 })) }
    if (url.pathname === '/api/family/incidents/601') return Promise.resolve(json({ ...detail, acknowledgement: receipt }))
    if (url.pathname === '/api/incidents/601/view') { receipt = { ...receipt, ...viewed, acknowledgedAt: receipt.acknowledgedAt, responseNote: receipt.responseNote }; return Promise.resolve(json(receipt)) }
    if (url.pathname === '/api/incidents/601/acknowledge') { receipt = { ...receipt, ...acknowledged, viewedAt: receipt.viewedAt, responseNote: JSON.parse(init.body as string).responseNote }; return Promise.resolve(json(receipt)) }
    throw new Error(`Unexpected API request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
function Navigation() {
  const navigate = useNavigate()
  return <><button onClick={() => navigate('/family/incidents/602')}>Another incident</button><button onClick={() => navigate('/')}>Leave</button></>
}
function open(path = '/family/incidents/601', strict = false) {
  const app = <MemoryRouter initialEntries={[path]}><Navigation /><Routes>
    <Route path="/" element={<h1>Landing</h1>} /><Route path="/family/*" element={<FamilyHome />} />
  </Routes></MemoryRouter>
  return render(strict ? <StrictMode>{app}</StrictMode> : app)
}
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/' })

describe('FM05 family incident page', () => {
  it('opens a deep link with the family projection, then records viewing only after rendering', async () => {
    const fetchMock = installApi((url) => {
      if (url.pathname === '/api/incidents/601/view') expect(screen.getByRole('article', { name: 'Incident #601' })).toBeInTheDocument()
      return undefined
    })
    open('/family/incidents/601?elderId=999&familyMemberId=999&notificationId=999')
    const article = await screen.findByRole('article')
    await screen.findByText(/First viewed/)
    expect(document.title).toBe('Incident details · CareLink')
    expect(within(article).getByText('Elder profile #101 · Visit #201')).toBeInTheDocument()
    expect(within(article).getByText('High severity')).toBeInTheDocument()
    expect(within(article).getByText('Reported', { selector: 'span' })).toBeInTheDocument()
    expect(within(article).getByRole('region', { name: 'What happened' }).querySelector('p')?.textContent).toBe(detail.description)
    expect(within(article).getByText('7 Oct 2026, 15:00')).toBeInTheDocument()
    expect(within(article).getByText('7 Oct 2026, 18:00')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me', '/api/family/incidents/601', '/api/auth/me', '/api/auth/csrf', '/api/incidents/601/view'])
    const write = fetchMock.mock.calls.find(([path]) => path.endsWith('/view'))![1]
    expect(write.method).toBe('POST'); expect(write.body).toBeUndefined()
    expect(new Headers(write.headers).get('X-XSRF-TOKEN')).toBe('test-token')
    for (const [, init] of fetchMock.mock.calls) { expect(init.credentials).toBe('include'); expect(init.signal).toBeInstanceOf(AbortSignal) }
    expect(fetchMock.mock.calls.some(([path]) => path.includes('/notifications/'))).toBe(false)
    expect(screen.queryByText('Awareness confirmed')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Resolve|Take over/ })).not.toBeInTheDocument()
  })

  it('requires an explicit awareness click, submits only the note and shows the saved server receipt', async () => {
    const fetchMock = installApi(); open(); await screen.findByText(/First viewed/)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Optional note' }), 'I have spoken to the team.')
    await user.click(screen.getByRole('button', { name: 'I am aware' }))
    expect(await screen.findByText('Awareness confirmed')).toBeInTheDocument()
    expect(screen.getByText('I have spoken to the team.')).toBeInTheDocument()
    expect(screen.getByText('7 Oct 2026, 16:20')).toBeInTheDocument()
    const writes = fetchMock.mock.calls.filter(([path]) => path.endsWith('/acknowledge'))
    expect(writes).toHaveLength(1)
    expect(JSON.parse(writes[0][1].body as string)).toEqual({ responseNote: 'I have spoken to the team.' })
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Reported', { selector: 'span' })).toBeInTheDocument()
  })

  it('allows awareness without a personal deadline and after resolution, without inventing times', async () => {
    const fetchMock = installApi((url) => url.pathname === '/api/family/incidents/601' ? json({ ...detail, status: 'RESOLVED', acknowledgeBy: null,
      visitId: null, description: null, acknowledgement: viewed }) : undefined)
    open(); await screen.findByRole('article')
    expect(screen.getByText('No personal response time is recorded. You can still confirm awareness.')).toBeInTheDocument()
    expect(screen.getByText('No description was recorded.')).toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date|Resolved on/)).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByText('Awareness confirmed')
    expect(JSON.parse(fetchMock.mock.calls.find(([path]) => path.endsWith('/acknowledge'))![1].body as string)).toEqual({ responseNote: null })
  })

  it('shows an existing first acknowledgement and plain-text notes without sending another write', async () => {
    const note = '<img src=x onerror="alert(1)">\n\n  **Plain text**'
    const fetchMock = installApi((url) => url.pathname === '/api/family/incidents/601' ? json({ ...detail, description: note, acknowledgement: { ...acknowledged, responseNote: note } }) : undefined)
    open(); const article = await screen.findByRole('article')
    expect(await screen.findByText('Awareness confirmed')).toBeInTheDocument()
    expect(article.querySelector('img')).toBeNull()
    expect(within(article).getAllByText(/<img src=x/)).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/view') || path.endsWith('/acknowledge'))).toBe(false)
    expect(screen.queryByRole('button', { name: 'I am aware' })).not.toBeInTheDocument()
  })

  it('retains the note on failed acknowledgement and retries only on another explicit click', async () => {
    let fail = true
    const fetchMock = installApi((url) => url.pathname.endsWith('/acknowledge') && fail ? json({ detail: 'Private database error' }, 503) : undefined)
    open(); await screen.findByText(/First viewed/)
    const user = userEvent.setup(); const note = screen.getByRole('textbox')
    await user.type(note, 'Please keep me updated.')
    await user.click(screen.getByRole('button', { name: 'I am aware' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not confirm')
    expect(note).toHaveValue('Please keep me updated.')
    expect(screen.queryByText('Private database error')).not.toBeInTheDocument()
    expect(screen.queryByText('Awareness confirmed')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/acknowledge'))).toHaveLength(1)
    fail = false; await user.click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByText('Awareness confirmed')
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/acknowledge'))).toHaveLength(2)
  })

  it('does not block awareness when the independent viewing receipt fails', async () => {
    let fail = true
    const fetchMock = installApi((url) => url.pathname.endsWith('/view') && fail ? json({}, 500) : undefined)
    open(); await screen.findByRole('button', { name: 'Retry viewing receipt' })
    expect(screen.queryByText(/First viewed/)).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByText('Awareness confirmed')
    fail = false; await userEvent.setup().click(screen.getByRole('button', { name: 'Retry viewing receipt' }))
    await screen.findByText(/First viewed/)
    expect(screen.getByText('Awareness confirmed')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/view'))).toHaveLength(2)
  })

  it('disables repeat submission from CSRF initialisation until the authoritative response', async () => {
    const response = deferred<Response>()
    const fetchMock = installApi((url) => url.pathname.endsWith('/acknowledge') ? response.promise : undefined)
    open(); await screen.findByText(/First viewed/)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'I am aware' }))
    const saving = await screen.findByRole('button', { name: 'Confirming…' })
    expect(saving).toBeDisabled(); expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.queryByText('Awareness confirmed')).not.toBeInTheDocument()
    await user.click(saving)
    await act(async () => response.resolve(json(acknowledged)))
    await screen.findByText('Awareness confirmed')
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/acknowledge'))).toHaveLength(1)
  })

  it('keeps awareness when an older viewing response arrives later', async () => {
    const response = deferred<Response>()
    installApi((url) => url.pathname.endsWith('/view') ? response.promise : undefined)
    open(); await screen.findByRole('article')
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByText('Awareness confirmed')
    await act(async () => response.resolve(json(viewed)))
    await screen.findByText(/First viewed/)
    expect(screen.getByText('Awareness confirmed')).toBeInTheDocument()
    expect(screen.getByText('7 Oct 2026, 16:20')).toBeInTheDocument()
  })

  it.each([401, 403])('clears all care content and note on acknowledgement status %s', async (status) => {
    installApi((url) => url.pathname.endsWith('/acknowledge') ? json({ detail: 'Private detail' }, status) : undefined)
    open(); await screen.findByText(/First viewed/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByRole('heading', { name: status === 401 ? 'Landing' : 'Incident access unavailable' })
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Private detail')).not.toBeInTheDocument()
  })

  it.each([[400, 'Invalid incident link'], [403, 'Incident access unavailable'], [404, 'Incident not found'], [503, 'Unable to load this incident']])(
    'shows safe detail-load feedback for %s', async (status, heading) => {
      const fetchMock = installApi((url) => url.pathname === '/api/family/incidents/601' ? json({ detail: 'Private server error' }, status as number) : undefined)
      open(); await screen.findByRole('heading', { name: heading as string })
      expect(screen.queryByRole('article')).not.toBeInTheDocument()
      expect(screen.queryByText('Private server error')).not.toBeInTheDocument()
      expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/view'))).toBe(false)
    })

  it.each(['0', '-1', '1e2', 'abc', '9223372036854775808'])('rejects malformed incident link %s before any care read', async (id) => {
    const fetchMock = installApi(); open('/family/incidents/' + id)
    await screen.findByRole('heading', { name: 'Invalid incident link' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rechecks the session before writing and clears the former account content if it changes', async () => {
    let changed = false
    const fetchMock = installApi((url) => changed && url.pathname === '/api/auth/me' ? json({ ...family, id: 9 }) : undefined)
    open(); await screen.findByText(/First viewed/); changed = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByRole('heading', { name: 'Incident access unavailable' })
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/acknowledge'))).toBe(false)
  })

  it('cancels a pending receipt on incident change and ignores its late response', async () => {
    const response = deferred<Response>()
    const fetchMock = installApi((url) => url.pathname.endsWith('/601/view') ? response.promise
      : url.pathname === '/api/family/incidents/602' ? json({ ...detail, id: 602, description: 'New incident', acknowledgement: { ...acknowledged, incidentId: 602 } }) : undefined)
    open(); await screen.findByRole('article')
    await waitFor(() => expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/view'))).toBe(true))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Another incident' }))
    await screen.findByText('New incident')
    const signal = fetchMock.mock.calls.find(([path]) => path.endsWith('/601/view'))![1].signal!
    expect(signal.aborted).toBe(true)
    await act(async () => response.resolve(json(viewed)))
    expect(screen.getByRole('article')).toHaveAccessibleName('Incident #602')
    expect(screen.queryByText(detail.description)).not.toBeInTheDocument()
  })

  it('retries a failed detail load with a fresh family check and no premature viewing write', async () => {
    let fail = true
    const fetchMock = installApi((url) => fail && url.pathname === '/api/family/incidents/601' ? json({}, 503) : undefined)
    open(); await screen.findByRole('heading', { name: 'Unable to load this incident' })
    expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/view'))).toBe(false)
    fail = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText(/First viewed/)
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/family/incidents/601')).toHaveLength(2)
  })

  it('reloads the saved first receipt on refresh without an additional viewing command', async () => {
    const fetchMock = installApi(); open(); await screen.findByText(/First viewed/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }))
    await screen.findByText(/First viewed/)
    expect(fetchMock.mock.calls.filter(([path]) => path === '/api/family/incidents/601')).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/view'))).toHaveLength(1)
  })

  it.each([['MANAGER', 'Incident access unavailable'], ['ROLE_FAMILY', 'Incident #601']])(
    'checks the current %s role before reading care content', async (role, heading) => {
      const fetchMock = installApi((url) => url.pathname === '/api/auth/me' ? json({ ...family, roles: [role] }) : undefined)
      open(); await screen.findByRole('heading', { name: heading })
      if (role === 'MANAGER') expect(fetchMock.mock.calls.some(([path]) => path.includes('/family/incidents/'))).toBe(false)
    })

  it('limits the optional note to the server limit while retaining plain text and whitespace', async () => {
    const fetchMock = installApi(); open(); await screen.findByText(/First viewed/)
    const note = ' '.repeat(2) + 'x'.repeat(254)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox'), note)
    expect(screen.getByRole('textbox')).toHaveValue(note.slice(0,255))
    expect(screen.getByText('255/255 characters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'I am aware' }))
    await screen.findByText('Awareness confirmed')
    expect(JSON.parse(fetchMock.mock.calls.find(([path]) => path.endsWith('/acknowledge'))![1].body as string).responseNote).toBe(note.slice(0,255))
  })

  it('disables confirmation during CSRF setup and cancels the pending write when leaving', async () => {
    const csrf = deferred<Response>()
    let hold = false
    const fetchMock = installApi((url) => hold && url.pathname === '/api/auth/csrf' ? csrf.promise : undefined)
    open(); await screen.findByText(/First viewed/); hold = true
    await userEvent.setup().click(screen.getByRole('button', { name: 'I am aware' }))
    await waitFor(() => expect(fetchMock.mock.calls.filter(([path]) => path === '/api/auth/csrf')).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Confirming…' })).toBeDisabled()
    expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/acknowledge'))).toBe(false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Leave' }))
    await screen.findByRole('heading', { name: 'Landing' })
    await act(async () => csrf.resolve(new Response(null, { status: 204 })))
    expect(fetchMock.mock.calls.some(([path]) => path.endsWith('/acknowledge'))).toBe(false)
  })

  it('does not create duplicate viewing requests under StrictMode', async () => {
    const fetchMock = installApi(); open('/family/incidents/601', true)
    await screen.findByText(/First viewed/)
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/view'))).toHaveLength(1)
  })
})

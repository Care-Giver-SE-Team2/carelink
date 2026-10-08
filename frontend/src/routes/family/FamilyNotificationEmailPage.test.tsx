import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { FamilyNotificationEmailPage } from './notification-email/FamilyNotificationEmailPage'

const empty = { email: null, verifiedAt: null, verificationExpiresAt: null, configured: true }
const pending = { ...empty, email: 'family@example.test', verificationExpiresAt: '2026-10-08T16:15:00+08:00' }
const verified = { ...pending, verifiedAt: '2026-10-08T16:00:00+08:00', verificationExpiresAt: null }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
function setup(override?: (path: string, init: RequestInit) => Response | Promise<Response> | undefined) {
  const fetchMock = vi.fn(async (path: string, init: RequestInit) => {
    const response = override?.(path, init)
    if (response !== undefined) return response
    if (path === '/api/auth/me') return json({ id: 7, username: 'family', roles: ['FAMILY'] })
    if (path === '/api/auth/csrf') { document.cookie = 'XSRF-TOKEN=test-token; path=/'; return new Response(null, { status: 204 }) }
    if (path.endsWith('/verify')) return json(verified)
    if (init.method === 'POST') return json(pending)
    return json(empty)
  })
  vi.stubGlobal('fetch', fetchMock)
  const view = render(<MemoryRouter><FamilyNotificationEmailPage /></MemoryRouter>)
  return { ...view, fetchMock }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/' })
it('requests a code, confirms possession, then removes the contact without changing in-app alerts', async () => {
  const { fetchMock } = setup(); const user = userEvent.setup()
  await screen.findByText('No notification email saved.')
  await user.type(screen.getByLabelText('Email address'), 'family@example.test')
  await user.click(screen.getByRole('button', { name: 'Send verification code' }))
  await screen.findByText('Awaiting verification')
  await user.type(screen.getByLabelText('Verification code'), 'a'.repeat(64))
  await user.click(screen.getByRole('button', { name: 'Verify email' }))
  await screen.findByText('Email verified')
  expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Remove email' }))
  await screen.findByText('No notification email saved.')
  expect(screen.getByText(/In-app urgent alerts remain active/)).toBeInTheDocument()
  const writes = fetchMock.mock.calls.filter(([, init]) => ['POST', 'DELETE'].includes(init.method ?? ''))
  expect(writes.map(([path]) => path)).toEqual(['/api/family/notification-email', '/api/family/notification-email/verify', '/api/family/notification-email'])
  expect(JSON.parse(writes[0][1].body as string)).toEqual({ email: 'family@example.test' })
  expect(new Headers(writes[0][1].headers).get('X-XSRF-TOKEN')).toBe('test-token')
})

it('shows unavailable email sending without allowing a request', async () => {
  const { fetchMock } = setup((path) => path === '/api/family/notification-email' ? json({ ...empty, configured: false }) : undefined)
  await screen.findByText(/Email sending is unavailable/)
  expect(screen.getByRole('button', { name: 'Send verification code' })).toBeDisabled()
  expect(fetchMock.mock.calls.every(([, init]) => init.method !== 'POST')).toBe(true)
})
it('failed confirmation never displays verified or retains the entered code', async () => {
  setup((path, init) => path.endsWith('/verify') ? json({ detail: 'The code expired.' }, 409) : path === '/api/family/notification-email' && !init.method ? json(pending) : undefined)
  const user = userEvent.setup(); await screen.findByText('Awaiting verification')
  await user.type(screen.getByLabelText('Verification code'), 'b'.repeat(64))
  await user.click(screen.getByRole('button', { name: 'Verify email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The code expired.')
  expect(screen.queryByText('Email verified')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Verification code')).toHaveValue('')
})
it('SMTP failure leaves the saved verified address and never claims the new mail was sent', async () => {
  setup((path, init) => path === '/api/family/notification-email' ? init.method === 'POST' ? json({ detail: 'Verification email is unavailable.' }, 503) : json(verified) : undefined)
  const user = userEvent.setup(); await screen.findByText('Email verified')
  await user.clear(screen.getByLabelText('Email address')); await user.type(screen.getByLabelText('Email address'), 'new@example.test')
  await user.click(screen.getByRole('button', { name: 'Send verification code' }))
  await screen.findByText('Verification email is unavailable.')
  expect(screen.getByText('family@example.test')).toBeInTheDocument()
  expect(screen.queryByText(/accepted your verification email/)).not.toBeInTheDocument()
})
it('access denial clears the saved address and entered credentials', async () => {
  setup((path, init) => path.endsWith('/verify') ? json({ detail: 'Access revoked.' }, 403) : path === '/api/family/notification-email' && !init.method ? json(pending) : undefined)
  const user = userEvent.setup(); await screen.findByText('Awaiting verification')
  await user.type(screen.getByLabelText('Verification code'), 'c'.repeat(64))
  await user.click(screen.getByRole('button', { name: 'Verify email' }))
  await screen.findByText('Access revoked.')
  expect(screen.queryByText('family@example.test')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
})
it('an account change cancels the command before touching the new account', async () => {
  let changed = false
  const { fetchMock } = setup((path) => path === '/api/auth/me' && changed ? json({ id: 8, username: 'other', roles: ['FAMILY'] }) : undefined)
  const user = userEvent.setup(); await screen.findByText('No notification email saved.'); changed = true
  await user.type(screen.getByLabelText('Email address'), 'family@example.test')
  await user.click(screen.getByRole('button', { name: 'Send verification code' }))
  await screen.findByText('Your account changed. Reload this page.')
  expect(fetchMock.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false)
  expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
})
it('blocks repeat commands and aborts work when leaving the page', async () => {
  let resolve!: (value: Response) => void
  const delayed = new Promise<Response>((done) => { resolve = done })
  const { fetchMock, unmount } = setup((path, init) => path === '/api/family/notification-email' && init.method === 'POST' ? delayed : undefined)
  const user = userEvent.setup(); await screen.findByText('No notification email saved.')
  await user.type(screen.getByLabelText('Email address'), 'family@example.test')
  await user.dblClick(screen.getByRole('button', { name: 'Send verification code' }))
  await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1))
  const write = fetchMock.mock.calls.find(([, init]) => init.method === 'POST')![1]
  expect(screen.getByLabelText('Email address')).toBeDisabled()
  unmount(); expect(write.signal!.aborted).toBe(true)
  await act(async () => { resolve(json(pending)); await delayed })
  expect(screen.queryByText('Awaiting verification')).not.toBeInTheDocument()
})
it('reloads after a failed initial read without inventing an address', async () => {
  let failing = true
  setup((path) => path === '/api/family/notification-email' && failing ? json({ detail: 'Try again later.' }, 503) : undefined)
  await screen.findByText('Try again later.')
  expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
  failing = false; await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }))
  await screen.findByText('No notification email saved.')
})
it('rejects a non-family session before loading a contact', async () => {
  const { fetchMock } = setup((path) => path === '/api/auth/me' ? json({ id: 3, roles: ['MANAGER'] }) : undefined)
  await screen.findByText('Family access is required.')
  expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/auth/me'])
})

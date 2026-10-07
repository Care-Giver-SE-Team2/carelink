import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

import type { Inbox, NotificationItem } from '../../../features/notifications/types'
import { NotificationBell } from './NotificationBell'
import { NotificationsProvider } from './NotificationsProvider'
import type { NotificationsSource } from './notificationsSource'

/**
 * The bell against a stand-in for the server: the count, the list, what opening a message
 * does in each client, and that nothing happens outside the app's provider.
 *
 * @author Wang Ziyu
 */

const change: NotificationItem = {
  id: 2,
  elderId: 7,
  eventType: 'ROSTER_CHANGE_OFFERED',
  channel: 'IN_APP',
  title: 'Your caregiver is away for the visit on Thu 9 Oct, 10:00',
  body: 'We suggest Tan Mei Ling.',
  resourceType: 'ROSTER_CHANGE',
  resourceId: 40,
  status: 'SENT',
  createdAt: '2026-10-07T09:00:05+08:00',
  sentAt: '2026-10-07T09:00:06+08:00',
  readAt: null,
}

const incident: NotificationItem = {
  id: 1,
  elderId: 7,
  eventType: 'INCIDENT_RAISED',
  channel: 'IN_APP',
  title: 'HIGH: FALL',
  body: null,
  resourceType: 'INCIDENT',
  resourceId: 7,
  status: 'READ',
  createdAt: '2026-10-06T18:30:00+08:00',
  sentAt: '2026-10-06T18:30:01+08:00',
  readAt: '2026-10-06T19:00:00+08:00',
}

function source(items: NotificationItem[], overrides: Partial<NotificationsSource> = {}): NotificationsSource {
  const unread = items.filter((item) => item.status === 'SENT').length
  const inbox: Inbox = { items, page: 0, size: 20, totalElements: items.length }
  return {
    unreadCount: vi.fn().mockResolvedValue(unread),
    inbox: vi.fn().mockResolvedValue(inbox),
    markRead: vi.fn().mockImplementation(async (id: number) => ({ ...items.find((item) => item.id === id)!, status: 'READ' })),
    markAllRead: vi.fn().mockResolvedValue(unread),
    ...overrides,
  }
}

function renderAt(path: string, stub: NotificationsSource | null) {
  const routes = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/family/schedule" element={<NotificationBell />} />
        <Route path="/family/changes" element={<p>Visit changes page</p>} />
      </Routes>
    </MemoryRouter>
  )
  return render(stub ? <NotificationsProvider source={stub}>{routes}</NotificationsProvider> : routes)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('shows nothing and asks nothing outside the app provider', () => {
  renderAt('/family/schedule', null)

  expect(screen.queryByRole('button', { name: /Notifications/ })).not.toBeInTheDocument()
})

it('shows the unread count and opens the list newest first', async () => {
  renderAt('/family/schedule', source([change, incident]))

  const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' })
  await userEvent.click(bell)

  const panel = await screen.findByRole('dialog', { name: 'Notifications' })
  const items = await within(panel).findAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Unread: Your caregiver is away for the visit on Thu 9 Oct, 10:00')
  expect(items[0]).toHaveTextContent('Wed 7 Oct, 09:00')
  expect(items[1]).not.toHaveTextContent('Unread:')
  expect(bell).toHaveAttribute('aria-expanded', 'true')
})

it('opening an unread message marks it read and goes to its screen', async () => {
  const stub = source([change, incident])
  renderAt('/family/schedule', stub)

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
  await userEvent.click(await screen.findByRole('button', { name: /Your caregiver is away/ }))

  expect(stub.markRead).toHaveBeenCalledWith(2)
  expect(await screen.findByText('Visit changes page')).toBeInTheDocument()
})

it('a message with no screen in this client is only marked read', async () => {
  const unreadIncident: NotificationItem = { ...incident, status: 'SENT', readAt: null }
  const stub = source([unreadIncident])
  renderAt('/family/schedule', stub)

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
  await userEvent.click(await screen.findByRole('button', { name: /HIGH: FALL/ }))

  expect(stub.markRead).toHaveBeenCalledWith(1)
  expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
})

it('marks everything read at once', async () => {
  const stub = source([change, { ...incident, id: 3, status: 'SENT', readAt: null }])
  renderAt('/family/schedule', stub)

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
  const panel = await screen.findByRole('dialog', { name: 'Notifications' })
  await within(panel).findAllByRole('listitem')
  await userEvent.click(within(panel).getByRole('button', { name: 'Mark all as read' }))

  expect(stub.markAllRead).toHaveBeenCalled()
  expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
})

it('says when the list could not be loaded, and tries again', async () => {
  const stub = source([change])
  stub.inbox = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ items: [change], page: 0, size: 20, totalElements: 1 })
  renderAt('/family/schedule', stub)

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Your notifications could not be loaded.')
  await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

  expect(await screen.findByRole('button', { name: /Your caregiver is away/ })).toBeInTheDocument()
})

it('an empty inbox says what will appear there, and Escape closes it', async () => {
  renderAt('/family/schedule', source([]))

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
  expect(await screen.findByText(/Nothing yet/)).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('floats in the corner for a client with no shared header', async () => {
  render(
    <NotificationsProvider source={source([])}>
      <MemoryRouter initialEntries={['/family/home']}>
        <NotificationBell floating />
      </MemoryRouter>
    </NotificationsProvider>,
  )

  const bell = await screen.findByRole('button', { name: 'Notifications' })
  expect(bell.parentElement?.className).toMatch(/floating/)
})

it('a click outside closes it', async () => {
  renderAt('/family/schedule', source([change]))

  await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
  await screen.findByRole('dialog', { name: 'Notifications' })
  await userEvent.click(document.body)

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isRead, linkFor, portalOf, when } from '../../../features/notifications/presentation'
import type { NotificationItem } from '../../../features/notifications/types'
import { useNotificationsSource } from './notificationsSource'
import type { NotificationsSource } from './notificationsSource'
import styles from './NotificationBell.module.css'

/** The contract's polling pace while a screen stays open, and the longest it backs off to after failures. */
const POLL_MS = 15_000
const MAX_BACKOFF_MS = 120_000
const PAGE_SIZE = 20

/**
 * The in-app inbox for whoever is signed in, in any client's header: a bell with the unread
 * count, and a list that opens under it. Opening a message marks it read and, where this client
 * has a screen for it, goes there - a family member's roster change to Visit changes, a manager's
 * incident to its exception.
 *
 * `floating` pins it to the top-right corner of the window, for a client with no shared header
 * (the family app, whose pages each draw their own).
 *
 * @author Wang Ziyu
 */
export function NotificationBell({ floating = false }: { floating?: boolean }) {
  const source = useNotificationsSource()
  return source ? <Bell source={source} floating={floating} /> : null
}

function Bell({ source, floating }: { source: NotificationsSource; floating: boolean }) {
  const navigate = useNavigate()
  const portal = portalOf(useLocation().pathname)
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = POLL_MS
    const poll = () => {
      source.unreadCount(controller.signal).then(
        (count) => {
          setUnread(count)
          delay = POLL_MS
        },
        () => {
          delay = Math.min(delay * 2, MAX_BACKOFF_MS)
        },
      ).finally(() => {
        if (!controller.signal.aborted) timer = setTimeout(poll, delay)
      })
    }
    poll()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [source])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const inbox = await source.inbox(0, PAGE_SIZE, signal)
        setItems(inbox.items)
        setFailed(false)
        setUnread(await source.unreadCount(signal))
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFailed(true)
        }
      }
    },
    [source],
  )

  /** The list request in flight, cancelled when the list closes or a newer one starts. */
  const pending = useRef<AbortController | null>(null)

  const fetchList = useCallback(() => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    void load(controller.signal)
  }, [load])

  useEffect(() => () => pending.current?.abort(), [])

  useEffect(() => {
    if (!open) return undefined
    const close = () => {
      pending.current?.abort()
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  function choose(item: NotificationItem) {
    if (!isRead(item)) {
      setItems(
        (current) => current?.map((each) => (each.id === item.id ? { ...each, status: 'READ' as const } : each)) ?? null,
      )
      setUnread((count) => Math.max(0, count - 1))
      source.markRead(item.id).catch(() => undefined)
    }
    const link = linkFor(item, portal)
    if (link) {
      pending.current?.abort()
      setOpen(false)
      navigate(link)
    }
  }

  function toggle() {
    if (open) {
      pending.current?.abort()
      setOpen(false)
      return
    }
    setFailed(false)
    setOpen(true)
    fetchList()
  }

  function retry() {
    setFailed(false)
    fetchList()
  }

  async function readAll() {
    try {
      await source.markAllRead()
      setItems((current) => current?.map((each) => ({ ...each, status: 'READ' as const })) ?? null)
      setUnread(0)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div ref={root} className={floating ? `${styles.root} ${styles.floating}` : styles.root}>
      <button
        type="button"
        className={styles.bell}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={toggle}
      >
        <BellIcon />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Notifications</span>
            <button type="button" className={styles.textButton} disabled={unread === 0} onClick={() => void readAll()}>
              Mark all as read
            </button>
          </div>
          <PanelBody items={items} failed={failed} onRetry={retry} onChoose={choose} />
        </div>
      )}
    </div>
  )
}

function PanelBody({
  items,
  failed,
  onRetry,
  onChoose,
}: {
  items: NotificationItem[] | null
  failed: boolean
  onRetry: () => void
  onChoose: (item: NotificationItem) => void
}) {
  if (failed) {
    return (
      <p className={styles.note} role="alert">
        Your notifications could not be loaded.{' '}
        <button type="button" className={styles.textButton} onClick={onRetry}>
          Try again
        </button>
      </p>
    )
  }
  if (items === null) {
    return <p className={styles.note}>Loading…</p>
  }
  if (items.length === 0) {
    return <p className={styles.note}>Nothing yet. Messages about visits, changes and checks appear here.</p>
  }
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={isRead(item) ? styles.item : `${styles.item} ${styles.unread}`}
            onClick={() => onChoose(item)}
          >
            <span className={styles.itemTitle}>
              {!isRead(item) && <span className={styles.srOnly}>Unread: </span>}
              {item.title}
            </span>
            {item.body && <span className={styles.itemBody}>{item.body}</span>}
            <span className={styles.itemTime}>{when(item.createdAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 20.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

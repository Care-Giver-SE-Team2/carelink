import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../../../features/auth/api'
import { changeNotificationEmail, getNotificationEmail } from '../../../features/notification-email/api'
import type { NotificationEmail } from '../../../features/notification-email/api'
import { ApiError } from '../../../shared/api/client'
import styles from './FamilyNotificationEmail.module.css'

/** Own email setup. Only the saved server result can mark an address as verified.
 * @author Wang Zhili
 */
export function FamilyNotificationEmailPage() {
  const [contact, setContact] = useState<NotificationEmail | null>(null)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const owner = useRef<number | null>(null)
  const active = useRef<AbortController | null>(null)
  const writing = useRef(false)

  function failure(reason: unknown) {
    if (reason instanceof ApiError && [401, 403].includes(reason.status)) {
      setContact(null); setEmail(''); setToken(''); owner.current = null
    }
    setError(reason instanceof Error ? reason.message : 'Unable to update notification email. Please try again.')
  }
  useEffect(() => {
    const controller = new AbortController(); active.current = controller
    async function load() {
      try {
        const user = await getCurrentUser(controller.signal)
        if (!user.roles.includes('FAMILY')) throw new ApiError('Family access is required.', 403)
        const status = await getNotificationEmail(controller.signal)
        if (!controller.signal.aborted) { owner.current = user.id; setContact(status); setEmail(status.email ?? '') }
      } catch (reason) { if (!controller.signal.aborted) failure(reason) }
    }
    void load()
    return () => { controller.abort(); active.current?.abort(); owner.current = null }
  }, [attempt])

  async function change(value?: { email: string } | { token: string }) {
    if (writing.current || !contact) return
    writing.current = true; setBusy(true); setError(''); setNotice('')
    const controller = new AbortController(); active.current = controller
    try {
      // Check the live session again so a tab left open cannot edit a newly signed-in account.
      const user = await getCurrentUser(controller.signal)
      if (user.id !== owner.current || !user.roles.includes('FAMILY')) throw new ApiError('Your account changed. Reload this page.', 403)
      const status = await changeNotificationEmail(value ? 'POST' : 'DELETE', value, controller.signal)
      if (!controller.signal.aborted) {
        setContact(status); setEmail(status.email ?? ''); setToken('')
        setNotice(value && 'email' in value ? 'The mail server accepted your verification email. Check your inbox.' : '')
      }
    } catch (reason) { if (!controller.signal.aborted) { setToken(''); failure(reason) } }
    finally { writing.current = false; if (!controller.signal.aborted) setBusy(false) }
  }

  return <div className={styles.page}>
    <header className={styles.header}><Link to="/family/account">← Account</Link><h1>Notification email</h1>
      <p>Verify an address for email alerts. Urgent email delivery is not enabled yet. In-app urgent alerts remain active.</p></header>
    {error && <p role="alert">{error}</p>}
    {!contact && !error && <p role="status">Loading notification email…</p>}
    {!contact && error && <button onClick={() => { setError(''); setNotice(''); setAttempt((value) => value + 1) }}>Reload</button>}
    {contact && <section className={styles.card} aria-label="Your notification email">
      <h2>{contact.verifiedAt ? 'Email verified' : contact.email ? 'Awaiting verification' : 'No notification email saved.'}</h2>
      {contact.email && <p>{contact.email}</p>}
      {!contact.configured && <p role="status">Email sending is unavailable. Please try again later.</p>}
      {notice && <p role="status">{notice}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void change({ email: email.trim() }) }}>
        <label htmlFor="notification-email">Email address</label>
        <input id="notification-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
        <button type="submit" disabled={busy || !contact.configured}>{busy ? 'Saving…' : 'Send verification code'}</button>
        <p>Codes expire after 15 minutes. Wait one minute between requests. Changing or resending requires verification again.</p>
      </form>
      {contact.email && !contact.verifiedAt && <form onSubmit={(event) => { event.preventDefault(); void change({ token: token.trim() }) }}>
        <label htmlFor="notification-email-code">Verification code</label>
        <input id="notification-email-code" type="text" autoComplete="off" spellCheck={false} required pattern="[a-f0-9]{64}" maxLength={64} value={token} onChange={(event) => setToken(event.target.value)} disabled={busy} />
        <button type="submit" disabled={busy}>Verify email</button>
      </form>}
      {contact.email && <button className={styles.remove} onClick={() => void change()} disabled={busy}>Remove email</button>}
    </section>}
  </div>
}

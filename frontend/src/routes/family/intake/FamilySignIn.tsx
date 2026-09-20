import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { signInWithSession } from '../../../features/auth/api'
import { ApiError } from '../../../shared/api/client'
import { IntakeIcon } from './IntakeLayout'
import styles from './FamilyIntake.module.css'

/**
 * Signs a family member in using the existing session and CSRF endpoints.
 * @param onSignedIn Continues the application flow after successful login
 * @author Wang Zhili
 */
export function FamilySignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    try {
      await signInWithSession({ username: username.trim(), password }, controller.signal)
      if (!controller.signal.aborted) onSignedIn()
    } catch (failure) {
      if (controller.signal.aborted) return
      setError(
        failure instanceof ApiError && failure.status === 401
          ? 'The username or password is incorrect.'
          : failure instanceof ApiError && failure.status === 403
            ? 'Your sign-in request expired. Please try again.'
            : 'Unable to sign in. Check your connection and try again.',
      )
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false)
        setPassword('')
      }
    }
  }

  return (
    <section className={styles.signIn} aria-labelledby="family-sign-in-title">
      <span className={styles.emptyIcon}>
        <IntakeIcon name="heart" />
      </span>
      <h2 id="family-sign-in-title">Sign in to continue</h2>
      <p>Sign in with your family account to continue with your care application.</p>
      <form onSubmit={signIn} aria-busy={busy}>
        <label htmlFor="family-username">Username</label>
        <input
          id="family-username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={busy}
        />
        <label htmlFor="family-password">Password</label>
        <input
          id="family-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  )
}

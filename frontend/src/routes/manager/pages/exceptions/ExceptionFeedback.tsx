import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../../shared/api/client'
import { problemDetail } from '../../../../features/incidents/presentation'
import styles from './Exceptions.module.css'

/**
 * What a failed read looks like on the exception screens.
 *
 * An expired session is sent back to the landing page, the same as RoleShell
 * does for the other three clients. The manager console frames its own shell
 * and has no session guard of its own, so a 401 has to be handled by whichever
 * screen met it — otherwise it reads as "Exceptions is broken".
 *
 * Everything else shows the server's own sentence. `problemDetail` is what
 * digs it out of the RFC 9457 body.
 */
export function ExceptionFeedback({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const navigate = useNavigate()
  const sessionExpired = error instanceof ApiError && error.status === 401

  useEffect(() => {
    if (sessionExpired) navigate('/', { replace: true })
  }, [sessionExpired, navigate])

  if (sessionExpired) {
    return <p className={styles.note}>Your session has ended. Returning to sign in…</p>
  }

  return (
    <section className={styles.feedback} role="alert">
      <p className={styles.feedbackText}>{problemDetail(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../../shared/api/client'
import { problemDetail } from '../../../../features/reports/presentation'
import styles from './Reports.module.css'

/**
 * What a failed read looks like on the report screens.
 *
 * An expired session is sent back to the landing page, as the exception
 * screens and RoleShell do: the manager console frames its own shell and has
 * no session guard, so a 401 has to be handled by whichever screen met it.
 * Everything else shows the server's own sentence.
 */
export function ReportFeedback({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
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

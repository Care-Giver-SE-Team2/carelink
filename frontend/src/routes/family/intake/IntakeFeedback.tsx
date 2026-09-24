import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { FamilySignIn } from '../components/FamilySignIn'
import styles from './FamilyIntake.module.css'

/**
 * Presents authentication, permission and request failures without exposing private data.
 * @author Wang Zhili
 */
export function IntakeFeedback({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const [switchAccount, setSwitchAccount] = useState(false)
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 401 || switchAccount) return <FamilySignIn onSignedIn={onRetry} />
  const title =
    status === 403
      ? 'Access unavailable'
      : status === 404
        ? 'Application not found'
        : status === 400
          ? 'Invalid application request'
          : 'Unable to load applications'
  const message =
    status === 403
      ? 'This account cannot view this application information. Use the correct family account or contact your care team.'
      : status === 404
        ? 'This application could not be found. Return to your applications to choose another.'
        : status === 400
          ? 'Check the application link, or return to your application list.'
          : 'Check your connection and try again. Your application information could not be loaded.'
  return (
    <section className={styles.state} role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {status !== 400 && status !== 404 && <button onClick={onRetry}>Try again</button>}
      {status === 403 && (
        <button className={styles.switchAccount} onClick={() => setSwitchAccount(true)}>
          Sign in with another account
        </button>
      )}
    </section>
  )
}

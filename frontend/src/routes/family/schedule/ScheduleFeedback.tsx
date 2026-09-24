import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { FamilySignIn } from '../components/FamilySignIn'
import styles from './FamilySchedule.module.css'

/**
 * Offers sign-in, access rechecks or retry without retaining protected schedule data.
 * @author Wang Zhili
 */
export function ScheduleFeedback({ error, onRetry, onResetAccess }: {
  error: unknown
  onRetry: () => void
  onResetAccess: () => void
}) {
  const [signIn, setSignIn] = useState(false)
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 401 || signIn) {
    return <FamilySignIn onSignedIn={onResetAccess} description="Sign in with your family account to view your loved one's weekly schedule." />
  }
  const forbidden = status === 403
  return (
    <section className={styles.state} role="alert">
      <h2>{forbidden ? 'Schedule access unavailable' : 'Unable to load this schedule'}</h2>
      <p>{forbidden
        ? 'Your access may have changed. Reload your available elders, or sign in with another family account.'
        : 'The schedule could not be loaded. Check your connection and try again.'}</p>
      {status === 400 && error instanceof ApiError && <p>{error.message}</p>}
      <button onClick={forbidden ? onResetAccess : onRetry}>
        {forbidden ? 'Reload available elders' : 'Try again'}
      </button>
      {forbidden && <button onClick={() => setSignIn(true)}>Sign in with another account</button>}
    </section>
  )
}

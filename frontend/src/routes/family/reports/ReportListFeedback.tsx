import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { FamilySignIn } from '../components/FamilySignIn'
import styles from './FamilyReports.module.css'

/**
 * Restores report access without retaining the previous account's protected content.
 * @author Wang Zhili
 */
export function ReportListFeedback({ error, onRetry, onResetAccess }: {
  error: unknown
  onRetry: () => void
  onResetAccess: () => void
}) {
  const [signIn, setSignIn] = useState(false)
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 401 || signIn) {
    return <FamilySignIn onSignedIn={onResetAccess} description="Sign in with your family account to view your loved one's care reports." />
  }
  const forbidden = status === 403
  return (
    <section className={styles.state} role="alert">
      <h2>{forbidden ? 'Report access unavailable' : 'Unable to load care reports'}</h2>
      <p>{forbidden
        ? 'Your access may have changed. Reload your available elders, or sign in with another family account.'
        : 'Care reports could not be loaded. Check your connection and try again.'}</p>
      <button onClick={forbidden ? onResetAccess : onRetry}>
        {forbidden ? 'Reload available elders' : 'Try again'}
      </button>
      {forbidden && <button onClick={() => setSignIn(true)}>Sign in with another account</button>}
    </section>
  )
}

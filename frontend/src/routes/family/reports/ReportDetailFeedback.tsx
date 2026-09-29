import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { FamilySignIn } from '../components/FamilySignIn'
import styles from './FamilyReports.module.css'

/** Recovers access to the same report; server errors never become report text.
 * @author Wang Zhili
 */
export function ReportDetailFeedback({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const [signIn, setSignIn] = useState(false)
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 401 || signIn) {
    return <FamilySignIn onSignedIn={onRetry} description="Sign in with your family account to continue reading this report." />
  }
  const forbidden = status === 403
  const missing = status === 404
  const invalid = status === 400
  return <section className={styles.state} role="alert">
    <h2>{forbidden ? 'Report access unavailable' : missing ? 'Report not found' : invalid ? 'Invalid report link' : 'Unable to load this report'}</h2>
    <p>{forbidden ? 'This report is not available to your account. Your access may have changed. Try again or sign in with another family account.'
      : missing ? 'This report could not be found. Return to your reports to choose another.'
      : invalid ? 'Check the report link or return to your reports.'
      : 'The report could not be loaded. Check your connection and try again.'}</p>
    {!missing && !invalid && <button onClick={onRetry}>Try again</button>}
    {forbidden && <button onClick={() => setSignIn(true)}>Sign in with another account</button>}
  </section>
}

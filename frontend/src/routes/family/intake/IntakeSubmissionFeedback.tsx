import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../shared/api/client'
import { FamilySignIn } from './FamilySignIn'
import styles from './IntakeForm.module.css'

/**
 * Explains submission failures and offers sign-in or a separate list check.
 * @param failure Failed request and whether the application POST was started
 * @param onSignedIn Clears the error without submitting the application again
 * @author Wang Zhili
 */
export function IntakeSubmissionFeedback({
  failure,
  onSignedIn,
}: {
  failure: { error: unknown; sent: boolean }
  onSignedIn: () => void
}) {
  const [signIn, setSignIn] = useState(false)
  const summary = useRef<HTMLDivElement>(null)
  useEffect(() => {
    summary.current?.focus()
  }, [failure])
  const status = failure.error instanceof ApiError ? failure.error.status : undefined
  const session = status === 401
  const permission = status === 403
  const validation = status === 400
  const uncertain = failure.sent && !session && !permission && !validation
  const title = session
    ? 'Sign in to submit'
    : permission
      ? 'Submission not permitted'
      : uncertain
        ? 'Submission status unknown'
        : validation
          ? 'Check your application'
          : 'Unable to prepare submission'
  const message = session
    ? 'Your session has ended. Sign in, review your entries and submit again. Your entries are still in this form.'
    : permission
      ? 'Your session protection or family permissions may have changed. Sign in again, or contact your care team. Your entries have been kept.'
      : uncertain
        ? 'Your application may have been saved. Check your applications before choosing to submit again. Your entries have been kept.'
        : validation
          ? 'The application was not accepted. Review the fields and try again. Your entries have been kept.'
          : 'We could not prepare your request. Check your connection and try again. Your application has not been sent.'

  return (
    <div className={styles.feedback}>
      <div className={styles.errorSummary} role="alert" tabIndex={-1} ref={summary}>
        <h2>{title}</h2>
        <p>{message}</p>
        {uncertain && (
          <Link to="/family/intake" target="_blank" rel="noopener noreferrer">
            Check my applications (new tab)
          </Link>
        )}
        {permission && !signIn && <button onClick={() => setSignIn(true)}>Sign in again</button>}
      </div>
      {(session || signIn) && <FamilySignIn onSignedIn={onSignedIn} />}
    </div>
  )
}

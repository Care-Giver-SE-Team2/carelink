import type { IntakeCheck, IntakeReview } from '../../../shared/api/profile'
import { checkDetail, checkLabel } from '../lib/applications'
import styles from './ChecksList.module.css'

/**
 * What the server checked about an application, one row each: a pass in green with a tick, a
 * fail in red without one. Failing checks inform the decision rather than block it.
 */
export function ChecksList({ application }: { application: IntakeReview }) {
  return (
    <ul className={styles.list} aria-label="Checks">
      {application.checks.map((check) => (
        <li key={check.key} className={styles.row}>
          <span>{checkLabel(check, application)}</span>
          <CheckResult check={check} detail={checkDetail(check, application)} />
        </li>
      ))}
    </ul>
  )
}

function CheckResult({ check, detail }: { check: IntakeCheck; detail: string }) {
  return <span className={check.pass ? styles.pass : styles.fail}>{check.pass ? `✓ ${detail}` : detail}</span>
}

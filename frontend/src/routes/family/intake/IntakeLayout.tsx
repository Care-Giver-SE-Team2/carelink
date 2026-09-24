import type { IntakeStatus } from '../../../features/intake/types'
import { statusLabels } from '../../../features/intake/presentation'
import { FamilyLayout } from '../components/FamilyLayout'
import styles from './FamilyIntake.module.css'

export { FamilyIcon as IntakeIcon } from '../components/FamilyIcon'

export function StatusBadge({ status }: { status: IntakeStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      <span aria-hidden="true" />
      {statusLabels[status]}
    </span>
  )
}

export function IntakeLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" /> Loading your application information…
    </div>
  )
}

/**
 * Displays the family workspace for intake applications.
 * @author Wang Zhili
 */
export function IntakeLayout() {
  return <FamilyLayout />
}

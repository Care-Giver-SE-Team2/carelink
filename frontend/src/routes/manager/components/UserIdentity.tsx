import { useCurrentUser } from '../lib/useCurrentUser'
import styles from './Header.module.css'

/** Manager-console-specific abbreviations for the role badge; falls back to the raw role name. */
const ROLE_BADGE_LABELS: Record<string, string> = {
  MANAGER: 'CARE MGR',
}

/** The signed-in manager's name and role badge, shown in the console header. */
export function UserIdentity() {
  const { data: currentUser } = useCurrentUser()
  if (!currentUser) return null

  const role = currentUser.roles[0]
  return (
    <div className={styles.identityGroup}>
      <span className={styles.userName}>{currentUser.displayName}</span>
      <span className={styles.roleBadge}>{role ? (ROLE_BADGE_LABELS[role] ?? role) : ''}</span>
    </div>
  )
}

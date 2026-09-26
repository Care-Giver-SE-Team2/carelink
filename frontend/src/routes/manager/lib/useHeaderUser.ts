import type { AppHeaderUserInfo } from '../../../shared/components/ui'
import { useCurrentUser } from './useCurrentUser'

/** Manager-console-specific abbreviations for the role badge; falls back to the raw role name. */
const ROLE_BADGE_LABELS: Record<string, string> = {
  MANAGER: 'CARE MGR',
}

/** The signed-in manager as the header shows them; undefined until the session has loaded. */
export function useHeaderUser(): AppHeaderUserInfo | undefined {
  const { data: currentUser } = useCurrentUser()
  if (!currentUser) return undefined
  const role = currentUser.roles[0]
  return { name: currentUser.displayName, roleLabel: role ? (ROLE_BADGE_LABELS[role] ?? role) : '' }
}

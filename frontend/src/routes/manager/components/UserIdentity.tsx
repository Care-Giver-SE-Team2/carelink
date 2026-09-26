import { AppHeaderUser } from '../../../shared/components/ui'
import { useHeaderUser } from '../lib/useHeaderUser'

/** The signed-in manager's name and role badge, for pages that pass their own header `trailing`. */
export function UserIdentity() {
  const user = useHeaderUser()
  return user ? <AppHeaderUser {...user} /> : null
}

import { Link } from 'react-router-dom'

import { RoleShell } from '../../shared/components/RoleShell'

export default function NotFound() {
  return (
    <RoleShell title="Page not found">
      <p>We couldn't find the page you were looking for.</p>
      <p>
        <Link to="/" style={{ color: 'var(--accent)' }}>
          Back to CareLink
        </Link>
      </p>
    </RoleShell>
  )
}

import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader, Eyebrow, MetaText, NavSidebar } from '../../../shared/components/ui'
import type { NavItem } from '../../../shared/components/ui'
import { useHeaderUser } from '../lib/useHeaderUser'
import { useOpenExceptionCount } from '../lib/useOpenExceptionCount'
import styles from './ManagerShell.module.css'

const POLICY_LINES = ['no-entry wait 10m', 'family window 2h', 'cert warning 30d']

function navItems(openExceptions: number | undefined): NavItem[] {
  return [
    { label: 'Today', href: '/manager', end: true },
    { label: 'Roster', href: '/manager/roster' },
    { label: 'Exceptions', href: '/manager/exceptions', count: openExceptions, countTone: 'danger' },
    { label: 'Elders', href: '/manager/elders' },
    { label: 'Caregivers', href: '/manager/caregivers' },
    // Placeholder until the profile module has a manager credentials endpoint. The count
    // should be credentials needing manager action: SUBMITTED awaiting review, plus approved
    // ones expired or within the 30-day warning threshold.
    { label: 'Certifications', href: '/manager/certifications', count: 3, countTone: 'neutral' },
    { label: 'Reports', href: '/manager/reports' },
    { label: 'Quality', href: '/manager/quality' },
  ]
}

/**
 * Frame for the manager console screens: the shared app header and left nav around the
 * content area. Bypasses the shared RoleShell — the manager console is a dense desktop app,
 * not the simple mobile-first bar the other three clients use.
 *
 * `headerContext` replaces the header's live clock (e.g. a breadcrumb); `headerRight`
 * replaces its user block with page-specific status (e.g. the Care plan screen's publish
 * state). The Exceptions count is the number of incidents that still need attention.
 */
export function ManagerShell({
  headerContext,
  headerRight,
  children,
}: {
  headerContext?: ReactNode
  headerRight?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const user = useHeaderUser()
  const { data: openExceptions } = useOpenExceptionCount()

  return (
    <div className={styles.shell}>
      <AppHeader contextLine={headerContext} user={user} trailing={headerRight} onLogout={() => navigate('/')} />
      <div className={styles.body}>
        <NavSidebar
          label="Manager console"
          items={navItems(openExceptions)}
          footer={
            <>
              <Eyebrow wide>Policy</Eyebrow>
              <div className={styles.policyLines}>
                {POLICY_LINES.map((line) => (
                  <MetaText key={line}>{line}</MetaText>
                ))}
              </div>
            </>
          }
        />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader, Eyebrow, MetaText, NavSidebar } from '../../../shared/components/ui'
import type { NavItem } from '../../../shared/components/ui'
import { useHeaderUser } from '../lib/useHeaderUser'
import { useCertificationReviewCount } from '../lib/useCertifications'
import { useOpenExceptionCount } from '../lib/useOpenExceptionCount'
import { usePendingApplicationCount } from '../lib/useApplications'
import styles from './ManagerShell.module.css'

const POLICY_LINES = ['no-entry wait 10m', 'family window 2h', 'cert warning 30d']

function navItems(
  openExceptions: number | undefined,
  pendingApplications: number | undefined,
  certificationsToReview: number | undefined,
): NavItem[] {
  return [
    { label: 'Today', href: '/manager', end: true },
    { label: 'Roster', href: '/manager/roster' },
    { label: 'Exceptions', href: '/manager/exceptions', count: openExceptions, countTone: 'danger' },
    { label: 'Elders', href: '/manager/elders' },
    { label: 'Applications', href: '/manager/applications', count: pendingApplications, countTone: 'accent' },
    { label: 'Caregivers', href: '/manager/caregivers' },
    { label: 'Certifications', href: '/manager/certifications', count: certificationsToReview, countTone: 'neutral' },
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
 * state). The Exceptions count is the number of incidents that still need attention; the
 * Applications count is the family applications waiting for an answer; the Certifications count
 * is the submitted certificates waiting for the manager's review.
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
  const { data: pendingApplications } = usePendingApplicationCount()
  const { data: certificationsToReview } = useCertificationReviewCount()

  return (
    <div className={styles.shell}>
      <AppHeader contextLine={headerContext} user={user} trailing={headerRight} onLogout={() => navigate('/')} />
      <div className={styles.body}>
        <NavSidebar
          label="Manager console"
          items={navItems(openExceptions, pendingApplications, certificationsToReview)}
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

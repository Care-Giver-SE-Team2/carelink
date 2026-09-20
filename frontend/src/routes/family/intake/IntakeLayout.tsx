import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import type { IntakeStatus } from '../../../features/intake/types'
import { statusLabels } from '../../../features/intake/presentation'
import styles from './FamilyIntake.module.css'

const icons = {
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M5 16a8 8 0 0 0 13 2',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5',
}

export function IntakeIcon({ name }: { name: keyof typeof icons }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  )
}

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
 * Mobile family intake workspace.
 * @author Wang Zhili
 */
export function IntakeLayout() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search])
  useEffect(() => {
    const previous = document.title
    document.title = 'My applications · CareLink'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <div className={styles.portal}>
      <a className={styles.skip} href="#family-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            className={styles.brand}
            to="/family/intake"
            aria-label="CareLink family applications"
          >
            <span className={styles.brandMark}>
              <IntakeIcon name="heart" />
            </span>
            CareLink
          </Link>
          <span className={styles.familyTag}>FAMILY PORTAL</span>
        </div>
      </header>
      <main id="family-content" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <IntakeIcon name="heart" /> Care, with you every step.
      </footer>
    </div>
  )
}

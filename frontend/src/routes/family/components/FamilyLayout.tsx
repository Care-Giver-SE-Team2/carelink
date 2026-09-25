import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FamilyIcon } from './FamilyIcon'
import styles from '../intake/FamilyIntake.module.css'
import layout from './FamilyLayout.module.css'

/**
 * Displays family navigation and the current page in a mobile workspace.
 * @param title Sets the browser page title
 * @author Wang Zhili
 */
export function FamilyLayout({ title = 'My applications' }: { title?: string }) {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, search])
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · CareLink`
    return () => {
      document.title = previous
    }
  }, [title])

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
              <FamilyIcon name="heart" />
            </span>
            CareLink
          </Link>
          <span className={styles.familyTag}>FAMILY PORTAL</span>
        </div>
        <nav className={layout.navigation} aria-label="Family pages">
          <NavLink to="/family/intake">My applications</NavLink>
          <NavLink to="/family/schedule">Weekly schedule</NavLink>
        </nav>
      </header>
      <main id="family-content" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <FamilyIcon name="heart" /> Care, with you every step.
      </footer>
    </div>
  )
}

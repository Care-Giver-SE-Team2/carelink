import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

type NavItem = {
  label: string
  path: string
  end?: boolean
  count?: number
  countTone?: 'danger' | 'muted'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', path: '/manager', end: true },
  { label: 'Roster', path: '/manager/roster' },
  { label: 'Exceptions', path: '/manager/exceptions', count: 4, countTone: 'danger' },
  { label: 'Elders', path: '/manager/elders' },
  { label: 'Caregivers', path: '/manager/caregivers' },
  {
    label: 'Certifications',
    path: '/manager/certifications',
    count: 3,
    countTone: 'muted',
  },
  { label: 'Reports', path: '/manager/reports' },
]

const POLICY_LINES = ['no-entry wait 10m', 'family window 2h', 'cert warning 30d']

const COUNT_TONE_VAR: Record<NonNullable<NavItem['countTone']>, string> = {
  danger: 'var(--danger)',
  muted: 'var(--text-muted)',
}

/**
 * Left nav for the manager console — 200px column, sized up from the design
 * handoff's 168px/12px spec for legibility at normal viewing distance.
 * Active state comes from the current route.
 */
export function Sidebar() {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          end={item.end}
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
        >
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span className={styles.count} style={{ color: COUNT_TONE_VAR[item.countTone!] }}>
              {item.count}
            </span>
          )}
        </NavLink>
      ))}

      <div className={styles.policyHeading}>Policy</div>
      <div className={styles.policyLines}>
        {POLICY_LINES.map((line) => (
          <div key={line} className={styles.policyLine}>
            {line}
          </div>
        ))}
      </div>
    </nav>
  )
}

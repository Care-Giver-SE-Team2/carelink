import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cx } from './cx'
import styles from './NavSidebar.module.css'

export type NavItem = {
  label: string
  href: string
  /** Match `href` exactly rather than as a prefix — for an index route like "/manager". */
  end?: boolean
  /** Shown beside the label; hidden when 0, so the nav only draws the eye to real work. */
  count?: number
  countTone?: 'danger' | 'neutral'
}

/**
 * Left nav for a desktop client. Each role passes its own items. The active item follows
 * the current route unless `activeHref` pins it. `footer` sits under the items (e.g. policy
 * small print). Below 1200px it collapses to a rail of initials.
 */
export function NavSidebar({
  items,
  activeHref,
  footer,
  label = 'Main',
}: {
  items: NavItem[]
  activeHref?: string
  footer?: ReactNode
  label?: string
}) {
  return (
    <nav className={styles.nav} aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          title={item.label}
          className={({ isActive }) =>
            cx(styles.item, (activeHref === undefined ? isActive : activeHref === item.href) && styles.active)
          }
        >
          <span className={styles.initial} aria-hidden="true">
            {item.label[0]}
          </span>
          <span className={styles.label}>{item.label}</span>
          {item.count !== undefined && item.count > 0 && (
            <span className={cx(styles.count, styles[item.countTone ?? 'neutral'])}>{item.count}</span>
          )}
        </NavLink>
      ))}
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  )
}

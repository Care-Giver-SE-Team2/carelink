import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from './Typography'
import { MetaText } from './Typography'
import { ChevronLeftIcon } from './icons'
import styles from './Layout.module.css'

/** "‹ Back to Elders" above a page title. */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className={styles.backLink} title={children}>
      <ChevronLeftIcon />
      {children}
    </Link>
  )
}

/**
 * Title block at the top of a main column. `children` sits under the meta line (e.g. the
 * plan's "Starts" date); `toolbar` spans the full width below (e.g. search and filters).
 */
export function PageHeader({
  title,
  meta,
  actions,
  back,
  toolbar,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  back?: ReactNode
  toolbar?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <div>
          {back && <div className={styles.back}>{back}</div>}
          <PageTitle>{title}</PageTitle>
          {meta && <MetaText className={styles.headerMeta}>{meta}</MetaText>}
          {children && <div className={styles.headerExtras}>{children}</div>}
        </div>
        {actions && <div className={styles.headerActions}>{actions}</div>}
      </div>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
    </header>
  )
}

/** Main column plus a 340px detail rail; the rail stacks below the main column under 1000px. */
export function SplitLayout({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className={styles.split}>
      <div className={styles.splitMain}>{main}</div>
      {rail}
    </div>
  )
}

/**
 * The rail's content: evenly spaced sections, and a footer pinned to the bottom for the
 * destructive action and small print. Falsy sections are skipped, so they can be conditional.
 */
export function SidePanel({
  sections,
  footer,
  label,
}: {
  sections: ReactNode[]
  footer?: ReactNode
  label?: string
}) {
  return (
    <aside className={styles.panel} aria-label={label}>
      <div className={styles.panelSections}>
        {sections.filter(Boolean).map((section, i) => (
          <div key={i}>{section}</div>
        ))}
      </div>
      {footer && <div className={styles.panelFooter}>{footer}</div>}
    </aside>
  )
}

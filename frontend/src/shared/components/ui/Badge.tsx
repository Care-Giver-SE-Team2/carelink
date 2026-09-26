import type { ReactNode } from 'react'
import { cx } from './cx'
import styles from './Badge.module.css'

/** `scheduled` = published with a start date still in the future; `none` = the elder has no plan yet. */
export type BadgeStatus = 'published' | 'draft' | 'scheduled' | 'archived' | 'stopped' | 'none'

const LABELS: Record<BadgeStatus, string> = {
  published: 'PUBLISHED',
  draft: 'DRAFT',
  scheduled: 'SCHEDULED',
  archived: 'ARCHIVED',
  stopped: 'STOPPED',
  none: 'NO PLAN YET',
}

/** Plan status, optionally with its version ("PUBLISHED v4"). */
export function Badge({
  status,
  version,
  compact = false,
  className,
}: {
  status: BadgeStatus
  version?: number | null
  /** Tighter padding for badges inside a list row. */
  compact?: boolean
  className?: string
}) {
  const suffix = status !== 'none' && version != null ? ` v${version}` : ''
  return (
    <span className={cx(styles.badge, styles[status], compact && styles.compact, className)}>
      {LABELS[status]}
      {suffix}
    </span>
  )
}

/** Neutral outlined label, e.g. a required certification ("FIRST AID"). */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}

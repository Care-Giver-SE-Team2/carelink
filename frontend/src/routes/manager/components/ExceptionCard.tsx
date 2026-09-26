import type { ReactNode } from 'react'
import { Tag } from '../../../shared/components/ui'
import type { Severity } from '../data/today'
import { cx } from '../../../shared/components/ui/cx'
import styles from './ExceptionCard.module.css'

const SEVERITY_TAG = {
  1: { tone: 'danger', solid: true },
  2: { tone: 'danger', solid: false },
  3: { tone: 'muted', solid: false },
} as const

/** One open exception: severity, what happened, who holds it, and time left to respond. */
export function ExceptionCard({
  id,
  severity,
  title,
  description,
  meta,
  countdown,
  actions,
}: {
  id: string
  severity: Severity
  title: string
  description?: string
  meta: string[]
  /** "HH:MM:SS" to the response deadline. */
  countdown: string
  actions?: ReactNode
}) {
  return (
    <article className={cx(styles.card, severity === 1 && styles.sev1)} aria-label={`${id} ${title}`}>
      <div className={styles.top}>
        <div className={styles.idGroup}>
          <Tag {...SEVERITY_TAG[severity]} compact>
            SEV {severity}
          </Tag>
          <span className={styles.id}>{id}</span>
        </div>
        <span role="timer" aria-label="Time left to respond" className={styles.countdown}>
          {countdown}
        </span>
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      <p className={styles.meta}>{meta.join(' · ')}</p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  )
}

import type { ReactNode } from 'react'
import { cx } from './cx'
import styles from './Timeline.module.css'

export type TimelineStep = {
  label: ReactNode
  sub?: ReactNode
  /** done = already happened; active = waiting on this step now; pending = not reached. */
  state: 'done' | 'active' | 'pending'
}

/**
 * Vertical list of steps joined by a rail — an escalation chain, a visit's history, an
 * audit trail. `footnote` explains where the steps came from.
 */
export function Timeline({ steps, footnote }: { steps: TimelineStep[]; footnote?: ReactNode }) {
  return (
    <div>
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={i} className={cx(styles.step, styles[step.state])}>
            <span className={styles.marker} aria-hidden="true">
              <span className={styles.node} />
              {i < steps.length - 1 && <span className={styles.rail} />}
            </span>
            <div className={styles.body}>
              <div className={styles.label}>{step.label}</div>
              {step.sub && <div className={styles.sub}>{step.sub}</div>}
            </div>
          </li>
        ))}
      </ol>
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </div>
  )
}

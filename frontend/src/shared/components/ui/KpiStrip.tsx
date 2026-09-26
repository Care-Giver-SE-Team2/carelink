import type { ReactNode } from 'react'
import { cx } from './cx'
import { Eyebrow } from './Typography'
import styles from './KpiStrip.module.css'

export type KpiItem = {
  label: string
  value: ReactNode
  /** Colours the value: `info` for work the model can help with, `danger` for what needs a person now. */
  tone?: 'default' | 'info' | 'danger'
}

/** A row of equal-width headline numbers across the top of a board. */
export function KpiStrip({ items, label = 'Key figures' }: { items: KpiItem[]; label?: string }) {
  return (
    <dl className={styles.strip} aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className={styles.cell}>
          <dt>
            <Eyebrow wide>{item.label}</Eyebrow>
          </dt>
          <dd className={cx(styles.value, item.tone && item.tone !== 'default' && styles[item.tone])}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

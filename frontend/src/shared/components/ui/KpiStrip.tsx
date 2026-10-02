import { useId } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from './cx'
import { Eyebrow } from './Typography'
import styles from './KpiStrip.module.css'

export type KpiItem = {
  label: string
  value: ReactNode
  /** Colours the value: `info` for work the model can help with, `danger` for what needs a person now. */
  tone?: 'default' | 'info' | 'danger'
  /** Makes the whole cell a link to the screen where that figure is worked through. */
  href?: string
}

function KpiCell({ item }: { item: KpiItem }) {
  const labelId = useId()
  const valueId = useId()
  const valueClass = cx(styles.value, item.tone && item.tone !== 'default' && styles[item.tone])
  return (
    <div className={cx(styles.cell, item.href && styles.linked)}>
      <dt id={labelId}>
        <Eyebrow wide>{item.label}</Eyebrow>
      </dt>
      <dd className={valueClass}>
        {item.href ? (
          // Stretched over the whole cell; named "label value" rather than just the number.
          <Link id={valueId} to={item.href} className={styles.link} aria-labelledby={`${labelId} ${valueId}`}>
            {item.value}
          </Link>
        ) : (
          item.value
        )}
      </dd>
    </div>
  )
}

/** A row of equal-width headline numbers across the top of a board. */
export function KpiStrip({ items, label = 'Key figures' }: { items: KpiItem[]; label?: string }) {
  return (
    <dl className={styles.strip} aria-label={label}>
      {items.map((item) => (
        <KpiCell key={item.label} item={item} />
      ))}
    </dl>
  )
}

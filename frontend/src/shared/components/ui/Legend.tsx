import { cx } from './cx'
import type { VisitBlockState } from './VisitBlock'
import styles from './Legend.module.css'

export type LegendItem = { label: string; swatch: VisitBlockState }

/** A key to the VisitBlock colours on the timeline beside it. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className={styles.item}>
          <span className={cx(styles.swatch, styles[item.swatch])} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

import type { ReactNode } from 'react'
import { RowTitle } from './Typography'
import { cx } from './cx'
import styles from './ListRow.module.css'

/**
 * One selectable entry in a list — an elder in the index, a caregiver in the picker.
 *
 * With `cells`, the row lays out as a grid using the `--list-row-columns` custom property
 * from its list container: the title block first, then each cell, then `trailing`.
 * Rows carry role="option"; wrap them in a role="listbox" container that owns keyboard
 * navigation.
 */
export function ListRow({
  id,
  title,
  meta,
  leading,
  cells,
  trailing,
  selected = false,
  dimmed = false,
  onClick,
}: {
  id?: string
  title: ReactNode
  meta?: ReactNode
  leading?: ReactNode
  cells?: ReactNode[]
  trailing?: ReactNode
  selected?: boolean
  /** Reads as unavailable (e.g. an ineligible caregiver) while staying visible. */
  dimmed?: boolean
  onClick?: () => void
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      className={cx(
        styles.row,
        cells && styles.columns,
        onClick && styles.clickable,
        selected && styles.selected,
        dimmed && styles.dimmed,
      )}
      onClick={onClick}
    >
      <div className={styles.identity}>
        {leading}
        <div className={styles.text}>
          <RowTitle className={styles.title}>{title}</RowTitle>
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
      </div>
      {cells}
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  )
}

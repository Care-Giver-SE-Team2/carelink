import type { ReactNode } from 'react'
import { cx } from './cx'
import { Eyebrow } from './Typography'
import styles from './DataTable.module.css'

export type DataTableColumn<T> = {
  key: string
  label: ReactNode
  /** A CSS grid track: "74px", "1.3fr". */
  width: string
  /** Defaults to the row's value at `key`. */
  render?: (row: T) => ReactNode
}

export type RowTone = 'danger' | 'info' | null

/**
 * Dense grid table: tracked uppercase headers over an ink rule, hairline row separators.
 * `rowTone` tints a row that needs attention (danger) or that the model can help with
 * (info). `footer` is a mono note under the last row ("79 further visits today").
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowTone,
  footer,
  empty,
  label,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  rowTone?: (row: T) => RowTone
  footer?: ReactNode
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode
  label: string
}) {
  const gridTemplateColumns = columns.map((column) => column.width).join(' ')

  return (
    <div>
      <div role="table" aria-label={label}>
        <div role="row" className={cx(styles.row, styles.headerRow)} style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div key={column.key} role="columnheader" className={styles.headerCell}>
              <Eyebrow wide>{column.label}</Eyebrow>
            </div>
          ))}
        </div>
        {rows.map((row) => {
          const tone = rowTone?.(row)
          return (
            <div
              key={rowKey(row)}
              role="row"
              className={cx(styles.row, styles.bodyRow, tone && styles[tone])}
              style={{ gridTemplateColumns }}
            >
              {columns.map((column) => (
                <div key={column.key} role="cell" className={styles.cell}>
                  {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {rows.length === 0 && empty && <div className={styles.note}>{empty}</div>}
      {footer && <div className={styles.note}>{footer}</div>}
    </div>
  )
}

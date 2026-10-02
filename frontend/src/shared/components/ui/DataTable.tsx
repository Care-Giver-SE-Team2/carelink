import type { KeyboardEvent, ReactNode } from 'react'
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
  /** Right-align the header and cells — numbers, dates, state tags. */
  align?: 'right'
}

export type RowTone = 'danger' | 'info' | null

/**
 * Dense grid table: tracked uppercase headers over an ink rule, hairline row separators.
 * `rowTone` tints a row that needs attention (danger) or that the model can help with
 * (info). `footer` is a mono note under the last row ("79 further visits today").
 *
 * With `onRowClick` each row is a control — clicked, or Enter/Space when focused — that
 * opens the row elsewhere (e.g. a detail rail); `selectedKey` marks the open one with the
 * info tint.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowTone,
  footer,
  empty,
  label,
  onRowClick,
  selectedKey,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  rowTone?: (row: T) => RowTone
  footer?: ReactNode
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode
  label: string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
}) {
  const gridTemplateColumns = columns.map((column) => column.width).join(' ')

  return (
    <div>
      <div role="table" aria-label={label}>
        <div role="row" className={cx(styles.row, styles.headerRow)} style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div key={column.key} role="columnheader" className={cx(styles.headerCell, column.align && styles.right)}>
              <Eyebrow wide>{column.label}</Eyebrow>
            </div>
          ))}
        </div>
        {rows.map((row) => {
          const key = rowKey(row)
          const selected = onRowClick !== undefined && selectedKey === key
          const tone = selected ? 'info' : rowTone?.(row)
          return (
            <div
              key={key}
              role="row"
              className={cx(styles.row, styles.bodyRow, tone && styles[tone], onRowClick && styles.clickable)}
              style={{ gridTemplateColumns }}
              {...(onRowClick && {
                tabIndex: 0,
                'aria-selected': selected,
                onClick: () => onRowClick(row),
                onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(row)
                  }
                },
              })}
            >
              {columns.map((column) => (
                <div key={column.key} role="cell" className={cx(styles.cell, column.align && styles.right)}>
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

import { cx } from './cx'
import styles from './VisitBlock.module.css'

/**
 * How a visit reads on a timeline. `needs_cover` is a visit nobody is assigned to;
 * `suggested` is one the model or rule engine proposes to move; `vacated` is one an absence
 * has emptied.
 */
export type VisitBlockState = 'assigned' | 'closed' | 'exception' | 'suggested' | 'needs_cover' | 'vacated'

/**
 * One visit placed on an hour grid: `grid-column: startCol / span span` of the parent grid.
 * Reads as the elder's short name and the service, on two lines, or on one when it spans
 * two hours or more.
 */
export function VisitBlock({
  elderShort,
  label,
  state,
  startCol,
  span,
  title,
}: {
  elderShort: string
  label: string
  state: VisitBlockState
  startCol: number
  span: number
  /** Full detail on hover: time, elder's full name, service. */
  title?: string
}) {
  return (
    <div className={styles.cell} style={{ gridColumn: `${startCol} / span ${span}` }}>
      <div className={cx(styles.block, styles[state])} title={title}>
        {span >= 2 ? (
          `${elderShort} · ${label}`
        ) : (
          <>
            {elderShort}
            <br />
            {label}
          </>
        )}
      </div>
    </div>
  )
}

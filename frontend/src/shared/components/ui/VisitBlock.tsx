import { cx } from './cx'
import styles from './VisitBlock.module.css'

/**
 * How a visit reads on a timeline. `needs_cover` is a visit nobody is assigned to;
 * `suggested` is one the model or rule engine proposes to move; `vacated` is one an absence
 * has emptied.
 */
export type VisitBlockState = 'assigned' | 'closed' | 'exception' | 'suggested' | 'needs_cover' | 'vacated'

/**
 * One visit placed on a time grid: `grid-column: startCol / span span` of the parent grid,
 * whose columns are hours unless `slotsPerHour` says they are finer (4 for quarter hours).
 * Reads as the elder's short name and the service, on two lines, or on one when it spans
 * two hours or more. Shorter than an hour, each line is cut off with an ellipsis rather
 * than wrapped, so a narrow block keeps the row's height; `title` has the full detail.
 * With `onClick` the block is a button, named by `actionLabel` for screen readers.
 */
export function VisitBlock({
  elderShort,
  label,
  state,
  startCol,
  span,
  title,
  slotsPerHour = 1,
  onClick,
  actionLabel,
}: {
  elderShort: string
  label: string
  state: VisitBlockState
  startCol: number
  span: number
  /** Full detail on hover: time, elder's full name, service. */
  title?: string
  /** Grid columns per hour; `startCol` and `span` count these. */
  slotsPerHour?: number
  /** Makes the block a button, e.g. to open the visit. */
  onClick?: () => void
  /** Accessible name when the block is a button, e.g. "Reassign 09:00 Tan H.S.". */
  actionLabel?: string
}) {
  const narrow = span < slotsPerHour
  const className = cx(styles.block, styles[state], narrow && styles.narrow, onClick && styles.action)
  const content = narrow ? (
    <>
      <span className={styles.line}>{elderShort}</span>
      <span className={styles.line}>{label}</span>
    </>
  ) : span >= 2 * slotsPerHour ? (
    `${elderShort} · ${label}`
  ) : (
    <>
      {elderShort}
      <br />
      {label}
    </>
  )
  return (
    <div className={styles.cell} style={{ gridColumn: `${startCol} / span ${span}` }}>
      {onClick ? (
        <button type="button" className={className} title={title} aria-label={actionLabel} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className={className} title={title}>
          {content}
        </div>
      )}
    </div>
  )
}

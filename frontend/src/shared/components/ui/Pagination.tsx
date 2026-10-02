import { cx } from './cx'
import { pageSlots } from './pageSlots'
import styles from './Pagination.module.css'

/** "1–6 of 102 caregivers" and Prev / page numbers / Next, for a list shown a page at a time. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = 'items',
}: {
  /** 1-based. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** What is being counted, plural: "caregivers". */
  noun?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span className={styles.range}>
        {total === 0 ? `0 ${noun}` : `${from}–${to} of ${total} ${noun}`}
      </span>
      <div className={styles.pages}>
        <button type="button" className={styles.page} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Prev
        </button>
        {pageSlots(page, pageCount).map((slot, i) =>
          slot === 'gap' ? (
            <span key={`gap-${i}`} className={cx(styles.page, styles.gap)} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              className={cx(styles.page, slot === page && styles.current)}
              aria-current={slot === page ? 'page' : undefined}
              aria-label={`Page ${slot}`}
              onClick={() => onPageChange(slot)}
            >
              {slot}
            </button>
          ),
        )}
        <button type="button" className={styles.page} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next ›
        </button>
      </div>
    </nav>
  )
}

import type { ReactNode } from 'react'
import { CAP_HOURS_PER_DAY, CAP_HOURS_PER_WEEK } from '../data/roster'
import type { DayLoad, WeekDay, WeekRow } from '../data/roster'
import styles from './WeekGrid.module.css'

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

function hours(value: number): string {
  return `${value.toFixed(1)} h`
}

function DayCell({
  load,
  day,
  cover,
  onOpen,
}: {
  load: DayLoad
  day: WeekDay
  cover: boolean
  onOpen: () => void
}) {
  if (load.visits === 0) {
    return <div className={cx(styles.cell, styles.empty, day.isToday && styles.today)}>—</div>
  }
  const overCap = !cover && load.hours > CAP_HOURS_PER_DAY
  const fill = overCap ? styles.overCap : day.isPast ? styles.past : styles.scheduled
  const flags: ReactNode[] = []
  if (load.exceptions > 0) flags.push(<span key="exceptions" className={styles.danger}>{load.exceptions} exception</span>)
  if (overCap) flags.push(<span key="cap" className={styles.danger}>over cap</span>)

  return (
    <button
      type="button"
      className={cx(styles.cell, styles.load, day.isToday && styles.today)}
      onClick={onOpen}
      aria-label={`${day.label}: ${load.visits} visits, ${hours(load.hours)}${cover ? ' to cover' : ''}. Open in Day view`}
    >
      <span className={cx(styles.figures, cover && styles.coverText)}>
        <span>{cover ? `${load.visits} to cover` : `${load.visits} visits`}</span>
        <span className={overCap ? styles.danger : styles.muted}>{hours(load.hours)}</span>
      </span>
      {!cover && (
        <span className={styles.track}>
          <span className={cx(styles.fill, fill)} style={{ width: `${Math.min(100, (load.hours / CAP_HOURS_PER_DAY) * 100)}%` }} />
        </span>
      )}
      {flags.length > 0 && <span className={styles.flags}>{flags}</span>}
    </button>
  )
}

/**
 * One week as caregiver × day load: visits, hours against the daily cap, and flags. A cell
 * opens that day in the Day view. The "Needs cover" row counts visits nobody has yet.
 */
export function WeekGrid({
  days,
  rows,
  footer,
  pagination,
  onOpenDay,
}: {
  days: WeekDay[]
  rows: WeekRow[]
  footer: ReactNode
  /** Sits between the grid and the footer. */
  pagination?: ReactNode
  onOpenDay: (date: string) => void
}) {
  return (
    <>
      <div className={styles.grid} role="table" aria-label="Visits by caregiver and day">
        <div className={cx(styles.row, styles.head)} role="row">
          <div role="columnheader">
            <span className={styles.visuallyHidden}>Caregiver</span>
          </div>
          {days.map((day) => (
            <div key={day.date} role="columnheader" className={cx(styles.dayLabel, day.isToday && styles.todayLabel)}>
              {day.isToday ? `${day.label} · TODAY` : day.label}
            </div>
          ))}
          <div role="columnheader" className={styles.weekLabel}>
            Week
          </div>
        </div>
        {rows.map((row) => (
          <div key={row.id} className={cx(styles.row, styles.body)} role="row">
            <div role="rowheader" className={styles.label}>
              <div className={styles.name}>{row.name}</div>
              <div className={cx(styles.sub, row.kind === 'cover' && styles.coverText)}>{row.subLine}</div>
            </div>
            {row.days.map((load, i) => (
              <div key={days[i].date} role="cell" className={styles.slot}>
                <DayCell load={load} day={days[i]} cover={row.kind === 'cover'} onOpen={() => onOpenDay(days[i].date)} />
              </div>
            ))}
            <div role="cell" className={styles.total}>
              {row.kind === 'cover' ? (
                hours(row.totalHours)
              ) : (
                <>
                  <span className={row.totalHours > CAP_HOURS_PER_WEEK ? styles.danger : undefined}>{hours(row.totalHours)}</span>
                  <div className={styles.cap}>/ {CAP_HOURS_PER_WEEK}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {pagination && <div className={styles.pagination}>{pagination}</div>}
      <div className={styles.footer}>{footer}</div>
    </>
  )
}

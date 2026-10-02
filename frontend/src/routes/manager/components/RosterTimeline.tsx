import type { CSSProperties } from 'react'
import { VisitBlock } from '../../../shared/components/ui'
import type { DayTimeline } from '../data/roster'
import styles from './RosterTimeline.module.css'

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

const LABEL_COLUMN = 1

/**
 * One day as a caregiver × hour grid, so cover can be judged by sight. A visit snaps to the
 * column of the hour it starts in and spans the hours it runs (a 09:30 visit sits in 09).
 */
export function RosterTimeline({ timeline }: { timeline: DayTimeline }) {
  const { rows, startHour, endHour } = timeline
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const grid = { '--hours': hours.length } as CSSProperties

  return (
    <div className={styles.timeline} role="table" aria-label="Visits by caregiver and hour">
      <div className={styles.row} style={grid} role="row">
        <div role="columnheader" className={styles.corner}>
          <span className={styles.visuallyHidden}>Caregiver</span>
        </div>
        {hours.map((hour) => (
          <div key={hour} role="columnheader" className={styles.hour}>
            {String(hour).padStart(2, '0')}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} className={cx(styles.row, styles.body)} style={grid} role="row">
          <div role="rowheader" className={styles.label}>
            <div className={styles.name}>{row.name}</div>
            <div className={cx(styles.sub, row.kind === 'cover' && styles.cover)}>{row.subLine}</div>
          </div>
          {row.blocks.map((block) => {
            const column = Math.min(block.hour - startHour, hours.length - 1) + LABEL_COLUMN + 1
            const span = Math.min(Math.max(1, Math.ceil(block.minutes / 60)), hours.length + LABEL_COLUMN + 1 - column)
            return (
              <VisitBlock
                key={block.id}
                elderShort={block.elderShort}
                label={block.label}
                state={block.state}
                startCol={column}
                span={span}
                title={block.title}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

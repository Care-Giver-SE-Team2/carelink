import { DayToggle, NumberInput, TimeInput } from '../../../shared/components/ui'
import { WEEKDAYS } from './weekdays'
import type { DayKey, DayScheduleEntry, DayScheduleValue } from './weekdays'
import styles from './DaySchedule.module.css'

/**
 * Seven weekday rows — toggle, start time, minutes — for authoring a sub-plan's or task's
 * schedule. An inactive day disables both inputs. Manager-only: a read-only view of a
 * schedule for other roles belongs in the shared tier as its own component.
 */
export function DaySchedule({
  value,
  onChange,
  disabled = false,
}: {
  value: DayScheduleValue
  onChange: (next: DayScheduleValue) => void
  disabled?: boolean
}) {
  function update(key: DayKey, patch: Partial<DayScheduleEntry>) {
    onChange({ ...value, [key]: { ...value[key], ...patch } })
  }

  return (
    <div className={styles.schedule}>
      {WEEKDAYS.map((d) => {
        const entry = value[d.key]
        const inactive = disabled || !entry.active
        return (
          <div key={d.key} className={styles.row}>
            <DayToggle
              day={d.letter}
              label={d.full}
              active={entry.active}
              disabled={disabled}
              onToggle={() => update(d.key, { active: !entry.active })}
            />
            <TimeInput
              aria-label={`${d.full} start time`}
              value={entry.startTime}
              disabled={inactive}
              onChange={(startTime) => update(d.key, { startTime })}
            />
            <span className={styles.minutes}>
              <NumberInput
                aria-label={`${d.full} minutes`}
                suffix="min"
                value={entry.minutes}
                disabled={inactive}
                onChange={(minutes) => update(d.key, { minutes })}
              />
            </span>
          </div>
        )
      })}
    </div>
  )
}

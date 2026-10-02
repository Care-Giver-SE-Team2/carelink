import { cx } from './cx'
import styles from './ViewToggle.module.css'

export type ViewToggleOption<T extends string> = { value: T; label: string }

/** Two or more mutually exclusive views of the same data (DAY / WEEK), as pressed chips. */
export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ViewToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Names the group for assistive tech ("Roster view"). */
  label: string
}) {
  return (
    <div role="group" aria-label={label} className={styles.toggle}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cx(styles.chip, active && styles.active)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

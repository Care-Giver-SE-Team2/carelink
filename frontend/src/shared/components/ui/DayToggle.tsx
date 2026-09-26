import { cx } from './cx'
import styles from './DayToggle.module.css'

/** Square weekday switch — filled when on. */
export function DayToggle({
  day,
  label,
  active,
  onToggle,
  disabled,
}: {
  /** The letter shown ("M"). */
  day: string
  /** Full day name for assistive tech ("Monday"). */
  label: string
  active: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={cx(styles.toggle, active && styles.active)}
      aria-pressed={active}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
    >
      {day}
    </button>
  )
}

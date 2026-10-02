import { cx } from './cx'
import styles from './FilterChips.module.css'

export type FilterChipOption<T extends string> = { value: T; label: string; count: number }

/**
 * Mutually exclusive filters over one list, each with how many rows it would show
 * ("TO REVIEW · 2", "EXPIRING · 3", "ALL · 41").
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterChipOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Names the group for assistive tech ("Certification filter"). */
  label: string
}) {
  return (
    <div role="group" aria-label={label} className={styles.chips}>
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
            {option.label} · {option.count}
          </button>
        )
      })}
    </div>
  )
}

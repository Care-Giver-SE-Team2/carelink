import type { SelectHTMLAttributes } from 'react'
import { ChevronDownIcon } from './icons'
import { cx } from './cx'
import styles from './Select.module.css'

export type SelectItem = { value: string; label: string }
export type SelectGroup = { group: string; items: SelectItem[] }

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'style'> & {
  /** Grouped (rendered as <optgroup>s) or a flat list. */
  options: SelectGroup[] | SelectItem[]
  value: string
  onChange: (value: string) => void
  /** Shown, and offered as a disabled first option, while `value` matches no option. */
  placeholder?: string
  /**
   * `field` = a form control (strong border). `filter` = an inert list filter (soft border,
   * mono), which reads as "prefix: value ▾".
   */
  variant?: 'field' | 'filter'
  prefix?: string
  width?: number | string
}

function isGrouped(options: SelectGroup[] | SelectItem[]): options is SelectGroup[] {
  return options.length > 0 && 'group' in options[0]
}

export function Select({
  options,
  value,
  onChange,
  placeholder,
  variant = 'field',
  prefix,
  width,
  disabled,
  className,
  ...rest
}: Props) {
  const flat = isGrouped(options) ? options.flatMap((g) => g.items) : options
  const selected = flat.find((item) => item.value === value)

  return (
    <div
      className={cx(styles.select, styles[variant], disabled && styles.disabled, className)}
      style={width !== undefined ? { width } : undefined}
    >
      <span className={cx(styles.label, !selected && styles.placeholder)}>
        {prefix && `${prefix}: `}
        {selected?.label ?? placeholder}
      </span>
      <span className={styles.caret} aria-hidden="true">
        {variant === 'filter' ? '▾' : <ChevronDownIcon />}
      </span>
      <select
        className={styles.native}
        value={selected ? value : ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        {placeholder && !selected && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {isGrouped(options)
          ? options.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
      </select>
    </div>
  )
}

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Eyebrow } from './Typography'
import { SearchIcon } from './icons'
import { cx } from './cx'
import styles from './Inputs.module.css'

type NativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'style' | 'width' | 'type'>

type StringInputProps = NativeProps & {
  value: string
  onChange: (value: string) => void
  /** Fixed width in px (or any CSS length). Defaults to the control's natural width. */
  width?: number | string
}

/** Single-line text. */
export function TextInput({ value, onChange, width, className, ...rest }: StringInputProps) {
  return (
    <input
      type="text"
      className={cx(styles.input, styles.text, className)}
      style={width !== undefined ? { width } : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

/** Calendar date. `value` is ISO "yyyy-MM-dd", matching java.time.LocalDate's JSON form. */
export function DateInput({ value, onChange, width = 128, className, ...rest }: StringInputProps) {
  return (
    <input
      type="date"
      className={cx(styles.input, styles.date, className)}
      style={{ width }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

/** Clock time ("8:00 AM"). Disabled, it clears and shows a dash, so an inactive day reads as empty. */
export function TimeInput({ value, onChange, disabled, placeholder = '—', className, ...rest }: StringInputProps) {
  return (
    <input
      type="text"
      className={cx(styles.input, styles.time, className)}
      value={disabled ? '' : value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

/** Whole non-negative number with an optional unit after it ("30 min"). Empty input is `null`. */
export function NumberInput({
  value,
  onChange,
  suffix,
  disabled,
  className,
  ...rest
}: NativeProps & { value: number | null; onChange: (value: number | null) => void; suffix?: string }) {
  return (
    <span className={styles.numberWrap}>
      <input
        type="text"
        inputMode="numeric"
        className={cx(styles.input, styles.number, className)}
        value={disabled || value === null ? '' : String(value)}
        disabled={disabled}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits === '' ? null : Number(digits))
        }}
        {...rest}
      />
      {suffix && (
        <span className={cx(styles.suffix, disabled && styles.disabled)} aria-hidden="true">
          {suffix}
        </span>
      )}
    </span>
  )
}

/** Search box with a magnifier — the strong border marks it as the active filter. */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  ...rest
}: NativeProps & { value: string; onChange: (value: string) => void }) {
  return (
    <div className={cx(styles.search, className)}>
      <SearchIcon />
      <input
        type="search"
        className={styles.searchInput}
        value={value}
        placeholder={placeholder}
        aria-label={rest['aria-label'] ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  )
}

/**
 * Eyebrow label above (or, `inline`, beside) a control. The render prop receives the id
 * to put on the control so the label is associated with it.
 */
export function Field({
  label,
  inline = false,
  className,
  children,
}: {
  label: ReactNode
  inline?: boolean
  className?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className={cx(styles.field, inline && styles.inline, className)}>
      <Eyebrow htmlFor={id}>{label}</Eyebrow>
      {children(id)}
    </div>
  )
}

import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  /** Full width, taller — the rail's stacked actions. Overrides `size`. */
  block?: boolean
}

/**
 * primary = the one action a screen wants; secondary = an alternative; ghost = Cancel;
 * danger = a confirmed destructive action; dangerOutline = the button that opens one.
 */
export function Button({
  variant = 'secondary',
  size = 'sm',
  block = false,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], block ? styles.block : styles[size], className)}
      {...rest}
    />
  )
}

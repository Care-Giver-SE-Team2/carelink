import type { ReactNode } from 'react'
import { cx } from './cx'
import styles from './Typography.module.css'

type TextProps = { children: ReactNode; className?: string; id?: string }

/** Screen heading — "Care plan", "Elders". */
export function PageTitle({ children, className, id, as: Tag = 'h1' }: TextProps & { as?: 'h1' | 'h2' }) {
  return (
    <Tag id={id} className={cx(styles.pageTitle, className)}>
      {children}
    </Tag>
  )
}

/** Name of a row, card or person. */
export function RowTitle({ children, className, id }: TextProps) {
  return (
    <span id={id} className={cx(styles.rowTitle, className)}>
      {children}
    </span>
  )
}

/** Running prose. */
export function BodyText({ children, className, id }: TextProps) {
  return (
    <p id={id} className={cx(styles.body, className)}>
      {children}
    </p>
  )
}

/** Mono data line — counts, IDs, dates, durations. `faint` for empty values, `danger` for a missing assignment. */
export function MetaText({
  children,
  className,
  id,
  tone = 'default',
  as: Tag = 'div',
}: TextProps & { tone?: 'default' | 'faint' | 'danger'; as?: 'div' | 'span' | 'p' }) {
  return (
    <Tag id={id} className={cx(styles.meta, tone !== 'default' && styles[tone], className)}>
      {children}
    </Tag>
  )
}

/**
 * Small uppercase label over a section or field. `danger`/`accent` signal the tone of
 * what follows (e.g. a destructive dialog). Renders a <label> when given `htmlFor`.
 * `wide` is the looser tracking used for table headers and KPI labels.
 */
export function Eyebrow({
  children,
  className,
  id,
  tone = 'default',
  wide = false,
  htmlFor,
}: TextProps & { tone?: 'default' | 'danger' | 'accent'; wide?: boolean; htmlFor?: string }) {
  const classes = cx(styles.eyebrow, tone !== 'default' && styles[tone], wide && styles.wide, className)
  if (htmlFor) {
    return (
      <label id={id} htmlFor={htmlFor} className={classes}>
        {children}
      </label>
    )
  }
  return (
    <span id={id} className={classes}>
      {children}
    </span>
  )
}

import type { ReactNode } from 'react'
import { Eyebrow, RowTitle } from './Typography'
import { cx } from './cx'
import styles from './Surfaces.module.css'

/** Photo placeholder. 26 small, 32–34 list row, 56 profile header. */
export function Avatar({ size }: { size: number }) {
  return <div className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true" />
}

/** Avatar, name and a mono meta line — the top of a detail rail. */
export function IdentityHeader({ name, meta }: { name: ReactNode; meta?: ReactNode }) {
  return (
    <div className={styles.identity}>
      <Avatar size={56} />
      <div>
        <div className={styles.identityName}>{name}</div>
        {meta && <div className={styles.identityMeta}>{meta}</div>}
      </div>
    </div>
  )
}

/** Bordered rail box, with an optional title row (and something at its right, like a badge). */
export function Card({ title, trailing, children }: { title?: ReactNode; trailing?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.card}>
      {(title || trailing) && (
        <div className={styles.cardHeader}>
          {title && <RowTitle>{title}</RowTitle>}
          {trailing}
        </div>
      )}
      <div className={styles.cardBody}>{children}</div>
    </section>
  )
}

/**
 * Label/value pairs. `compact` = mono summary lines inside a card; `ruled` = a profile
 * attribute list with a hairline under each row.
 */
export function KeyValueList({
  items,
  variant = 'compact',
}: {
  items: { label: ReactNode; value: ReactNode }[]
  variant?: 'compact' | 'ruled'
}) {
  return (
    <dl className={variant === 'ruled' ? styles.kvRuled : styles.kvCompact}>
      {items.map((item, i) => (
        <div key={i} className={styles.kvRow}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A named person attached to the elder — primary caregiver, family contact. */
export function PersonCard({
  name,
  role,
  meta,
  actions,
}: {
  name: ReactNode
  role: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className={styles.person}>
      <div className={styles.personHeader}>
        <RowTitle>{name}</RowTitle>
        <Eyebrow>{role}</Eyebrow>
      </div>
      {meta && <div className={styles.personMeta}>{meta}</div>}
      {actions && <div className={styles.personActions}>{actions}</div>}
    </section>
  )
}

/**
 * Boxed system note. `info` = pending-change impact; `neutral` = a read-only/historical
 * state; `danger` = consequences of a destructive action, or an error.
 */
export function Callout({
  tone,
  children,
  role,
  className,
}: {
  tone: 'info' | 'neutral' | 'danger'
  children: ReactNode
  role?: 'status' | 'alert'
  className?: string
}) {
  return (
    <div role={role} className={cx(styles.callout, styles[tone], className)}>
      {children}
    </div>
  )
}

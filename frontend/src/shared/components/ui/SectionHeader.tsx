import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

/**
 * Title row over one section of a board ("Visit roster", "Exception queue"). `meta` sits on
 * the title's baseline, or at the far right with `metaAlign="end"` when there are no actions.
 */
export function SectionHeader({
  title,
  meta,
  metaAlign = 'start',
  actions,
  id,
}: {
  title: ReactNode
  meta?: ReactNode
  metaAlign?: 'start' | 'end'
  actions?: ReactNode
  /** Put on the heading, so the section can be `aria-labelledby` it. */
  id?: string
}) {
  const metaNode = meta && <span className={styles.meta}>{meta}</span>
  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {metaAlign === 'start' && metaNode}
      </div>
      {metaAlign === 'end' && metaNode}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}

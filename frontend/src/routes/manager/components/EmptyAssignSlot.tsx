import type { ReactNode } from 'react'
import { Button, MetaText } from '../../../shared/components/ui'
import styles from './EmptyAssignSlot.module.css'

/** Dashed placeholder where a required assignment is missing ("No primary caregiver"). */
export function EmptyAssignSlot({
  message,
  actionLabel,
  onAction,
}: {
  message: ReactNode
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className={styles.slot}>
      <MetaText tone="danger" as="span">
        {message}
      </MetaText>
      <Button variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  )
}

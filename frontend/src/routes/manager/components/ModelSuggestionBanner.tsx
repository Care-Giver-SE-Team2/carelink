import type { ReactNode } from 'react'
import { Button, Tag } from '../../../shared/components/ui'
import styles from './ModelSuggestionBanner.module.css'

/** The roster model's pending suggestion, with a way into reviewing it. */
export function ModelSuggestionBanner({ text, onReview }: { text: ReactNode; onReview: () => void }) {
  return (
    <aside className={styles.banner} aria-label="Model suggestion">
      <Tag tone="accent" solid compact className={styles.tag}>
        MODEL
      </Tag>
      <p className={styles.text}>{text}</p>
      <Button onClick={onReview}>Review</Button>
    </aside>
  )
}

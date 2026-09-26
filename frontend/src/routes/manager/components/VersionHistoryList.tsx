import { Badge } from '../../../shared/components/ui'
import type { BadgeStatus } from '../../../shared/components/ui'
import styles from './VersionHistoryList.module.css'

export type VersionEntry = {
  n: number
  /** Display date ("26 Aug"), or "editing" for an unpublished draft. */
  date: string
  status: BadgeStatus
  /** What changed in this version. */
  summary?: string
}

/**
 * A plan's versions, newest first. Current versions carry their status badge; archived
 * ones link to their read-only snapshot when `onOpen` is given.
 */
export function VersionHistoryList({ versions, onOpen }: { versions: VersionEntry[]; onOpen?: (n: number) => void }) {
  return (
    <ul className={styles.list}>
      {versions.map((v) => {
        const text = (
          <div>
            <div className={styles.version}>
              v{v.n} · {v.date}
            </div>
            {v.summary && <div className={styles.summary}>{v.summary}</div>}
          </div>
        )
        const archived = v.status === 'archived'
        return (
          <li key={v.n} className={styles.item}>
            {archived && onOpen ? (
              <button type="button" className={styles.row} onClick={() => onOpen(v.n)}>
                {text}
                <span className={styles.view}>view →</span>
              </button>
            ) : (
              <div className={styles.row}>
                {text}
                {!archived && <Badge status={v.status} compact />}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

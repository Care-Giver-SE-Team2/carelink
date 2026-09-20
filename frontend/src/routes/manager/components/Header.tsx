import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Header.module.css'

export function Header({ context, right }: { context?: ReactNode; right?: ReactNode }) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={`${styles.left} ${context ? styles.withContext : ''}`}>
        <span className={styles.wordmark}>CareLink</span>
        {context ? (
          <span className={styles.context}>{context}</span>
        ) : (
          <span className={styles.consoleLabel}>Manager console</span>
        )}
      </div>

      <div className={styles.right}>
        {right ?? (
          <>
            <span className={styles.date}>Thu 28 Aug 2026 · 09:41</span>
            <span className={styles.divider} />
            <span className={styles.userName}>Tan Mei Ling</span>
            <span className={styles.roleBadge}>CARE MGR</span>
          </>
        )}
        <button className={styles.logoutBtn} onClick={() => navigate('/')}>
          Log out
        </button>
      </div>
    </header>
  )
}

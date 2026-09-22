import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserIdentity } from './UserIdentity'
import styles from './Header.module.css'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

function formatHeaderDate(date: Date): string {
  return `${dateFormatter.format(date).replace(',', '')} · ${timeFormatter.format(date)}`
}

export function Header({ context, right }: { context?: ReactNode; right?: ReactNode }) {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

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
            <span className={styles.date}>{formatHeaderDate(now)}</span>
            <span className={styles.divider} />
            <UserIdentity />
          </>
        )}
        <button className={styles.logoutBtn} onClick={() => navigate('/')}>
          Log out
        </button>
      </div>
    </header>
  )
}

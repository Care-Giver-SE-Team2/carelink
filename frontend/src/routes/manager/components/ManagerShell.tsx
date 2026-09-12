import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import styles from './ManagerShell.module.css'

/**
 * Frame for the manager console screens: header + left nav + content area.
 * Bypasses the shared RoleShell — the manager console is a dense desktop app
 * per the design handoff, not the simple mobile-first bar the other three
 * clients use.
 *
 * `headerContext`/`headerRight` forward to Header for pages whose top bar
 * shows a breadcrumb and page-specific status instead of the default
 * clock/user block (e.g. the Care plan screen's publish state).
 */
export function ManagerShell({
  headerContext,
  headerRight,
  children,
}: {
  headerContext?: ReactNode
  headerRight?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.shell}>
      <Header context={headerContext} right={headerRight} />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}

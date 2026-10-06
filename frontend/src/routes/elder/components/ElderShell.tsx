import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { ElderSignOutContext } from '../lib/signOutContext'
import {
  isSessionExpired,
  useElderSignOut,
  useElderUser,
} from '../lib/useElderSession'
import { SignOutButton } from './ElderUi'
import styles from './ElderUi.module.css'

/**
 * Frame for every elder screen. The phone is the main device and there is no app bar there:
 * each screen opens with its own large ScreenHeader, so the first thing the elder reads is
 * the question or greeting rather than product chrome. Larger screens keep the same content
 * and choices; the column centres and grows (tablet), or splits in two under a thin CareLink
 * bar (desktop) — see ScreenColumns. The elder theme (larger type and touch targets) applies
 * throughout.
 *
 * Sign out is on every screen except the red help screen: in the desktop bar, and in the
 * ScreenFooter on phone and tablet (via ElderSignOutContext). An expired session returns the
 * user to the sign-in page.
 */
export function ElderShell({
  tone = 'plain',
  children,
}: {
  /** `help` fills the whole screen with the help colour (the "help is coming" screen). */
  tone?: 'plain' | 'help'
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { error } = useElderUser()
  const signOut = useElderSignOut()
  const expired = isSessionExpired(error)

  useEffect(() => {
    if (expired) {
      navigate('/', { replace: true })
    }
  }, [expired, navigate])

  if (expired) {
    return null
  }

  return (
    <div
      data-theme="elder"
      className={`${styles.shell} ${tone === 'help' ? styles.shellHelp : ''}`}
    >
      {tone === 'plain' && (
        <div className={styles.appBar}>
          <span className={styles.wordmark}>CareLink</span>
          <SignOutButton
            placement="bar"
            onClick={signOut.signOut}
            signingOut={signOut.signingOut}
          />
        </div>
      )}
      <ElderSignOutContext.Provider value={tone === 'plain' ? signOut : null}>
        <main className={styles.column}>{children}</main>
      </ElderSignOutContext.Provider>
    </div>
  )
}

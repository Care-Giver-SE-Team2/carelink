import { createContext } from 'react'

/**
 * Sign-out state from ElderShell, read by ScreenFooter so every screen's footer can show
 * the sign-out button (phone and tablet) alongside the desktop bar's, sharing one state.
 * Null outside an ElderShell (e.g. a page rendered on its own in a test).
 */
export const ElderSignOutContext = createContext<{
  signOut: () => void
  signingOut: boolean
  error: string | null
} | null>(null)

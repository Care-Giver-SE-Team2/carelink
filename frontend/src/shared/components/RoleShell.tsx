import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * The frame every role screen sits in. It exists so that the four role clients do
 * not each invent their own header, spacing and back link.
 *
 * `theme` switches the CSS custom properties in shared/theme/theme.css. Pass
 * "elder" for the elder client; everything else uses the standard theme.
 */
export function RoleShell({
  title,
  theme = 'standard',
  wide = false,
  children,
}: {
  title: string
  theme?: 'standard' | 'elder'
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div data-theme={theme === 'elder' ? 'elder' : undefined}>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          padding: 'var(--gap)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--gap)',
        }}
      >
        <Link to="/" style={{ color: 'var(--text-muted)' }}>
          ← CareLink
        </Link>
        <strong>{title}</strong>
      </header>

      <main
        style={{
          padding: 'var(--gap)',
          maxWidth: wide ? 'none' : 640,
          margin: '0 auto',
        }}
      >
        {children}
      </main>
    </div>
  )
}

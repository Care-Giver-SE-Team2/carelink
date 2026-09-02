import { RoleShell } from '../../shared/components/RoleShell'

/**
 * Elder client (老人端) — placeholder.
 *
 * Replace this with the real screens. Everything in this folder belongs to the
 * owner of this role; nobody else edits files here.
 *
 * See README.md in this folder for the use cases to cover and the layout notes.
 */
export default function ElderHome() {
  return (
    <RoleShell title="Elder client" theme="elder">
      <p>老人端</p>
      <p style={{ color: 'var(--text-muted)' }}>
        Placeholder. See README.md in this folder.
      </p>
    </RoleShell>
  )
}

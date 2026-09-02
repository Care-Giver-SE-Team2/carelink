import { RoleShell } from '../../shared/components/RoleShell'

/**
 * Manager console (主管台) — placeholder.
 *
 * Replace this with the real screens. Everything in this folder belongs to the
 * owner of this role; nobody else edits files here.
 *
 * See README.md in this folder for the use cases to cover and the layout notes.
 */
export default function ManagerHome() {
  return (
    <RoleShell title="Manager console" wide theme="standard">
      <p>主管台</p>
      <p style={{ color: 'var(--text-muted)' }}>
        Placeholder. See README.md in this folder.
      </p>
    </RoleShell>
  )
}

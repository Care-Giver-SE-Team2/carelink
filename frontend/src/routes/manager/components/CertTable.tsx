import { CertificationStateTag, DataTable } from '../../../shared/components/ui'
import type { DataTableColumn } from '../../../shared/components/ui'
import type { CredentialRegisterRow } from '../../../shared/api/profile'
import { certificationLabel, expiryLabel } from '../lib/certifications'
import styles from './CertTable.module.css'

/**
 * The certification register: caregiver, certification, how long until it lapses, the booked
 * visits that would lose cover, and its state. A row opens in the review panel.
 * `visitsAtRisk` is keyed by credential id; zero, a missing entry or null shows a dash.
 */
export function CertTable({
  rows,
  visitsAtRisk,
  selectedId,
  onSelect,
  empty,
}: {
  rows: CredentialRegisterRow[]
  visitsAtRisk: Map<number, number | null> | undefined
  selectedId: number | null
  onSelect: (row: CredentialRegisterRow) => void
  empty: string
}) {
  const columns: DataTableColumn<CredentialRegisterRow>[] = [
    { key: 'caregiver', label: 'Caregiver', width: '1.2fr', render: (row) => <span className={styles.name}>{row.caregiverName}</span> },
    { key: 'certification', label: 'Certification', width: '1.1fr', render: (row) => <span className={styles.type}>{certificationLabel(row)}</span> },
    {
      key: 'expires',
      label: 'Expires',
      width: '96px',
      align: 'right',
      render: (row) => {
        const expiry = expiryLabel(row.daysUntilExpiry)
        return <span className={`${styles.expires} ${styles[expiry.tone]}`}>{expiry.text}</span>
      },
    },
    {
      key: 'risk',
      label: 'Visits at risk',
      width: '108px',
      align: 'right',
      render: (row) => <span className={styles.risk}>{visitsAtRisk?.get(row.id) || '—'}</span>,
    },
    { key: 'state', label: 'State', width: '118px', align: 'right', render: (row) => <CertificationStateTag state={row.state} /> },
  ]

  return (
    <DataTable
      label="Certifications"
      columns={columns}
      rows={rows}
      rowKey={(row) => String(row.id)}
      onRowClick={onSelect}
      selectedKey={selectedId === null ? null : String(selectedId)}
      empty={empty}
    />
  )
}

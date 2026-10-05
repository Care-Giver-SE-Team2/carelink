import { DataTable, Tag } from '../../../shared/components/ui'
import type { DataTableColumn } from '../../../shared/components/ui'
import type { IntakeReview } from '../../../shared/api/profile'
import { FLAG_TAG, applicationFlag, careForMeta, formatReceived } from '../lib/applications'
import styles from './ApplicationTable.module.css'

/**
 * Pending family applications: who applied, who for, the sector the elder lives in, when it
 * came in, and a one-word summary of the checks. A row opens in the application panel.
 */
export function ApplicationTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: IntakeReview[]
  selectedId: number | null
  onSelect: (row: IntakeReview) => void
}) {
  const columns: DataTableColumn<IntakeReview>[] = [
    {
      key: 'applicant',
      label: 'Applicant',
      width: 'minmax(0, 1.2fr)',
      render: (row) => (
        <div className={styles.stack}>
          <span className={styles.name}>{row.applicant.fullName}</span>
          <span className={styles.sub}>{row.applicant.username ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'careFor',
      label: 'Care for',
      width: 'minmax(0, 1.2fr)',
      render: (row) => (
        <div className={styles.stack}>
          <span className={styles.elder}>{row.targetElderName}</span>
          <span className={styles.sub}>{careForMeta(row)}</span>
        </div>
      ),
    },
    { key: 'sector', label: 'Sector', width: '68px', render: (row) => <span className={styles.sector}>{row.sector ?? '—'}</span> },
    {
      key: 'received',
      label: 'Received',
      width: '88px',
      render: (row) => <span className={styles.received}>{formatReceived(row.createdAt)}</span>,
    },
    {
      key: 'check',
      label: 'Check',
      width: '96px',
      align: 'right',
      render: (row) => {
        const tag = FLAG_TAG[applicationFlag(row.checks)]
        return (
          <Tag compact tone={tag.tone}>
            {tag.label}
          </Tag>
        )
      },
    },
  ]

  return (
    <DataTable
      label="Applications"
      columns={columns}
      rows={rows}
      rowKey={(row) => String(row.id)}
      onRowClick={onSelect}
      selectedKey={selectedId === null ? null : String(selectedId)}
      empty="No applications waiting. New ones from the family app appear here."
    />
  )
}

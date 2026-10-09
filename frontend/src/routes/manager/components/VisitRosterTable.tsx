import type { ReactNode } from 'react'
import { Button, DataTable, VisitStateBadge } from '../../../shared/components/ui'
import type { DataTableColumn } from '../../../shared/components/ui'
import type { Visit } from '../data/today'
import styles from './VisitRosterTable.module.css'

const COLUMNS: DataTableColumn<Visit>[] = [
  { key: 'time', label: 'Time', width: '74px', render: (v) => <span className={styles.time}>{v.time}</span> },
  {
    key: 'elder',
    label: 'Elder',
    width: '1.3fr',
    render: (v) => (
      <span className={styles.elder}>
        {v.elder.name} <span className={styles.sector}>{v.elder.sector}</span>
      </span>
    ),
  },
  {
    key: 'caregiver',
    label: 'Caregiver',
    width: '1.2fr',
    render: (v) =>
      v.caregiver ? (
        <span className={styles.caregiver}>{v.caregiver.name}</span>
      ) : (
        <span className={styles.unassigned}>Unassigned</span>
      ),
  },
  { key: 'service', label: 'Service', width: '1fr', render: (v) => <span className={styles.service}>{v.service}</span> },
  { key: 'state', label: 'State', width: '150px', render: (v) => <VisitStateBadge state={v.state} /> },
]

/**
 * Today's visits, an exception tinted danger and an unassigned visit tinted for the model.
 * With `onAssign`, an unassigned visit that has not started gets an Assign action.
 */
export function VisitRosterTable({
  visits,
  footer,
  empty,
  onAssign,
}: {
  visits: Visit[]
  footer?: ReactNode
  empty?: ReactNode
  onAssign?: (visit: Visit) => void
}) {
  const columns: DataTableColumn<Visit>[] = onAssign
    ? [
        ...COLUMNS,
        {
          key: 'action',
          label: '',
          width: '84px',
          align: 'right',
          render: (v) =>
            v.assignable && (
              <Button aria-label={`Assign ${v.elder.name} ${v.service}`} onClick={() => onAssign(v)}>
                Assign
              </Button>
            ),
        },
      ]
    : COLUMNS
  return (
    <DataTable
      label="Visit roster"
      columns={columns}
      rows={visits}
      rowKey={(v) => v.id}
      rowTone={(v) => (v.state === 'exception' ? 'danger' : v.caregiver ? null : 'info')}
      footer={footer}
      empty={empty}
    />
  )
}

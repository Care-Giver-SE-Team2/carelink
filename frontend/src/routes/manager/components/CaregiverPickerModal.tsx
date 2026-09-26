import { useState } from 'react'
import type { ElderRow } from '../data/elders'
import {
  CAREGIVERS,
  assignCaregiver,
  getAssignment,
  maxHoursPerDay,
  priorVisitCount,
  removeAssignment,
} from '../data/caregivers'
import { RemoveCaregiverDialog } from './RemoveCaregiverDialog'
import { Avatar, Button, Eyebrow, ListRow, Modal, SearchField } from '../../../shared/components/ui'
import styles from './CaregiverPickerModal.module.css'

type Props = {
  elder: ElderRow
  onAssign: (caregiverId: string) => void
  onRemove: () => void
  onClose: () => void
}

/** An expired certification blocks assignment (safety); a sector mismatch is shown but doesn't. */
export function CaregiverPickerModal({ elder, onAssign, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const assignment = getAssignment(elder.id)
  const currentCaregiver = assignment
    ? CAREGIVERS.find((c) => c.id === assignment.caregiverId)
    : undefined

  const q = query.trim().toLowerCase()
  const visibleCaregivers = q ? CAREGIVERS.filter((c) => c.name.toLowerCase().includes(q)) : CAREGIVERS

  function handleAssign(caregiverId: string) {
    assignCaregiver(elder.id, caregiverId)
    onAssign(caregiverId)
  }

  function handleConfirmRemove() {
    removeAssignment(elder.id)
    setConfirmingRemove(false)
    onRemove()
  }

  return (
    <>
      <Modal
        eyebrow="Assign caregiver"
        eyebrowTone="accent"
        title={`${elder.name} · sector ${elder.sector || '—'}`}
        meta={
          currentCaregiver && assignment
            ? `Currently ${currentCaregiver.name} · since ${assignment.since}`
            : 'Currently unassigned'
        }
        width={460}
        onClose={onClose}
        footer={
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        }
      >
        <SearchField placeholder="Search caregivers…" value={query} onChange={setQuery} />

        <div role="listbox" aria-label="Caregivers" className={styles.list}>
          {visibleCaregivers.map((c) => {
            const isCurrent = c.id === assignment?.caregiverId
            const outsideSector = elder.sector !== '' && c.sector !== elder.sector
            const ineligible = !c.firstAidValid

            const metaParts = ineligible
              ? [c.sector, outsideSector ? 'outside sector' : null, 'first aid expired'].filter(Boolean)
              : [
                  c.sector,
                  'first aid valid',
                  outsideSector ? 'outside sector' : null,
                  (() => {
                    const visits = priorVisitCount(elder.id, c.id)
                    return visits > 0 ? `${visits} prior visit${visits === 1 ? '' : 's'}` : null
                  })(),
                  `${c.workloadHoursToday.toFixed(1)} / ${maxHoursPerDay().toFixed(1)} h today`,
                ].filter(Boolean)

            return (
              <ListRow
                key={c.id}
                selected={isCurrent}
                dimmed={ineligible && !isCurrent}
                leading={<Avatar size={32} />}
                title={c.name}
                meta={metaParts.join(' · ')}
                trailing={
                  isCurrent ? (
                    <>
                      <Eyebrow>Current</Eyebrow>
                      <Button variant="dangerOutline" onClick={() => setConfirmingRemove(true)}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    !ineligible && <Button onClick={() => handleAssign(c.id)}>Assign</Button>
                  )
                }
              />
            )
          })}
        </div>
      </Modal>

      {confirmingRemove && currentCaregiver && (
        <RemoveCaregiverDialog
          caregiverName={currentCaregiver.name}
          elderName={elder.name}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import type { ElderRow } from '../data/elders'
import {
  CAREGIVERS,
  assignCaregiver,
  getAssignment,
  maxHoursPerDay,
  priorVisitCount,
  removeAssignment,
} from '../data/caregivers'
import { RemoveCaregiverModal } from '../components/RemoveCaregiverModal'
import modalStyles from '../components/ConfirmModal.module.css'
import styles from './AssignCaregiverModal.module.css'

type Props = {
  elder: ElderRow
  onAssign: (caregiverId: string) => void
  onRemove: () => void
  onClose: () => void
}

/** An expired certification blocks assignment (safety); a sector mismatch is shown but doesn't. */
export function AssignCaregiverModal({ elder, onAssign, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Assign caregiver"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={`${modalStyles.modalEyebrow} ${modalStyles.accent}`}>Assign caregiver</div>
          <div className={styles.title}>
            {elder.name} · sector {elder.sector || '—'}
          </div>
          <div className={styles.currentLine}>
            {currentCaregiver && assignment
              ? `Currently ${currentCaregiver.name} · since ${assignment.since}`
              : 'Currently unassigned'}
          </div>
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search caregivers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className={styles.list}>
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
              <div
                key={c.id}
                className={[
                  styles.row,
                  isCurrent && styles.current,
                  ineligible && !isCurrent && styles.ineligible,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className={styles.avatar} />
                <div className={styles.rowMain}>
                  <div className={styles.rowNameLine}>
                    <span className={styles.rowName}>{c.name}</span>
                    {isCurrent && <span className={styles.currentLabel}>CURRENT</span>}
                  </div>
                  <div className={[styles.rowMeta, ineligible && styles.warn].filter(Boolean).join(' ')}>
                    {metaParts.join(' · ')}
                  </div>
                </div>
                {isCurrent && (
                  <button className={styles.removeLink} onClick={() => setConfirmingRemove(true)}>
                    Remove
                  </button>
                )}
                {!isCurrent && !ineligible && (
                  <button className={styles.assignBtn} onClick={() => handleAssign(c.id)}>
                    Assign
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.footer}>
          <button className={`${modalStyles.modalBtn} ${modalStyles.secondary}`} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>

      {confirmingRemove && currentCaregiver && (
        <RemoveCaregiverModal
          caregiverName={currentCaregiver.name}
          elderName={elder.name}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </div>
  )
}

import modalStyles from './ConfirmModal.module.css'

type Props = {
  caregiverName: string
  elderName: string
  onCancel: () => void
  onConfirm: () => void
}

export function RemoveCaregiverModal({ caregiverName, elderName, onCancel, onConfirm }: Props) {
  return (
    <div
      className={modalStyles.modalOverlay}
      onClick={(e) => {
        e.stopPropagation()
        onCancel()
      }}
    >
      <div
        className={`${modalStyles.modalBox} ${modalStyles.wide}`}
        role="dialog"
        aria-modal="true"
        aria-label="Remove caregiver"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${modalStyles.modalEyebrow} ${modalStyles.danger}`}>Remove caregiver</div>
        <div className={modalStyles.modalTitle}>
          Remove {caregiverName} as primary caregiver for {elderName}?
        </div>
        <p className={modalStyles.modalBodyProse}>
          Their upcoming scheduled visits become unassigned until a new caregiver is picked. The
          care plan itself is unaffected.
        </p>
        <div className={modalStyles.modalActions}>
          <button className={`${modalStyles.modalBtn} ${modalStyles.secondary}`} onClick={onCancel}>
            Cancel
          </button>
          <button className={`${modalStyles.modalBtn} ${modalStyles.danger}`} onClick={onConfirm}>
            Remove caregiver
          </button>
        </div>
      </div>
    </div>
  )
}

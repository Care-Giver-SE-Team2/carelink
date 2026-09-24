import { useLayoutEffect, useRef } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useCaregiverDetails } from '../../../features/schedule/useCaregiverDetails'
import { credentialDate, credentialExpiryDate, credentialPresentation } from '../../../features/schedule/credentialPresentation'
import type { FamilyCredential } from '../../../features/schedule/types'
import styles from './CaregiverDetails.module.css'

function DetailError({ error, section, onRetry }: {
  error: unknown; section: 'profile' | 'qualifications'; onRetry: () => void
}) {
  return <div className={styles.error} role="alert">
    <p>{error instanceof ApiError && error.status === 404
      ? `These ${section === 'profile' ? 'profile details are' : 'qualifications are'} no longer available.`
      : `Unable to load ${section}. Please try again.`}</p>
    <button onClick={onRetry}>Retry {section}</button>
  </div>
}

function CredentialCard({ credential }: { credential: FamilyCredential }) {
  const { statusLabel, validityLabel, tone } = credentialPresentation(credential)
  return <li className={styles.credential}>
    <div className={styles.credentialHeading}>
      <h4>{credential.credentialTypeName}</h4>
      <span className={styles.badge} data-tone={tone}>{statusLabel}</span>
    </div>
    <p className={styles.validity} data-tone={tone}>{validityLabel}</p>
    <dl>
      <div><dt>Issued by</dt><dd>{credential.issuingBody || 'Not provided'}</dd></div>
      <div><dt>Valid from</dt><dd>{credentialDate(credential.validFrom)}</dd></div>
      <div><dt>Valid until</dt><dd>{credentialExpiryDate(credential.expiryDate)}</dd></div>
    </dl>
  </li>
}

/**
 * Shows a visit caregiver's public profile and current qualification validity.
 * @param caregiverId Assigned caregiver to look up
 * @param onClose Closes the dialog and cancels its requests
 * @param onAccessError Clears protected schedule content after access is lost
 * @author Wang Zhili
 */
export function CaregiverDetails({ caregiverId, onClose, onAccessError }: {
  caregiverId: number
  onClose: () => void
  onAccessError: (error: unknown) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { profile, credentials, retryProfile, retryCredentials, refresh } = useCaregiverDetails(caregiverId, onAccessError)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  return <dialog
    ref={dialogRef}
    className={styles.dialog}
    aria-labelledby="caregiver-details-title"
    onCancel={(event) => { event.preventDefault(); onClose() }}
  >
    <header className={styles.header}>
      <div><p>YOUR CARE TEAM</p><h2 id="caregiver-details-title">Caregiver details</h2></div>
      <button aria-label="Close caregiver details" onClick={onClose}>×</button>
    </header>
    <div className={styles.content}>
      <section aria-label="Public profile" className={styles.profile}>
        {profile.status === 'loading' && <p role="status" className={styles.loading}>Loading caregiver profile…</p>}
        {profile.status === 'error' && <DetailError error={profile.error} section="profile" onRetry={retryProfile} />}
        {profile.status === 'success' && <>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">{Array.from(profile.data.fullName.trim())[0]}</span>
            <div><p>ASSIGNED CAREGIVER</p><h3>{profile.data.fullName}</h3></div>
          </div>
          <h4>Languages</h4>
          <p className={styles.languages}>{profile.data.dialects.length
            ? profile.data.dialects.join(', ') : 'No languages listed'}</p>
        </>}
      </section>
      <section className={styles.qualifications} aria-labelledby="caregiver-qualifications-title">
        <h3 id="caregiver-qualifications-title">Qualifications</h3>
        <p className={styles.caption}>Validity is checked against today's date in Singapore.</p>
        {credentials.status === 'loading' && <p role="status" className={styles.loading}>Loading qualifications…</p>}
        {credentials.status === 'error' && <DetailError error={credentials.error} section="qualifications" onRetry={retryCredentials} />}
        {credentials.status === 'success' && (credentials.data.length
          ? <ul className={styles.credentials}>
            {credentials.data.map((credential) => <CredentialCard key={credential.id} credential={credential} />)}
          </ul>
          : <div className={styles.empty}><h4>No public qualifications</h4><p>No published qualifications are available for this caregiver.</p></div>)}
      </section>
      <button className={styles.refresh} onClick={refresh} disabled={profile.status === 'loading' || credentials.status === 'loading'}>Refresh details</button>
    </div>
  </dialog>
}

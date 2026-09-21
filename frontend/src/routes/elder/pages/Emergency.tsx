import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  createEmergencyCall,
  type EmergencyCall,
} from '../../../features/emergency/api'
import { ApiError } from '../../../shared/api/client'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

export default function Emergency() {
  const [incident, setIncident] = useState<EmergencyCall | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmergency() {
    if (sending || incident) {
      return
    }

    setSending(true)
    setError(null)

    try {
      const created = await createEmergencyCall()
      setIncident(created)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Your session has ended. Please sign in again.')
        } else if (err.status === 403) {
          setError('This account is not authorised to send an elder SOS.')
        } else if (err.status === 404) {
          setError(
            'No elder profile is linked to this account. Please contact your care team.',
          )
        } else {
          setError(err.message)
        }
      } else {
        setError(
          'Unable to send the SOS. Please try again.',
        )
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <RoleShell title="Emergency help" theme="elder">
      <div className={styles.page}>
        <Link className={styles.back} to="/elder">
          ← Back
        </Link>

        <h1>Do you need urgent help?</h1>

        <div className={styles.warning}>
          Press the red button once. CareLink will raise an urgent SOS and
          alert the care team and your family.
        </div>

        {!incident ? (
          <>
            <button
              className={styles.danger}
              onClick={handleEmergency}
              disabled={sending}
            >
              {sending
                ? 'SENDING SOS...'
                : 'SOS — GET HELP NOW'}
            </button>

            {error && (
              <div role="alert" className={styles.warning}>
                {error}
              </div>
            )}
          </>
        ) : (
          <div className={styles.success}>
            <h2>SOS sent</h2>

            <p>
              Help has been alerted. Keep this screen open for status
              updates.
            </p>

            <p className={styles.meta}>
              Emergency ID: {incident.id}
            </p>

            <p className={styles.meta}>
              Status: {incident.status}
            </p>

            <p className={styles.meta}>
              Severity: {incident.severity}
            </p>
          </div>
        )}
      </div>
    </RoleShell>
  )
}
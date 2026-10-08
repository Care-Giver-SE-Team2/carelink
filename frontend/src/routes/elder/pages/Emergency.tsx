import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  createEmergencyCall,
  type EmergencyCall,
} from '../../../features/emergency/api'
import { ApiError } from '../../../shared/api/client'
import { ElderShell } from '../components/ElderShell'
import {
  BigAction,
  InfoNote,
  ScreenColumns,
  ScreenFooter,
  ScreenHeader,
  Slot,
  SpeakButton,
  StatusNote,
} from '../components/ElderUi'
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

  if (incident) {
    return (
      <ElderShell tone="help">
        <div>
          <h1 className={styles.helpTitle}>Help is coming</h1>
          <p className={styles.helpLead}>
            Stay where you are. Someone is on the way.
          </p>
        </div>

        <section className={styles.helpCard}>
          <div className={styles.helpCardEyebrow}>Alert sent</div>
          <h2 className={styles.helpCardTitle}>Your care team has been told</h2>

          <ul className={styles.statusList}>
            <li className={`${styles.statusItem} ${styles.statusDone}`}>
              <span className={styles.statusMark} aria-hidden="true" />
              Your alert has been raised
            </li>
            <li className={styles.statusItem}>Emergency ID: {incident.id}</li>
            <li className={styles.statusItem}>Status: {incident.status}</li>
            <li className={styles.statusItem}>Severity: {incident.severity}</li>
          </ul>
        </section>

        <div className={styles.helpActions}>
          <Link className={styles.helpHome} to="/elder">
            Back to home
          </Link>
        </div>
      </ElderShell>
    )
  }

  return (
    <ElderShell>
      <ScreenColumns
        left={
          <>
            <Slot order={1}>
              <ScreenHeader backTo="/elder" title="Do you need help now?" />
            </Slot>
            <Slot order={2}>
              <p className={styles.lead}>
                Press the red button once. Your care team and your family will be
                told straight away.
              </p>
            </Slot>
            <Slot order={5}>
              <InfoNote>
                If this screen does not work, call your care manager.
              </InfoNote>
            </Slot>
          </>
        }
        right={
          <>
            <Slot order={3}>
              <BigAction
                variant="help"
                icon="!"
                label={sending ? 'Sending…' : 'Send for help now'}
                onClick={handleEmergency}
                disabled={sending}
              />
            </Slot>
            <Slot order={4}>
              {error && <StatusNote tone="problem">{error}</StatusNote>}
            </Slot>
          </>
        }
        footer={
          <ScreenFooter>
            <SpeakButton />
          </ScreenFooter>
        }
      />
    </ElderShell>
  )
}

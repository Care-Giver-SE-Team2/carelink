import { useState } from 'react'
import { Button, Callout, Eyebrow, Modal } from '../../../shared/components/ui'
import styles from './ElderLoginDialog.module.css'

export type IssuedElderLogin = {
  applicationId: number
  elderName: string
  applicantName: string
  username: string
  temporaryPassword: string
}

/**
 * Shown once, right after an application is approved: the login created for the elder. Only the
 * password's hash is stored, so this is the only time it can be read. It closes only from its
 * own button (not Esc or a backdrop click), so the manager can't lose it by accident.
 */
export function ElderLoginDialog({ login, onDone }: { login: IssuedElderLogin; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const canCopy = typeof navigator !== 'undefined' && navigator.clipboard !== undefined

  async function copy() {
    await navigator.clipboard.writeText(`Username: ${login.username}\nTemporary password: ${login.temporaryPassword}`)
    setCopied(true)
  }

  return (
    <Modal
      eyebrow="Application approved"
      eyebrowTone="accent"
      title={`Login created for ${login.elderName}`}
      meta={`application #${login.applicationId}`}
      width={440}
      onClose={() => {}}
      footer={
        <>
          {canCopy && (
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
          <Button variant="primary" onClick={onDone}>
            I've noted it down
          </Button>
        </>
      }
    >
      <dl className={styles.credentials}>
        <div className={styles.row}>
          <dt>
            <Eyebrow>Username</Eyebrow>
          </dt>
          <dd className={styles.value}>{login.username}</dd>
        </div>
        <div className={styles.row}>
          <dt>
            <Eyebrow>Temporary password</Eyebrow>
          </dt>
          <dd className={styles.value}>{login.temporaryPassword}</dd>
        </div>
      </dl>
      <Callout tone="neutral">
        This password is shown only now and can't be shown again. Pass it to {login.applicantName} or{' '}
        {login.elderName} so {login.elderName} can sign in to the elder app.
      </Callout>
    </Modal>
  )
}

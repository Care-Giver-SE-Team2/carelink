import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Callout, Eyebrow, MetaText, TextArea } from '../../../shared/components/ui'
import type { IntakeReview } from '../../../shared/api/profile'
import {
  applicationTitle,
  careNeedsLabel,
  formatReceived,
  mobilityLabel,
  responseCountdown,
} from '../lib/applications'
import { ChecksList } from './ChecksList'
import styles from './ApplicationPanel.module.css'

/** The family app stores the message as the application's review remarks, which hold 255 characters. */
const MESSAGE_MAX = 255

/**
 * The right-hand panel of the Applications screen: everything the family submitted, the
 * server's checks, an optional message to the applicant, and Approve / Decline. Declining
 * needs a message so the family knows why. `onApprove`/`onDecline` do the request and reject
 * with the error to show. Key it by application id so the message resets between rows.
 */
export function ApplicationPanel({
  application,
  onApprove,
  onDecline,
}: {
  application: IntakeReview
  onApprove: (message: string | null) => Promise<void>
  onDecline: (message: string) => Promise<void>
}) {
  const [message, setMessage] = useState('')
  const [messageMissing, setMessageMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const applicant = application.applicant.fullName
  const elder = application.targetElderName
  const countdown = responseCountdown(application.createdAt, now)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this decision.')
      setBusy(false)
    }
  }

  function handleDecline() {
    if (!message.trim()) {
      setMessageMissing(true)
      return
    }
    void run(() => onDecline(message.trim()))
  }

  return (
    <aside className={styles.panel} aria-label="Application detail">
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Eyebrow wide>Application · #{application.id}</Eyebrow>
          <span className={countdown.urgent ? styles.countdownUrgent : styles.countdown}>{countdown.text}</span>
        </div>
        <h2 className={styles.title}>{applicationTitle(application)}</h2>
        <MetaText className={styles.meta}>submitted {formatReceived(application.createdAt)} from the family app</MetaText>
      </header>

      <section className={styles.section} aria-label="Applicant">
        <Eyebrow wide>Applicant</Eyebrow>
        <dl className={styles.fields}>
          <Detail label="Name">{applicant}</Detail>
          <Detail label="Account">{application.applicant.username ?? <NotGiven />}</Detail>
          <Detail label="Mobile">{application.applicant.phone ?? <NotGiven />}</Detail>
        </dl>
      </section>

      <section className={styles.section} aria-label="Person needing care">
        <Eyebrow wide>Person needing care</Eyebrow>
        <dl className={styles.fields}>
          <Detail label="Name">
            {elder} · {application.targetElderAge === null ? 'age not given' : `${application.targetElderAge} y.o.`}
          </Detail>
          <Detail label="Address">
            {application.targetAddress} · {application.postalCode}
          </Detail>
          <Detail label="Mobility">{capitalise(mobilityLabel(application.mobilityLevel))}</Detail>
          <Detail label="Dialects">{application.preferredDialects ?? <NotGiven />}</Detail>
          <Detail label="Care needs">
            {application.careNeeds.length ? careNeedsLabel(application.careNeeds) : <NotGiven />}
          </Detail>
          <Detail label="Medical notes">{application.medicalNotes ?? <NotGiven />}</Detail>
        </dl>
      </section>

      <section className={styles.section} aria-label="Checks">
        <Eyebrow wide>Checks</Eyebrow>
        <ChecksList application={application} />
      </section>

      <section className={styles.message}>
        <Eyebrow wide htmlFor="application-message">
          Message to {applicant} · optional
        </Eyebrow>
        <TextArea
          id="application-message"
          value={message}
          onChange={(value) => {
            setMessage(value)
            if (value.trim()) setMessageMissing(false)
          }}
          invalid={messageMissing}
          aria-describedby={messageMissing ? 'application-message-error' : undefined}
          maxLength={MESSAGE_MAX}
          disabled={busy}
          placeholder={`Shown to ${applicant} with the decision in the family app.`}
        />
        {messageMissing && (
          <MetaText id="application-message-error" tone="danger" className={styles.messageError}>
            Tell {applicant} why
          </MetaText>
        )}
      </section>

      <footer className={styles.footer}>
        <MetaText className={styles.effect}>
          Approving creates an elder record and a login for {elder}, and shows {applicant} the decision in the family
          app. You'll see the temporary password once, to pass on. The care plan is then drafted from Elders.
        </MetaText>
        {error && (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        )}
        <div className={styles.actions}>
          <Button
            variant="primary"
            block
            disabled={busy}
            onClick={() => void run(() => onApprove(message.trim() || null))}
          >
            {busy ? 'Saving…' : 'Approve'}
          </Button>
          <Button variant="dangerOutline" block disabled={busy} onClick={handleDecline}>
            Decline
          </Button>
        </div>
      </footer>
    </aside>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function NotGiven() {
  return <span className={styles.notGiven}>not given</span>
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

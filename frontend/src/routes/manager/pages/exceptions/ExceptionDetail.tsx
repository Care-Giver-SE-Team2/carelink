import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  applyPlaybook,
  changeSeverity,
  claimIncident,
  escalateIncident,
  recordContactAttempt,
  resolveIncident,
} from '../../../../features/incidents/api'
import {
  awaitingTakeOver,
  beingHandled,
  categoryLabels,
  clockNow,
  countdown,
  escalationStateLabels,
  incidentClock,
  incidentTime,
  problemDetail,
  severityLabels,
  severityTones,
  statusLabels,
  timelineTitle,
} from '../../../../features/incidents/presentation'
import type {
  ContactAttemptResult,
  ContactChannel,
  ContactOutcome,
  IncidentSeverity,
  ResolutionOutcome,
} from '../../../../features/incidents/types'
import {
  useEscalationChain,
  useIncidentDetail,
  usePlaybooks,
} from '../../../../features/incidents/useIncidentQueries'
import { ManagerShell } from '../../components/ManagerShell'
import { ExceptionFeedback } from './ExceptionFeedback'
import styles from './Exceptions.module.css'

type Panel = 'contact' | 'severity' | 'resolve' | null

/**
 * UC-MG05 steps 3 to 7 — the take-over workbench (design sheet 2b).
 *
 * The whole screen is a reading of the server's state: every action here ends
 * by loading the incident and the chain again rather than by assembling what
 * the answer probably is. Taking an incident over clears its deadline, changing
 * the severity rebuilds every level of the chain, and applying a playbook
 * changes nothing except the timeline — three different shapes of result that
 * one refresh handles and three hand-written state updates would not.
 *
 * Which buttons appear follows the status and nothing else. An incident waiting
 * for somebody shows "Take over" and "Escalate"; one being handled shows the
 * four actions of steps 4 to 6; a closed one shows none, because the timeline
 * is the point of visiting it afterwards.
 */
export default function ExceptionDetail() {
  const { id } = useParams()
  const incidentId = Number(id)
  const valid = Number.isSafeInteger(incidentId) && incidentId > 0

  const detail = useIncidentDetail(incidentId)
  const chain = useEscalationChain(incidentId)
  const playbooks = usePlaybooks()

  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<unknown>(null)
  const [contactResult, setContactResult] = useState<ContactAttemptResult | null>(null)

  const [channel, setChannel] = useState<ContactChannel>('PHONE')
  const [outcome, setOutcome] = useState<ContactOutcome>('REACHED')
  const [contactNote, setContactNote] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH')
  const [severityReason, setSeverityReason] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionOutcome, setResolutionOutcome] = useState<ResolutionOutcome>('HANDLED_ON_SITE')

  if (!valid) {
    return (
      <ManagerShell>
        <div className={styles.page}>
          <p className={styles.note}>That is not an incident number.</p>
          <Link className={styles.linkButton} to="/manager/exceptions">
            Back to the queue
          </Link>
        </div>
      </ManagerShell>
    )
  }

  /**
   * Runs one action, then reads the incident and the chain back. The two are
   * refreshed together because a severity change moves both and neither
   * response body carries the other's new state.
   */
  async function run(action: () => Promise<unknown>, afterwards?: () => void) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      afterwards?.()
      detail.refresh()
      chain.refresh()
    } catch (error) {
      setActionError(error)
    } finally {
      setBusy(false)
    }
  }

  if (detail.resource.status === 'loading') {
    return (
      <ManagerShell headerContext={<>Exceptions / EXC-{incidentId}</>}>
        <div className={styles.page}>
          <p className={styles.note}>Loading the incident…</p>
        </div>
      </ManagerShell>
    )
  }

  if (detail.resource.status === 'error') {
    return (
      <ManagerShell headerContext={<>Exceptions / EXC-{incidentId}</>}>
        <div className={styles.page}>
          <ExceptionFeedback error={detail.resource.error} onRetry={detail.refresh} />
          <Link className={styles.linkButton} to="/manager/exceptions">
            Back to the queue
          </Link>
        </div>
      </ManagerShell>
    )
  }

  const { incident, suggestedPlaybookCode, timeline } = detail.resource.data
  const heldSince = timeline.filter((entry) => entry.action === 'CLAIMED').at(-1)
  const suggested =
    playbooks.resource.status === 'success'
      ? playbooks.resource.data.find((playbook) => playbook.code === suggestedPlaybookCode)
      : undefined
  const fallback = contactResult?.fallbackPlaybook ?? null
  const remaining = countdown(incident.respondBy, clockNow())

  return (
    <ManagerShell
      headerContext={<>Exceptions / EXC-{incident.id}</>}
      headerRight={
        <>
          <span
            className={styles.severityTag}
            style={{ borderColor: severityTones[incident.severity] }}
          >
            {severityLabels[incident.severity]}
          </span>
          <span className={styles.statusTag}>{statusLabels[incident.status]}</span>
          <span className={styles.headerNote}>
            {incident.responderUserId === null
              ? 'nobody assigned'
              : `held by #${incident.responderUserId}` +
                (heldSince ? ` since ${incidentClock(heldSince.occurredAt)}` : '')}
          </span>
        </>
      }
    >
      <div className={styles.workbench}>
        <div className={styles.main}>
          <h1 className={styles.cardTitle}>
            {categoryLabels[incident.category]} — Elder #{incident.elderId}
          </h1>
          <p className={styles.cardDescription}>
            {incident.description ?? 'No description was recorded.'}
          </p>
          <p className={styles.cardMeta}>
            raised {incidentTime(incident.reportedAt)} · respond by{' '}
            {incident.respondBy === null ? 'not set' : incidentTime(incident.respondBy)}
            {remaining === null ? '' : ` · ${remaining} left`}
          </p>

          <div className={styles.actions}>
            {awaitingTakeOver(incident.status) && (
              <>
                <button type="button" disabled={busy} onClick={() => run(() => claimIncident(incident.id))}>
                  Take over
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => escalateIncident(incident.id, 'passed on by the manager'))}
                >
                  Escalate
                </button>
              </>
            )}
            {beingHandled(incident.status) && (
              <>
                <button type="button" disabled={busy} onClick={() => setPanel('contact')}>
                  Contact family
                </button>
                <button
                  type="button"
                  disabled={busy || !suggestedPlaybookCode}
                  onClick={() =>
                    run(() => applyPlaybook(incident.id, suggestedPlaybookCode as string))
                  }
                >
                  Apply playbook
                </button>
                <button type="button" disabled={busy} onClick={() => setPanel('severity')}>
                  Change severity
                </button>
                <button type="button" disabled={busy} onClick={() => setPanel('resolve')}>
                  Resolve
                </button>
              </>
            )}
          </div>

          {actionError !== null && (
            <p className={styles.inlineError} role="alert">
              {problemDetail(actionError)}
            </p>
          )}

          {panel === 'contact' && (
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault()
                run(
                  async () => {
                    const result = await recordContactAttempt(incident.id, {
                      channel,
                      outcome,
                      note: contactNote,
                    })
                    setContactResult(result)
                  },
                  () => setPanel(null),
                )
              }}
            >
              <h2 className={styles.panelHeading}>Record a call to the family</h2>
              <label>
                Channel
                <select
                  value={channel}
                  onChange={(event) => setChannel(event.target.value as ContactChannel)}
                >
                  <option value="PHONE">Telephone</option>
                  <option value="PUSH">Push notification</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </label>
              <label>
                Outcome
                <select
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as ContactOutcome)}
                >
                  <option value="REACHED">Reached the family</option>
                  <option value="NOT_REACHED">Could not reach them</option>
                </select>
              </label>
              <label>
                Note
                <textarea
                  value={contactNote}
                  onChange={(event) => setContactNote(event.target.value)}
                  rows={2}
                />
              </label>
              <div className={styles.panelActions}>
                <button type="submit" disabled={busy}>
                  Record contact attempt
                </button>
                <button type="button" className={styles.textButton} onClick={() => setPanel(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {panel === 'severity' && (
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault()
                run(() => changeSeverity(incident.id, severity, severityReason), () =>
                  setPanel(null),
                )
              }}
            >
              <h2 className={styles.panelHeading}>Change the severity</h2>
              <label>
                Severity
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}
                >
                  <option value="HIGH">{severityLabels.HIGH}</option>
                  <option value="MEDIUM">{severityLabels.MEDIUM}</option>
                  <option value="LOW">{severityLabels.LOW}</option>
                </select>
              </label>
              <label>
                Reason
                <textarea
                  value={severityReason}
                  onChange={(event) => setSeverityReason(event.target.value)}
                  rows={2}
                />
              </label>
              <div className={styles.panelActions}>
                <button type="submit" disabled={busy}>
                  Save new severity
                </button>
                <button type="button" className={styles.textButton} onClick={() => setPanel(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {panel === 'resolve' && (
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault()
                run(
                  () =>
                    resolveIncident(incident.id, {
                      resolutionNote,
                      outcome: resolutionOutcome,
                    }),
                  () => setPanel(null),
                )
              }}
            >
              <h2 className={styles.panelHeading}>Close the incident</h2>
              <label>
                How it ended
                <select
                  value={resolutionOutcome}
                  onChange={(event) =>
                    setResolutionOutcome(event.target.value as ResolutionOutcome)
                  }
                >
                  <option value="HANDLED_ON_SITE">Handled on site</option>
                  <option value="REFERRED_TO_MEDICAL_CARE">Referred to medical care</option>
                  <option value="FALSE_ALARM">False alarm</option>
                </select>
              </label>
              <label>
                Resolution note
                <textarea
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  rows={3}
                />
              </label>
              <div className={styles.panelActions}>
                <button type="submit" disabled={busy}>
                  Close incident
                </button>
                <button type="button" className={styles.textButton} onClick={() => setPanel(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Alternative 4a: the family could not be reached, so the standard
              response is offered straight away rather than after a wait. */}
          {fallback && (
            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>
                Family not reached — fall back on {fallback.code}
              </h2>
              <p className={styles.cardMeta}>{fallback.title}</p>
              <ol className={styles.steps}>
                {fallback.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className={styles.panelActions}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() => applyPlaybook(incident.id, fallback.code), () =>
                      setContactResult(null),
                    )
                  }
                >
                  Apply {fallback.code}
                </button>
              </div>
            </section>
          )}

          <h2 className={styles.sectionHeading}>Audit timeline — every entry immutable</h2>
          <ol className={styles.timeline}>
            {timeline.map((entry, index) => (
              <li key={`${entry.occurredAt}-${entry.action}-${index}`} className={styles.timelineRow}>
                <span className={styles.timelineTime}>{incidentClock(entry.occurredAt)}</span>
                <span className={styles.timelineMark} aria-hidden="true" />
                <span>
                  <span className={styles.timelineTitle}>{timelineTitle(entry.action)}</span>
                  <span className={styles.timelineDetail}>
                    {entry.detail ?? ''}
                    {entry.actor ? ` · ${entry.actor}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <aside className={styles.side}>
          <section className={styles.sidePanel}>
            <h2 className={styles.sectionHeading}>Escalation chain</h2>
            {chain.resource.status === 'loading' && <p className={styles.note}>Loading…</p>}
            {chain.resource.status === 'error' && (
              <ExceptionFeedback error={chain.resource.error} onRetry={chain.refresh} />
            )}
            {chain.resource.status === 'success' && (
              <>
                <p className={styles.cardMeta}>
                  {chain.resource.data.assembledFrom ?? 'assembled at run time'}
                </p>
                <ol className={styles.levels}>
                  {chain.resource.data.levels.map((level) => (
                    <li
                      key={level.position}
                      className={level.state === 'CURRENT' ? styles.levelCurrent : styles.level}
                    >
                      <span className={styles.levelTier}>
                        {level.position}. {level.tier}
                      </span>
                      <span className={styles.levelName}>
                        {level.responderName ?? 'nobody available'}
                      </span>
                      <span className={styles.levelMeta}>
                        {level.countdownMinutes} min · {escalationStateLabels[level.state]}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <section className={styles.sidePanel}>
            <h2 className={styles.sectionHeading}>Suggested playbook</h2>
            {suggested ? (
              <>
                <p className={styles.cardMeta}>
                  {suggested.code} — {suggested.title}
                </p>
                <ol className={styles.steps}>
                  {suggested.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </>
            ) : (
              <p className={styles.note}>No standard playbook covers this category.</p>
            )}
          </section>

          {/* The elder's record belongs to another module's API; this shows only
              what the incident itself carries. */}
          <section className={styles.sidePanel}>
            <h2 className={styles.sectionHeading}>Elder</h2>
            <p className={styles.cardMeta}>Elder #{incident.elderId}</p>
            <p className={styles.cardMeta}>{incident.locationText ?? 'No address on the incident'}</p>
          </section>

          <Link className={styles.linkButton} to="/manager/exceptions">
            Back to the queue
          </Link>
        </aside>
      </div>
    </ManagerShell>
  )
}

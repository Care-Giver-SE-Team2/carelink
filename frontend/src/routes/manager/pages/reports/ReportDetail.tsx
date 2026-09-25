import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { appendAmendment } from '../../../../features/reports/api'
import {
  audienceLabels,
  audienceNotes,
  generatedByLabels,
  problemDetail,
  reportPeriod,
  reportTime,
  sectionLines,
  statusLabels,
} from '../../../../features/reports/presentation'
import { useReportDetail } from '../../../../features/reports/useReportQueries'
import { ManagerShell } from '../../components/ManagerShell'
import { ReportFeedback } from './ReportFeedback'
import styles from './Reports.module.css'

/**
 * UC-MG07 — one filed report, as its reader will see it.
 *
 * The sections come in the order every reader's version shares, with the gaps
 * named at the top when the period's data was not complete, the disclaimer at
 * the bottom when this reader gets one, and the corrections under that.
 *
 * There is nothing here to edit or delete, because a filed report cannot be
 * either. The only thing a manager can do is append a correction; the report
 * is read again afterwards rather than having the note pushed onto it here,
 * so what is on the screen is what is on file.
 */
export default function ReportDetail() {
  const { id } = useParams()
  const reportId = Number(id)
  const valid = Number.isSafeInteger(reportId) && reportId > 0

  const detail = useReportDetail(reportId)

  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [amendError, setAmendError] = useState<unknown>(null)

  if (!valid) {
    return (
      <ManagerShell>
        <div className={styles.page}>
          <p className={styles.note}>That is not a report number.</p>
          <Link className={styles.linkButton} to="/manager/reports">
            Back to reports
          </Link>
        </div>
      </ManagerShell>
    )
  }

  if (detail.resource.status === 'loading') {
    return (
      <ManagerShell headerContext={<>Reports / RPT-{reportId}</>}>
        <div className={styles.page}>
          <p className={styles.note}>Loading the report…</p>
        </div>
      </ManagerShell>
    )
  }

  if (detail.resource.status === 'error') {
    return (
      <ManagerShell headerContext={<>Reports / RPT-{reportId}</>}>
        <div className={styles.page}>
          <ReportFeedback error={detail.resource.error} onRetry={detail.refresh} />
          <Link className={styles.linkButton} to="/manager/reports">
            Back to reports
          </Link>
        </div>
      </ManagerShell>
    )
  }

  const report = detail.resource.data

  async function append(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setAmendError(null)
    try {
      await appendAmendment(report.id, note)
      setNote('')
      detail.refresh()
    } catch (error) {
      setAmendError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ManagerShell
      headerContext={<>Reports / RPT-{report.id}</>}
      headerRight={
        <>
          <span className={styles.readerTag}>{audienceLabels[report.audience]}</span>
          <span className={styles.statusTag}>{statusLabels[report.status]}</span>
          <span className={styles.headerNote}>filed {reportTime(report.createdAt)}</span>
        </>
      }
    >
      <div className={styles.page}>
        <div>
          <h1>
            {audienceLabels[report.audience]} report — Elder #{report.elderId}
          </h1>
          <p className={styles.meta}>
            {reportPeriod(report.periodStart, report.periodEnd)} · {generatedByLabels[report.generatedBy]}
          </p>
          <p className={styles.readerNote}>{audienceNotes[report.audience]}</p>
        </div>

        {!report.dataComplete && (
          <section className={styles.incomplete} aria-label="Data incomplete">
            <h2>Data incomplete</h2>
            <ul>
              {report.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {report.sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            {sectionLines(section.body).map((line, index) => (
              <p key={`${section.title}-${index}`} className={line.nested ? styles.subLine : styles.line}>
                {line.text}
              </p>
            ))}
          </section>
        ))}

        {report.disclaimer && <p className={styles.disclaimer}>{report.disclaimer}</p>}

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Corrections — appended, never edited</h2>
          {report.amendments.length === 0 ? (
            <p className={styles.note}>No corrections have been appended.</p>
          ) : (
            <ol className={styles.amendments}>
              {report.amendments.map((amendment) => (
                <li key={amendment.id} className={styles.amendment}>
                  <span className={styles.amendmentMeta}>
                    {reportTime(amendment.createdAt)} · user #{amendment.authorUserId}
                  </span>
                  <span className={styles.amendmentNote}>{amendment.note}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <form className={styles.panel} onSubmit={append}>
          <label>
            Correction
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </label>
          <div className={styles.panelActions}>
            <button type="submit" disabled={busy}>
              {busy ? 'Appending…' : 'Append correction'}
            </button>
          </div>
        </form>

        {amendError !== null && (
          <p className={styles.inlineError} role="alert">
            {problemDetail(amendError)}
          </p>
        )}

        <Link className={styles.linkButton} to="/manager/reports">
          Back to reports
        </Link>
      </div>
    </ManagerShell>
  )
}

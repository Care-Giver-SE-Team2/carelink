import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFamilyWeeklySummary } from '../../../features/reports/useFamilyWeeklySummary'
import { generatedByLabels, reportPeriod, statusLabels } from '../../../features/reports/presentation'
import { isScheduleDate, scheduleDateBounds, shiftDays, singaporeToday, weekStart } from '../../../features/schedule/presentation'
import { ReportCompleteness, ReportCorrections } from './ReportNotes'
import { ReportListFeedback } from './ReportListFeedback'
import styles from './FamilyReports.module.css'

/** Reads an exact Singapore calendar week alongside its report's care notes.
 * @author Wang Zhili
 */
export function FamilyWeeklySummaryPage() {
  const [params, setParams] = useSearchParams()
  const [defaultWeek] = useState(() => shiftDays(weekStart(singaporeToday()), -7))
  const requestedWeek = params.get('weekStart') ?? ''
  const week = isScheduleDate(requestedWeek) ? weekStart(requestedWeek) : defaultWeek
  const candidateElder = Number(params.get('elderId'))
  const elderId = Number.isSafeInteger(candidateElder) && candidateElder > 0 ? candidateElder : null
  const candidatePage = Number(params.get('page'))
  const page = Number.isInteger(candidatePage) && candidatePage > 0 && candidatePage <= 2147483647 ? candidatePage : 0
  const { resource, refresh } = useFamilyWeeklySummary({ elderId, week })
  const data = resource.status === 'success' ? resource.data : null
  const weekly = data?.weekly
  const selectedElderId = data?.selectedElderId ?? elderId
  const listParams = new URLSearchParams()
  if (selectedElderId !== null) listParams.set('elderId', String(selectedElderId))
  if (page > 0) listParams.set('page', String(page))
  const detailParams = new URLSearchParams(listParams)
  detailParams.set('weekStart', week)
  const selectWeek = (date: string, nextElder = selectedElderId, nextPage = page) => {
    if (!isScheduleDate(date)) return
    const next = new URLSearchParams()
    if (nextElder !== null) next.set('elderId', String(nextElder))
    if (nextPage > 0) next.set('page', String(nextPage))
    next.set('weekStart', weekStart(date))
    setParams(next)
  }
  const reload = () => {
    selectWeek(week)
    refresh()
  }
  const resetAccess = () => {
    selectWeek(week, null, 0)
    refresh()
  }

  return <div className={styles.reports}>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>YOUR FAMILY'S CARE</p>
      <h1>Weekly care summary</h1>
      <p className={styles.intro}>Read the care recorded for one week, with any missing records and corrections.</p>
      <Link className={styles.readLink} to={`/family/reports${listParams.size ? `?${listParams}` : ''}`}>All reports</Link>
    </section>
    <section className={styles.weekPanel} aria-label="Choose a week">
      <h2>{reportPeriod(week, shiftDays(week, 6))}</h2>
      <div className={styles.datePicker}>
        <label htmlFor="summary-date">Choose a date</label>
        <input id="summary-date" type="date" min={scheduleDateBounds.min} max={scheduleDateBounds.max}
          value={week} aria-describedby="summary-date-help"
          onChange={(event) => { if (event.currentTarget.validity.valid) selectWeek(event.currentTarget.value) }} />
        <p id="summary-date-help">Choose any date to read its Monday–Sunday week.</p>
      </div>
      <div className={styles.weekControls}>
        <button disabled={week <= scheduleDateBounds.min} onClick={() => selectWeek(shiftDays(week, -7))}>Previous week</button>
        <button onClick={() => selectWeek(singaporeToday())}>This week</button>
        <button disabled={week >= weekStart(scheduleDateBounds.max)} onClick={() => selectWeek(shiftDays(week, 7))}>Next week</button>
      </div>
      <p className={styles.timestamp}>Weeks follow Singapore time.</p>
    </section>
    {resource.status === 'loading' && <p className={styles.loading} role="status">Loading your weekly summary…</p>}
    {resource.status === 'error' && <ReportListFeedback error={resource.error} onRetry={reload} onResetAccess={resetAccess} />}
    {data && <>
      <div className={styles.toolbar}>
        {data.elders.length > 0 && <div className={styles.elderPicker}>
          <label htmlFor="summary-elder">Care for</label>
          <select id="summary-elder" value={data.selectedElderId ?? ''} onChange={(event) => selectWeek(week, Number(event.target.value), 0)}>
            {data.elders.map((elder) => <option key={elder.id} value={elder.id}>{elder.fullName}</option>)}
          </select>
        </div>}
        <button onClick={reload}>Refresh</button>
      </div>
      {data.elders.length === 0 ? <section className={styles.state}>
        <h2>No linked elders yet</h2>
        <p>Your care reports will be available once a family binding is active.</p>
        <Link to="/family/intake">View my applications</Link>
      </section> : !weekly && <section className={styles.state}>
        <h2>No report for this week</h2>
        <p>No published or archived report is available for the selected week. Choose another week or check again later.</p>
      </section>}
      {weekly && <article aria-label="Weekly care summary" className={styles.cards}>
        <section className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.reference}>REPORT #{weekly.summary.reportId}</span>
            <span className={styles.badge} data-status={weekly.detail.status}>{statusLabels[weekly.detail.status]}</span>
          </div>
          <p className={styles.source}>{generatedByLabels[weekly.summary.generatedBy]}</p>
          <ReportCompleteness report={weekly.detail} />
          <p className={styles.body} aria-label="Summary text">{weekly.summary.summaryText}</p>
          <Link className={styles.readLink} to={`/family/reports/${weekly.summary.reportId}?${detailParams}`}>Read full report</Link>
        </section>
        <ReportCorrections amendments={weekly.detail.amendments} />
        <p className={styles.disclaimer}>{weekly.summary.disclaimer}</p>
        <p className={styles.timestamp}>Dates and times are shown in Singapore time.</p>
      </article>}
    </>}
  </div>
}

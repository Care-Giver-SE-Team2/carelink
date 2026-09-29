import { Link, useSearchParams } from 'react-router-dom'
import { useFamilyReportPage } from '../../../features/reports/useFamilyReportPage'
import { generatedByLabels, reportPeriod, statusLabels } from '../../../features/reports/presentation'
import { ReportListFeedback } from './ReportListFeedback'
import styles from './FamilyReports.module.css'

/**
 * Shows family report metadata for the selected elder, with server-side pagination.
 * @author Wang Zhili
 */
export function FamilyReportListPage() {
  const [params, setParams] = useSearchParams()
  const candidateElder = Number(params.get('elderId'))
  const elderId = Number.isSafeInteger(candidateElder) && candidateElder > 0 ? candidateElder : null
  const candidatePage = Number(params.get('page') ?? 0)
  const page = Number.isInteger(candidatePage) && candidatePage >= 0 && candidatePage <= 2147483647 ? candidatePage : 0
  const { resource, refresh } = useFamilyReportPage({ elderId, page })
  const data = resource.status === 'success' ? resource.data : null
  const reports = data?.reports
  const pages = reports ? Math.ceil(reports.totalElements / reports.size) : 0
  const changePage = (nextPage: number, nextElder = data?.selectedElderId ?? elderId) => {
    const next = new URLSearchParams()
    if (nextElder !== null) next.set('elderId', String(nextElder))
    if (nextPage > 0) next.set('page', String(nextPage))
    setParams(next)
  }
  const resetAccess = () => {
    setParams({})
    refresh()
  }
  const reload = () => {
    changePage(page)
    refresh()
  }

  return (
    <div className={styles.reports}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>YOUR FAMILY'S CARE</p>
        <h1>Care reports</h1>
        <p>Follow the care recorded for your loved one, one report at a time.</p>
      </section>
      {resource.status === 'loading' && <p className={styles.loading} role="status">Loading your reports…</p>}
      {resource.status === 'error' && <ReportListFeedback error={resource.error} onRetry={refresh} onResetAccess={resetAccess} />}
      {data && <>
        <div className={styles.toolbar}>
          {data.elders.length > 0 && <div className={styles.elderPicker}>
            <label htmlFor="report-elder">Care for</label>
            <select id="report-elder" value={data.selectedElderId ?? ''}
              onChange={(event) => changePage(0, Number(event.target.value))}>
              {data.elders.map((elder) => <option key={elder.id} value={elder.id}>{elder.fullName}</option>)}
            </select>
          </div>}
          <button onClick={reload}>Refresh</button>
        </div>
        {data.elders.length === 0 && <section className={styles.state}>
          <h2>No linked elders yet</h2>
          <p>Your care reports will be available once a family binding is active. Contact your care team if you need help with access.</p>
          <Link to="/family/intake">View my applications</Link>
        </section>}
        {reports && <>
          <div className={styles.summary}>
            <strong>{reports.totalElements} {reports.totalElements === 1 ? 'report' : 'reports'}</strong>
            {reports.items.length > 0 && <span>Showing {reports.page * reports.size + 1}–{reports.page * reports.size + reports.items.length} of {reports.totalElements}</span>}
          </div>
          {reports.items.length === 0 ? <section className={styles.state}>
            <h2>{page > 0 ? 'No reports on this page' : 'No care reports yet'}</h2>
            <p>{page > 0 ? 'Return to the first page to see the available reports.' : 'Published and archived care reports for this elder will appear here.'}</p>
            {page > 0 && <button onClick={() => changePage(0)}>Back to first page</button>}
          </section> : <ol className={styles.cards} aria-label="Care reports">
            {reports.items.map((report) => <li className={styles.card} key={report.id}>
              <div className={styles.cardTop}>
                <span className={styles.reference}>REPORT #{report.id}</span>
                <span className={styles.badge} data-status={report.status}>{statusLabels[report.status]}</span>
              </div>
              <h2>{reportPeriod(report.periodStart, report.periodEnd)}</h2>
              <p className={styles.source}>{generatedByLabels[report.generatedBy]}</p>
              <div className={styles.completeness} data-complete={report.dataComplete}>
                <p>{report.dataComplete ? 'Records complete' : 'Some care records are missing'}</p>
                {report.missingItems.length > 0 && <ul>{report.missingItems.map((item, index) => <li key={index}>{item}</li>)}</ul>}
              </div>
            </li>)}
          </ol>}
          {reports.items.length > 0 && pages > 1 && <nav className={styles.pagination} aria-label="Report pages">
            <button onClick={() => changePage(reports.page - 1)} disabled={reports.page === 0}>Previous page</button>
            <span>Page {reports.page + 1} of {pages}</span>
            <button onClick={() => changePage(reports.page + 1)} disabled={reports.page + 1 >= pages}>Next page</button>
          </nav>}
        </>}
      </>}
    </div>
  )
}

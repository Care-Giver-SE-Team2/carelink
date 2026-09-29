import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useFamilyReport } from '../../../features/reports/useFamilyReport'
import { familyReportTime, generatedByLabels, reportPeriod, statusLabels } from '../../../features/reports/presentation'
import { ReportDetailFeedback } from './ReportDetailFeedback'
import styles from './FamilyReports.module.css'

/** Reads the filed family report without rewriting its sections or corrections.
 * @author Wang Zhili
 */
export function FamilyReportDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const backParams = new URLSearchParams()
  const elderId = Number(params.get('elderId'))
  const page = Number(params.get('page'))
  if (Number.isSafeInteger(elderId) && elderId > 0) backParams.set('elderId', String(elderId))
  if (Number.isInteger(page) && page > 0 && page <= 2147483647) backParams.set('page', String(page))
  const { resource, refresh } = useFamilyReport(id)
  const report = resource.status === 'success' ? resource.data : null

  return <div className={styles.reports}>
    <div className={styles.detailNav}>
      <Link className={styles.backLink} to={`/family/reports${backParams.size ? `?${backParams}` : ''}`}>Back to reports</Link>
      {report && <button onClick={refresh}>Refresh</button>}
    </div>
    {resource.status === 'loading' && <p className={styles.loading} role="status">Loading your report…</p>}
    {resource.status === 'error' && <ReportDetailFeedback error={resource.error} onRetry={refresh} />}
    {report && <article aria-labelledby="report-period">
      <header className={styles.hero}>
        <div className={styles.cardTop}>
          <p className={styles.reference}>REPORT #{report.id}</p>
          <span className={styles.badge} data-status={report.status}>{statusLabels[report.status]}</span>
        </div>
        <h1 id="report-period">{reportPeriod(report.periodStart, report.periodEnd)}</h1>
        <p>Elder profile #{report.elderId}</p>
        <p className={styles.source}>{generatedByLabels[report.generatedBy]}</p>
        {report.createdAt && <p className={styles.timestamp}>Created <time dateTime={report.createdAt}>{familyReportTime(report.createdAt)}</time></p>}
        {report.archivedAt && <p className={styles.timestamp}>Archived on <time dateTime={report.archivedAt}>{familyReportTime(report.archivedAt)}</time></p>}
        <div className={styles.completeness} data-complete={report.dataComplete}>
          <p>{report.dataComplete ? 'Records complete' : 'Some care records are missing'}</p>
          {report.missingItems.length > 0 && <ul>{report.missingItems.map((item, index) => <li key={index}>{item}</li>)}</ul>}
        </div>
      </header>
      <div className={styles.cards}>
        {report.sections.length === 0 && <p className={styles.card}>No report sections were recorded.</p>}
        {report.sections.map((section, index) => <section className={styles.card} key={index} aria-labelledby={`report-section-${index}`}>
          <h2 id={`report-section-${index}`}>{section.title}</h2>
          <p className={styles.body}>{section.body}</p>
        </section>)}
        <section className={styles.card} aria-labelledby="report-corrections">
          <h2 id="report-corrections">Corrections</h2>
          {report.amendments.length === 0 && <p className={styles.body}>No corrections have been added.</p>}
          {report.amendments.map((amendment) => <div className={styles.correction} key={amendment.id}>
            <time className={styles.timestamp} dateTime={amendment.createdAt}>{familyReportTime(amendment.createdAt)}</time>
            <p className={styles.body}>{amendment.note}</p>
          </div>)}
        </section>
      </div>
      <p className={styles.disclaimer}>{report.disclaimer}</p>
      <p className={styles.timestamp}>Times are shown in Singapore time.</p>
    </article>}
  </div>
}

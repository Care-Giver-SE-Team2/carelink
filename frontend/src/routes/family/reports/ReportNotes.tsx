import type { FamilyReportDetail } from '../../../features/reports/types'
import { familyReportTime } from '../../../features/reports/presentation'
import styles from './FamilyReports.module.css'

/** The same completeness notice accompanies both the report and weekly summary.
 * @author Wang Zhili
 */
export function ReportCompleteness({ report }: { report: Pick<FamilyReportDetail, 'dataComplete' | 'missingItems'> }) {
  return <div className={styles.completeness} data-complete={report.dataComplete}>
    <p>{report.dataComplete ? 'Records complete' : 'Some care records are missing'}</p>
    {report.missingItems.length > 0 && <ul>{report.missingItems.map((item, index) => <li key={index}>{item}</li>)}</ul>}
  </div>
}

/** Corrections remain separate from the original report or summary text.
 * @author Wang Zhili
 */
export function ReportCorrections({ amendments }: { amendments: FamilyReportDetail['amendments'] }) {
  return <section className={styles.card} aria-labelledby="report-corrections">
    <h2 id="report-corrections">Corrections</h2>
    {amendments.length === 0 && <p className={styles.body}>No corrections have been added.</p>}
    {amendments.map((amendment) => <div className={styles.correction} key={amendment.id}>
      <time className={styles.timestamp} dateTime={amendment.createdAt}>{familyReportTime(amendment.createdAt)}</time>
      <p className={styles.body}>{amendment.note}</p>
    </div>)}
  </section>
}

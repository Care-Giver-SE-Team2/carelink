import { useId } from 'react'
import type { ReportFigure, ReportSection, ReportSeries } from '../../../features/reports/types'
import { figureText, hasReportVisuals, reportDay, reportNumber, sparkline } from '../../../features/reports/presentation'
import styles from './FamilyReportContent.module.css'

function Figures({ figures }: { figures: ReportFigure[] }) {
  return <dl className={styles.figures}>
    {figures.map((figure) => <div key={figure.key}>
      <dt>{figure.label}</dt>
      <dd>{figureText(figure)}</dd>
    </div>)}
  </dl>
}

/** Keep every saved word. Delimiters only separate presentation; unfamiliar lines stay intact. */
function RecordLines({ body, sectionKey }: { body: string; sectionKey: string }) {
  return <div className={styles.records}>
    {body.split('\n').filter((line) => line.trim()).map((line, index) => {
      const parts = line.split(' · ')
      const visit = sectionKey === 'service-completion' && parts.length === 5
        && /^(scheduled|arrived|in progress|completed|verified|auto.closed|cancelled|exception)$/.test(parts[3])
      if (visit) return <div className={styles.visit} key={index}>
        <div><span className={styles.date}>{parts[0]}</span><strong>{parts[1]}</strong>
          <p>{parts[2]} · {parts[4]}</p></div>
        <span className={styles.status} data-status={parts[3]}>{parts[3]}</span>
      </div>
      return <p className={styles.record} key={index} data-nested={line.startsWith('  ')}>
        {parts.length > 1 ? <><span className={styles.date}>{parts[0]}</span><span>{parts.slice(1).join(' · ')}</span></> : line}
      </p>
    })}
  </div>
}

function VitalTrend({ series }: { series: ReportSeries }) {
  const shape = sparkline(series.points, 240, 64, 8)
  if (!shape) return null
  const range = shape.min === shape.max ? reportNumber(shape.min) : `${reportNumber(shape.min)}–${reportNumber(shape.max)}`
  const flagged = series.points.filter((point) => point.flagged).length
  const caption = `${series.label}: daily range ${range}${series.unit ? ` ${series.unit}` : ''}; ${series.points.length} recorded ${series.points.length === 1 ? 'day' : 'days'}; ${flagged} flagged ${flagged === 1 ? 'day' : 'days'}`
  return <div className={styles.vital}>
    <div className={styles.vitalHeading}><h3>{series.label}</h3><p>{range} <span>{series.unit}</span></p></div>
    <svg viewBox="0 0 240 64" role="img" aria-label={caption}>
      <title>{caption}</title>
      <path d={shape.line} className={styles.trend} />
      {shape.points.map((point, index) => <g key={index} className={styles.point} data-flagged={point.flagged}>
        <title>{`${reportDay(series.points[index].at)}: ${series.points[index].low}–${series.points[index].high} ${series.unit ?? ''}${point.flagged ? ' · flagged at recording' : ''}`}</title>
        <line x1={point.x} x2={point.x} y1={point.low} y2={point.high} />
        <circle cx={point.x} cy={point.mid} r="3" />
      </g>)}
    </svg>
    <div className={styles.dates}><span>{reportDay(series.points[0].at)}</span>
      {series.points.length > 1 && <span>{reportDay(series.points.at(-1)!.at)}</span>}</div>
    {flagged > 0 && <p className={styles.flagged}>{flagged} {flagged === 1 ? 'day' : 'days'} with readings flagged at recording</p>}
    <details className={styles.readings}><summary>Daily ranges for {series.label}</summary>
      <ul>{series.points.map((point, index) => <li key={index}>
        <time dateTime={point.at}>{reportDay(point.at)}</time>: {reportNumber(point.low)}{point.low !== point.high && `–${reportNumber(point.high)}`} {series.unit}
        {point.flagged && ' · flagged at recording'}
      </li>)}</ul>
    </details>
  </div>
}

/** Shared by FM04 detail and weekly reading; all values come from the same authorized saved report. */
export function FamilyReportContent({ sections }: { sections: ReportSection[] }) {
  const id = useId()
  const rich = hasReportVisuals(sections)
  const overview = sections.find((section) => section.key === 'overview' || section.title === 'Overview')
  const readingOrder = ['Overview', 'Vital signs', 'Services', 'Service completion', 'Observations', 'Incidents', 'Ratings and spot checks']
  const ordered = rich ? [...sections].sort((a, b) => readingOrder.indexOf(a.title) - readingOrder.indexOf(b.title)) : sections
  return <div className={styles.content}>
    {!!overview?.figures?.length && <Figures figures={overview.figures} />}
    {sections.length === 0 && <p className={styles.section}>No report sections were recorded.</p>}
    {ordered.map((section, index) => {
      const key = section.key ?? section.title.toLowerCase().replaceAll(' ', '-')
      const title = rich ? ({ overview: 'This week', 'service-completion': 'Visits', observations: 'Caregiver notes' }[key] ?? section.title) : section.title
      return <section className={styles.section} key={index} aria-labelledby={`${id}-${index}`}>
        <div className={styles.sectionHeading}><h2 id={`${id}-${index}`}>{title}</h2>
          {!!section.series?.length && <span>Daily ranges</span>}</div>
        {key !== 'overview' && !!section.figures?.length && <Figures figures={section.figures} />}
        {!!section.series?.length && <div className={styles.vitals}>
          {section.series.map((series) => <VitalTrend key={series.key} series={series} />)}
        </div>}
        {rich && key !== 'overview' ? <RecordLines body={section.body} sectionKey={key} /> : <p className={styles.legacyBody}>{section.body}</p>}
      </section>
    })}
  </div>
}

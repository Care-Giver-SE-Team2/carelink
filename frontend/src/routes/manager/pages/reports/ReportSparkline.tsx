import { reportNumber, sparkline } from '../../../../features/reports/presentation'
import type { ReportSeries } from '../../../../features/reports/types'
import styles from './Reports.module.css'

const WIDTH = 168
const HEIGHT = 40

/**
 * One metric of the vital signs section as a small chart beside its text.
 *
 * Points are spaced evenly in the order they were taken, which is what a
 * reader compares - this reading against the last - rather than placed on a
 * clock. A point that is a day's range (the family's version) is drawn as a
 * bar from its lowest to its highest reading; a flagged point is marked. The
 * chart says no more than the text beside it: the family's has a point per
 * day, never the readings.
 *
 * @author Wang Ziyu
 */
export function ReportSparkline({ series }: { series: ReportSeries }) {
  const shape = sparkline(series.points, WIDTH, HEIGHT)
  if (!shape) return null

  const unit = series.unit ? ' ' + series.unit : ''
  const range =
    shape.min === shape.max ? reportNumber(shape.min) : `${reportNumber(shape.min)}–${reportNumber(shape.max)}`
  const flagged = series.points.filter((point) => point.flagged).length
  const label =
    `${series.label}: ${series.points.length} ${series.points.length === 1 ? 'point' : 'points'}, ${range}${unit}` +
    (flagged ? `, ${flagged} out of range` : '')

  return (
    <figure className={styles.spark}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <path d={shape.line} className={styles.sparkLine} />
        {shape.points.map((point, index) => (
          <g key={series.points[index].at + ':' + index}>
            {point.low !== point.high && (
              <line x1={point.x} x2={point.x} y1={point.low} y2={point.high} className={styles.sparkRange} />
            )}
            <circle
              cx={point.x}
              cy={point.mid}
              r={point.flagged ? 3 : 2}
              className={point.flagged ? styles.sparkFlag : styles.sparkDot}
            />
          </g>
        ))}
      </svg>
      <figcaption className={styles.sparkCaption}>
        {series.label}
        <span className={styles.sparkRangeText}>
          {range}
          {unit}
        </span>
      </figcaption>
    </figure>
  )
}

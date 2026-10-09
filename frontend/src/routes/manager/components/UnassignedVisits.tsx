import { Button, ListRow, SectionHeader } from '../../../shared/components/ui'
import type { OpenVisit } from '../data/roster'
import styles from './UnassignedVisits.module.css'

/**
 * The visits in view that nobody holds yet — an extra service a family approved, or a care
 * plan visit with no primary caregiver — each with an Assign action. Draws nothing when every
 * visit has somebody.
 */
export function UnassignedVisits({ visits, onAssign }: { visits: OpenVisit[]; onAssign: (visit: OpenVisit) => void }) {
  if (visits.length === 0) return null
  return (
    <section className={styles.section} aria-labelledby="unassigned-visits-title">
      <SectionHeader
        id="unassigned-visits-title"
        title="Unassigned visits"
        meta={`${visits.length} need a caregiver`}
      />
      <div role="listbox" aria-label="Unassigned visits" className={styles.list}>
        {visits.map((visit) => (
          <ListRow
            key={visit.id}
            title={`${visit.elderName} · ${visit.service}`}
            meta={visit.when}
            trailing={
              <Button aria-label={`Assign ${visit.elderName} ${visit.service}`} onClick={() => onAssign(visit)}>
                Assign
              </Button>
            }
          />
        ))}
      </div>
    </section>
  )
}

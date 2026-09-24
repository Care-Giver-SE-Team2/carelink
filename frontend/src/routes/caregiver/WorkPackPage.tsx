import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getWorkPack } from '../../features/caregiver/api'
import { useCaregiverQuery } from '../../features/caregiver/useCaregiverQuery'
import { QueryError } from './components'
import { titleCase, visitTime } from './format'
import styles from './Caregiver.module.css'

export default function WorkPackPage() {
  const { visitId = '' } = useParams()
  const [params] = useSearchParams()
  const backParams = new URLSearchParams()
  for (const name of ['dateFrom', 'dateTo']) if (params.has(name)) backParams.set(name, params.get(name)!)
  const back = '/caregiver' + (backParams.size ? '?' + backParams.toString() : '')
  return <div className={styles.page}><Link className={styles.back} to={back}>← My schedule</Link>
    {!/^[1-9]\d*$/.test(visitId) ? <div role="alert" className={styles.error}>Visit not found</div> : <WorkPack id={visitId} />}
  </div>
}
function WorkPack({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => getWorkPack(id, signal), [id])
  const { result, reload } = useCaregiverQuery(id, load)
  if (result.status === 'loading') return <p role="status">Loading assigned work pack…</p>
  if (result.status === 'error') return <QueryError error={result.error} retry={reload} />
  const pack = result.data
  return <>
    <p className={styles.eyebrow}>Assigned visit · #{pack.visit.id}</p>
    <div className={styles.heading}><div><h1>{pack.elder.preferredName}</h1><p className={styles.muted}>{titleCase(pack.visit.serviceType)}</p></div><button className={styles.button} onClick={reload}>Refresh</button></div>
    <div className={styles.readOnly}>Read-only work pack. Review your assigned care instructions. Check-in and task submission will be available in the next delivery.</div>
    <section className={styles.card} aria-label="Visit details"><div className={styles.cardTop}><strong>Visit details</strong><span className={styles.badge}>{titleCase(pack.visit.status)}</span></div>
      <dl className={styles.details}>
        <div><dt>Starts · Singapore time</dt><dd>{visitTime(pack.visit.scheduledStart)}</dd></div>
        <div><dt>Ends · Singapore time</dt><dd>{pack.visit.scheduledEnd ? visitTime(pack.visit.scheduledEnd) : 'Not provided'}</dd></div>
        <div><dt>Service address</dt><dd>{pack.elder.serviceAddress || 'Not provided'}</dd></div>
        <div><dt>Sector</dt><dd>{pack.elder.postalSector || 'Not provided'}</dd></div>
        <div><dt>Languages</dt><dd>{pack.elder.languageNeeds.join(', ') || 'Not provided'}</dd></div>
        <div><dt>Access notes</dt><dd>{pack.elder.accessNotes || 'Not provided'}</dd></div>
        <div><dt>Emergency notes</dt><dd>{pack.elder.emergencyNotes || 'Not provided'}</dd></div>
      </dl>
    </section>
    <section className={styles.card} aria-label="Assigned care plan"><p className={styles.eyebrow}>Assigned care plan</p>
      <h2>{pack.carePlanVersion != null ? 'Version ' + pack.carePlanVersion : 'No plan linked'}</h2>
      <p className={styles.muted}>{pack.carePlanId != null ? 'Plan #' + pack.carePlanId + ' · ' : ''}This is the version assigned to this visit.</p>
      {pack.serviceInstructions.length > 0 && <ul>{pack.serviceInstructions.map((instruction, i) => <li key={i}>{instruction}</li>)}</ul>}
    </section>
    <section className={styles.card} aria-label="Visit tasks"><h2>Tasks · {pack.tasks.length}</h2>
      {pack.tasks.length === 0 && <p className={styles.muted}>No tasks have been attached. Ask your manager to check this visit.</p>}
      {pack.tasks.map(task => <article className={styles.task} key={task.id}><div className={styles.cardTop}><strong>{task.name}</strong><span className={styles.badge}>{titleCase(task.status)}</span></div>
        {task.outcome && <p>Outcome: {task.outcome}</p>}{task.caregiverNote && <p>Caregiver note: {task.caregiverNote}</p>}</article>)}
    </section>
    <section className={styles.card} aria-label="Required evidence"><h2>Required evidence</h2><p className={styles.muted}>Requirements for the tasks assigned to this visit.</p>
      {pack.requiredEvidenceKinds.length ? <div className={styles.pills}>{pack.requiredEvidenceKinds.map(kind => <span className={styles.badge} key={kind}>{titleCase(kind)}</span>)}</div> : <p>No evidence requirements recorded.</p>}
    </section>
  </>
}

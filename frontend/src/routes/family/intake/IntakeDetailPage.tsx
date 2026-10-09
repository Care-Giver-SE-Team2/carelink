import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { intakeDate, statusDescriptions } from '../../../features/intake/presentation'
import type { IntakeApplication, PendingElderLogin } from '../../../features/intake/types'
import { useIntakeApplication } from '../../../features/intake/useIntakeQueries'
import { IntakeIcon, IntakeLoading, StatusBadge } from './IntakeLayout'
import { IntakeFeedback } from './IntakeFeedback'
import styles from './FamilyIntake.module.css'
import { useIsDesktop } from '../components/useIsDesktop'

const mobilityLabels = {
  INDEPENDENT: 'Moves independently',
  ASSISTIVE_CANE: 'Uses a walking aid',
  WHEELCHAIR_BEDBOUND: 'Uses a wheelchair / stays in bed',
}
const careLabels: Record<string, string> = {
  BATHING: 'Bathing assistance',
  VITALS: 'Vital signs monitoring',
}

/**
 * Displays an authorised application and the care team's recorded review. Laid out like the
 * application list it opens from: one white header, then on desktop the application on the left
 * and where it stands (status, the elder's sign-in, the review) beside it.
 * @author Wang Zhili
 */
export function IntakeDetailPage() {
  const { id = '' } = useParams()
  const { search, state } = useLocation()
  const { resource, refresh } = useIntakeApplication(id)
  const desktop = useIsDesktop()
  return (
    <div className={styles.page}>
      <div className={styles.detailNav}>
        <Link className={styles.backLink} to={'/family/intake' + search}>
          <IntakeIcon name="back" />
          Back to applications
        </Link>
      </div>
      {resource.status === 'success' && <ApplicationHeader application={resource.data} />}
      <div className={styles.detailBody}>
        {Number.isSafeInteger(state?.submittedApplicationId) &&
          String(state.submittedApplicationId) === id && (
            <section className={styles.progress} role="status">
              <h2>Application submitted</h2>
              <p>Your application #{state.submittedApplicationId} has been received.</p>
            </section>
          )}
        {resource.status === 'loading' && <IntakeLoading />}
        {resource.status === 'error' && <IntakeFeedback error={resource.error} onRetry={refresh} />}
        {resource.status === 'success' && (
          <ApplicationDetails application={resource.data} desktop={desktop} />
        )}
      </div>
    </div>
  )
}

function ApplicationHeader({ application: item }: { application: IntakeApplication }) {
  return (
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>APPLICATION #{item.id}</p>
        <h1>{item.targetElderName}</h1>
        <p className={styles.subtitle}>Your care application, at a glance.</p>
      </div>
    </section>
  )
}

function ApplicationDetails({ application: item, desktop }: { application: IntakeApplication; desktop: boolean }) {
  const pending = item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW'
  const status = (
    <section className={styles.progress} aria-label="Application status">
      <StatusBadge status={item.status} />
      <p>{statusDescriptions[item.status]}</p>
      <div className={styles.submittedAt}>
        Submitted <time dateTime={item.createdAt}>{intakeDate(item.createdAt)}</time>
      </div>
    </section>
  )
  const signIn = item.elderLogin && <ElderSignIn elderName={item.targetElderName} login={item.elderLogin} />
  const elder = (
    <section className={styles.detailSection}>
      <h2>Elder information</h2>
      <dl className={styles.fields}>
        <div>
          <dt>Full name</dt>
          <dd>{item.targetElderName}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd>{item.targetElderAge === null ? 'Not provided' : item.targetElderAge + ' years'}</dd>
        </div>
        <div className={styles.fullWidth}>
          <dt>Address</dt>
          <dd>{item.targetAddress}</dd>
        </div>
        <div>
          <dt>Postal code</dt>
          <dd>{item.postalCode}</dd>
        </div>
        <div>
          <dt>Preferred dialects</dt>
          <dd>{item.preferredDialects || 'Not provided'}</dd>
        </div>
        <div className={styles.fullWidth}>
          <dt>Mobility</dt>
          <dd>{mobilityLabels[item.mobilityLevel] ?? item.mobilityLevel}</dd>
        </div>
      </dl>
    </section>
  )
  const care = (
    <section className={styles.detailSection}>
      <h2>Care needs</h2>
      {item.careNeeds.length ? (
        <ul className={styles.careNeeds}>
          {item.careNeeds.map((need) => (
            <li key={need}>{Object.hasOwn(careLabels, need) ? careLabels[need] : need}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>No care needs recorded.</p>
      )}
      <h3 className={styles.fieldTitle}>Medical notes</h3>
      <p className={styles.notes}>{item.medicalNotes || 'Not provided'}</p>
    </section>
  )
  const review = (
    <section className={styles.detailSection}>
      <h2>Review details</h2>
      <dl className={styles.fields}>
        <div className={styles.fullWidth}>
          <dt>Review date</dt>
          <dd>
            {item.reviewedAt ? (
              <time dateTime={item.reviewedAt}>{intakeDate(item.reviewedAt)}</time>
            ) : pending ? (
              'Awaiting review'
            ) : (
              'Not available'
            )}
          </dd>
        </div>
        <div className={styles.fullWidth}>
          <dt>Review notes</dt>
          <dd>
            {item.reviewRemarks ||
              (pending
                ? 'The care team has not added any review notes yet.'
                : 'No review notes recorded.')}
          </dd>
        </div>
        {item.elderId !== null && (
          <div className={styles.fullWidth}>
            <dt>Elder profile reference</dt>
            <dd>#{item.elderId}</dd>
          </div>
        )}
      </dl>
    </section>
  )
  const footnote = <p className={styles.footnote}>Application times are shown in Singapore time.</p>

  // Desktop: the application on the left, where it stands on the right (as the list puts its
  // "new application" card). Phone: one column, status and anything to act on first.
  return desktop ? (
    <div className={styles.split}>
      <div className={styles.detailColumn}>
        {elder}
        {care}
        {footnote}
      </div>
      <aside className={styles.detailColumn} aria-label="Where your application stands">
        {status}
        {signIn}
        {review}
      </aside>
    </div>
  ) : (
    <>
      {status}
      {signIn}
      {elder}
      {care}
      {review}
      {footnote}
    </>
  )
}

/**
 * The login created for the elder on approval, for the applicant to pass on. The server stops
 * sending it once the elder signs in and chooses their own password. The password stays hidden
 * until asked for, so it isn't on screen whenever the application is opened.
 */
function ElderSignIn({ elderName, login }: { elderName: string; login: PendingElderLogin }) {
  const [shown, setShown] = useState(false)
  return (
    <section className={styles.detailSection} aria-labelledby="elder-sign-in-heading">
      <h2 id="elder-sign-in-heading">Sign-in for {elderName}</h2>
      <p className={styles.muted}>
        Give these to {elderName} to sign in to CareLink. The first time they sign in, they will choose
        their own password, and these details will no longer show here.
      </p>
      <dl className={styles.fields}>
        <div>
          <dt>Username</dt>
          <dd className={styles.credential}>{login.username}</dd>
        </div>
        <div>
          <dt>Temporary password</dt>
          <dd className={styles.credential}>
            {shown ? login.temporaryPassword : <span aria-label="Hidden">••••••••••</span>}
          </dd>
        </div>
      </dl>
      <button type="button" className={styles.textButton} onClick={() => setShown((value) => !value)}>
        {shown ? 'Hide password' : 'Show password'}
      </button>
    </section>
  )
}

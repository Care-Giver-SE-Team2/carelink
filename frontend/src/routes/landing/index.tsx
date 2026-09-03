import { useId, useState } from 'react'
import { Link } from 'react-router-dom'

import caregiverImage from '../../assets/Caregiver.png'
import { IconCalendar, IconClock, IconDocCheck, IconHeart, IconUsers } from './icons'
import styles from './Landing.module.css'

const DEV_ROLE_LINKS = [
  { path: '/manager', label: 'Manager' },
  { path: '/caregiver', label: 'Caregiver' },
  { path: '/family', label: 'Family' },
  { path: '/elder', label: 'Elder' },
  { path: '/admin', label: 'Admin' },
]

const FEATURES = [
  {
    icon: IconCalendar,
    tint: 'blue' as const,
    title: 'Plan with ease',
    description: 'Schedule and manage home visits in one place.',
  },
  {
    icon: IconUsers,
    tint: 'green' as const,
    title: 'Stay informed',
    description: 'Track visits in real time and spot issues early.',
  },
  {
    icon: IconHeart,
    tint: 'pink' as const,
    title: 'Deliver better care',
    description: 'Keep caregivers, families and care managers aligned.',
  },
]

export default function LandingHome() {
  const emailId = useId()
  const passwordId = useId()

  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)

  return (
    <div className={styles.page}>
      <div className={styles.canvas}>
        <div className={styles.leftCol}>
          <div className={styles.header}>
            <span className={styles.wordmark}>CareLink</span>
            <span className={styles.eyebrow}>Home care coordination</span>
          </div>

          <div className={styles.pitch}>
            <div className={styles.pitchMain}>
              <div className={styles.pitchText}>
                <h1 className={styles.headline}>
                  Better care starts with <span className={styles.headlineAccent}>coordination.</span>
                </h1>
                <p className={styles.dek}>
                  CareLink schedules home visits, tracks them as they happen, and escalates the
                  ones that go wrong — so a missed visit reaches a care manager in minutes, not at
                  the end of the day.
                </p>

                <ul className={styles.features}>
                  {FEATURES.map(({ icon: Icon, tint, title, description }) => (
                    <li key={title} className={styles.feature}>
                      <span className={`${styles.featureIcon} ${styles[`tint-${tint}`]}`}>
                        <Icon />
                      </span>
                      <div>
                        <div className={styles.featureTitle}>{title}</div>
                        <div className={styles.featureDescription}>{description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.illustration}>
                <img src={caregiverImage} alt="A caregiver smiling with an elderly client at home" />
              </div>
            </div>

            <div className={styles.proof}>
              <div className={styles.proofCell}>
                <span className={`${styles.proofIcon} ${styles['tint-green']}`}>
                  <IconUsers />
                </span>
                <div className={styles.proofText}>
                  <div className={styles.proofValue}>86</div>
                  <div className={styles.proofCaption}>visits coordinated today across two sectors</div>
                </div>
              </div>
              <div className={styles.proofCell}>
                <span className={`${styles.proofIcon} ${styles['tint-green']}`}>
                  <IconClock />
                </span>
                <div className={styles.proofText}>
                  <div className={styles.proofValue}>
                    10<span className={styles.proofUnit}>m</span>
                  </div>
                  <div className={styles.proofCaption}>from a missed check-in to a care manager seeing it</div>
                </div>
              </div>
              <div className={styles.proofCell}>
                <span className={`${styles.proofIcon} ${styles['tint-green']}`}>
                  <IconDocCheck />
                </span>
                <div className={styles.proofText}>
                  <div className={styles.proofValue}>
                    100<span className={styles.proofUnit}>%</span>
                  </div>
                  <div className={styles.proofCaption}>of visit records signed by the caregiver who made them</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form
          className={styles.formColumn}
          onSubmit={(event) => {
            event.preventDefault()
            // Not wired to the backend yet — see README.md in this folder.
          }}
        >
          <h2 className={styles.formTitle}>Sign in</h2>

          <div className={styles.fields}>
            <div>
              <label className={styles.fieldLabel} htmlFor={emailId}>
                Email Address
              </label>
              <input
                id={emailId}
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="you@carelink.sg"
                className={styles.textInput}
              />
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor={passwordId}>
                Password
              </label>
              <div className={styles.passwordBox}>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={styles.passwordInput}
                />
                <button
                  type="button"
                  className={styles.showToggle}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
            </div>
          </div>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
            />
            <span className={styles.checkboxBox} aria-hidden="true" />
            <span className={styles.checkboxLabel}>Keep me signed in on this device</span>
          </label>

          <button type="submit" className={styles.submit}>
            Sign in
          </button>

          <div className={styles.belowSubmit}>
            <button type="button" className={styles.forgotLink}>
              Forgotten your password?
            </button>
          </div>

          <div className={styles.noAccount}>
            <div className={styles.noAccountEyebrow}>No account yet?</div>
            <Link to="/family" className={styles.applyCard}>
              <div className={styles.applyCardRow}>
                <span className={styles.applyCardLabel}>Apply for care for a family member</span>
                <span className={styles.applyCardArrow}>→</span>
              </div>
              <div className={styles.applyCardCaption}>
                Takes about ten minutes. A care manager replies within two working days.
              </div>
            </Link>
          </div>
        </form>
      </div>

      {/* Temporary dev shortcuts — remove before shipping. */}
      <div className={styles.devRoleLinks}>
        {DEV_ROLE_LINKS.map((role) => (
          <Link key={role.path} to={role.path} className={styles.devRoleLink}>
            {role.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

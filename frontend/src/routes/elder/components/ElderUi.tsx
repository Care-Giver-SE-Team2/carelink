import { useContext, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ElderSignOutContext } from '../lib/signOutContext'
import styles from './ElderUi.module.css'

/**
 * Building blocks for the elder client. Every task takes three taps or fewer and should
 * work without reading: few choices per screen, full-width buttons at least 80px tall,
 * square corners, ink on white, and the help colour reserved for asking for help.
 */

export function ScreenHeader({
  eyebrow,
  eyebrowStyle = 'plain',
  title,
  subtitle,
  backTo,
}: {
  eyebrow?: string
  /** `label` is the small uppercase mono variant (e.g. "FAMILY"). */
  eyebrowStyle?: 'plain' | 'label'
  title: string
  subtitle?: string
  /** Shows the square back button, linking here. */
  backTo?: string
}) {
  return (
    <header
      className={`${styles.screenHeader} ${backTo ? styles.withBack : ''} ${backTo && eyebrow ? styles.withEyebrow : ''}`}
    >
      {backTo && (
        <Link className={styles.back} to={backTo} aria-label="Back">
          <span aria-hidden="true">←</span>
        </Link>
      )}
      <div className={styles.headerText}>
        {eyebrow && (
          <div className={eyebrowStyle === 'label' ? styles.eyebrowLabel : styles.eyebrow}>
            {eyebrow}
          </div>
        )}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  )
}

/**
 * Screen layout. On phone and tablet it is one column; on desktop (≥1024px) `left` holds the
 * header and the things to read, `right` (440px) holds the things to tap, and `footer` sits
 * under the left column. Each piece of `left`/`right` is wrapped in a Slot whose `order` gives
 * its position in the single column, so the phone order can interleave both sides (e.g.
 * header, choices, note, send) while the desktop columns keep them apart. The DOM order —
 * left, right, footer — matches the visual order of everything focusable at every size.
 */
export function ScreenColumns({
  left,
  right,
  footer,
}: {
  left: ReactNode
  right?: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className={styles.columns}>
      <div className={styles.left}>{left}</div>
      {right && <div className={styles.right}>{right}</div>}
      {footer && <div className={styles.footerArea}>{footer}</div>}
    </div>
  )
}

/**
 * One piece of a ScreenColumns side; `order` is its position in the single-column layout.
 * Renders nothing when it has no content, so a conditional piece doesn't leave an empty gap.
 */
export function Slot({
  order,
  children,
}: {
  order: number
  children: ReactNode
}) {
  if (children === null || children === undefined || children === false) {
    return null
  }

  return (
    <div className={styles.slot} style={{ order }}>
      {children}
    </div>
  )
}

/**
 * Bottom strip under a top rule: read-aloud and other quiet secondary controls, with the
 * sign-out button at the right end on phone and tablet (desktop has it in the bar).
 */
export function ScreenFooter({ children }: { children: ReactNode }) {
  const signOut = useContext(ElderSignOutContext)

  return (
    <div className={styles.footer}>
      {children}
      {signOut && (
        <>
          <SignOutButton
            placement="footer"
            onClick={signOut.signOut}
            signingOut={signOut.signingOut}
          />
          {signOut.error && (
            <p role="alert" className={styles.signOutError}>
              {signOut.error}
            </p>
          )}
        </>
      )}
    </div>
  )
}

type BigActionVariant = 'primary' | 'secondary' | 'help'

const VARIANT_CLASS: Record<BigActionVariant, string> = {
  primary: styles.actionPrimary,
  secondary: styles.actionSecondary,
  help: styles.actionHelp,
}

/**
 * Full-width action with an icon tile. Renders a link when `to` is set, otherwise a button.
 * The accessible name is the visible label; the icon is decorative.
 */
export function BigAction({
  icon,
  label,
  variant = 'secondary',
  to,
  onClick,
  type = 'button',
  disabled,
}: {
  icon: ReactNode
  label: string
  variant?: BigActionVariant
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const className = `${styles.action} ${VARIANT_CLASS[variant]}`
  const content = (
    <>
      <span className={styles.actionTile} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.actionLabel}>{label}</span>
    </>
  )

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    )
  }

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

/** Stack of BigActions / choices with the standard gap. */
export function ActionStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>
}

/** Plain full-width primary/secondary button without an icon tile (e.g. "Send request"). */
export function WideButton({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`${styles.wide} ${variant === 'primary' ? styles.widePrimary : styles.wideSecondary}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

/** Single-select choice row, shown as a toggle button with a "tap" / "chosen" hint. */
export function ChoiceButton({
  label,
  selected,
  onSelect,
  disabled,
}: {
  label: string
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`${styles.choice} ${selected ? styles.choiceSelected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      disabled={disabled}
    >
      <span className={styles.choiceLabel}>{label}</span>
      <span className={styles.choiceHint} aria-hidden="true">
        {selected ? 'chosen' : 'tap'}
      </span>
    </button>
  )
}

/**
 * The same look as ChoiceButton, for a choice that belongs to a form: a real radio input
 * (visually hidden) inside a large tappable label.
 */
export function ChoiceRadio({
  name,
  label,
  icon,
  checked,
  onChange,
  disabled,
  compact = false,
}: {
  name: string
  label: string
  icon?: ReactNode
  checked: boolean
  onChange: () => void
  disabled?: boolean
  /** Square tile for a row of short options (e.g. a 1–5 rating). */
  compact?: boolean
}) {
  return (
    <label
      className={`${compact ? styles.choiceTile : styles.choice} ${checked ? styles.choiceSelected : ''}`}
    >
      <input
        className={styles.visuallyHidden}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      {icon && (
        <span className={styles.choiceIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.choiceLabel}>{label}</span>
      {!compact && (
        <span className={styles.choiceHint} aria-hidden="true">
          {checked ? 'chosen' : 'tap'}
        </span>
      )}
    </label>
  )
}

/** Quiet grey note, e.g. who will see an answer. */
export function InfoNote({ children }: { children: ReactNode }) {
  return <div className={styles.infoNote}>{children}</div>
}

/** Outcome message after an action: `success` for done, `problem` for something to fix. */
export function StatusNote({
  tone,
  children,
}: {
  tone: 'success' | 'problem'
  children: ReactNode
}) {
  return (
    <div
      className={`${styles.statusNote} ${tone === 'success' ? styles.statusSuccess : styles.statusProblem}`}
      role={tone === 'problem' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

/** Visit, family member or other key thing on the screen, in a 1px ink frame. */
export function InfoCard({ children }: { children: ReactNode }) {
  return <section className={styles.card}>{children}</section>
}

/**
 * Reads the current screen aloud with the browser's speech synthesis. Hidden when the
 * browser has none, rather than showing a button that does nothing.
 */
export function SpeakButton({
  label = 'Tap the speaker to hear this page',
}: {
  label?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  function speak() {
    const screen = buttonRef.current?.closest('main')
    const text = (screen?.innerText ?? '').replace(label, '').trim()
    if (!text) {
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button ref={buttonRef} type="button" className={styles.speak} onClick={speak}>
      <span className={styles.speakIcon} aria-hidden="true">
        ▶
      </span>
      <span>{label}</span>
    </button>
  )
}

/**
 * Quiet on purpose, so it doesn't compete with a screen's actions. At the right of the footer
 * row on phone and tablet (`placement="footer"`), at the right of the desktop CareLink bar
 * (`placement="bar"`). Each placement hides itself at the other sizes.
 */
export function SignOutButton({
  placement,
  onClick,
  signingOut,
}: {
  placement: 'footer' | 'bar'
  onClick: () => void
  signingOut: boolean
}) {
  return (
    <button
      type="button"
      className={`${styles.signOut} ${placement === 'footer' ? styles.signOutFooter : styles.signOutBar}`}
      onClick={onClick}
      disabled={signingOut}
    >
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

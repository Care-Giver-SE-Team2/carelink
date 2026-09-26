import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Eyebrow, MetaText } from './Typography'
import styles from './Modal.module.css'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
}

type ModalProps = {
  title: ReactNode
  eyebrow?: ReactNode
  eyebrowTone?: 'default' | 'danger' | 'accent'
  /** Mono line under the title — whose record this acts on ("Chan Bee Choo · v4"). */
  meta?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** Esc and a backdrop click call this. */
  onClose: () => void
  width?: number
}

/**
 * Dialog shell over a dimmed backdrop. Focus moves to the first control inside, is trapped
 * there, and returns to whatever had it when the dialog closes. Put a destructive button
 * last so it is never the one focused first.
 */
export function Modal({ title, eyebrow, eyebrowTone = 'default', meta, children, footer, onClose, width = 400 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // Captured on first render — before the effect below moves focus into the dialog.
  const [returnFocusTo] = useState(() => document.activeElement as HTMLElement | null)

  useEffect(() => {
    const first = focusablesIn(dialogRef.current)[0]
    ;(first ?? dialogRef.current)?.focus()
    return () => returnFocusTo?.focus?.()
  }, [returnFocusTo])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Stop here so a dialog opened from inside another one doesn't close both.
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    e.stopPropagation()
    const items = focusablesIn(dialogRef.current)
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.head}>
          {eyebrow && (
            <div className={styles.eyebrow}>
              <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
            </div>
          )}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {meta && <MetaText className={styles.meta}>{meta}</MetaText>}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * A Modal whose footer is Cancel plus one confirming action. `tone="danger"` colours the
 * eyebrow and the confirm button for actions that remove or stop something.
 */
export function ConfirmDialog({
  title,
  eyebrow,
  meta,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  confirmDisabled = false,
  busy = false,
  onConfirm,
  onCancel,
  width,
}: Omit<ModalProps, 'footer' | 'onClose' | 'eyebrowTone'> & {
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  confirmDisabled?: boolean
  /** While the confirmed action is in flight: both buttons disabled, Esc/backdrop ignored. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      title={title}
      eyebrow={eyebrow}
      eyebrowTone={tone === 'danger' ? 'danger' : 'default'}
      meta={meta}
      width={width}
      onClose={() => {
        if (!busy) onCancel()
      }}
      footer={
        <>
          <Button variant="ghost" size="md" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="md"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}

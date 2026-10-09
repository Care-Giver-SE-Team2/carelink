import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { chooseOwnPassword } from '../../../features/auth/api'
import { ApiError } from '../../../shared/api/client'
import { ElderShell } from '../components/ElderShell'
import {
  InfoCard,
  ScreenColumns,
  ScreenFooter,
  ScreenHeader,
  Slot,
  SpeakButton,
  StatusNote,
  WideButton,
} from '../components/ElderUi'
import styles from '../Elder.module.css'

const MIN_LENGTH = 8
/** BCrypt ignores anything past 72 bytes, so the server refuses longer ones. */
const MAX_BYTES = 72

const SERVER_PROBLEMS: Record<string, string> = {
  SAME_AS_TEMPORARY_PASSWORD: 'Please choose a new password, not the one you were given.',
}

function problemWith(password: string, again: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Your password needs at least ${MIN_LENGTH} letters or numbers.`
  }
  if (new TextEncoder().encode(password).length > MAX_BYTES) {
    return 'That password is too long. Please choose a shorter one.'
  }
  if (password !== again) {
    return 'The two passwords are not the same. Please type them again.'
  }
  return null
}

/**
 * Shown instead of every other elder screen while the elder still signs in with the temporary
 * password made when their family's application was approved. Saving a password of their own
 * also removes the temporary one from the family's view of the application.
 */
export default function ChoosePassword() {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    const problem = problemWith(password, again)
    if (problem) {
      setError(problem)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const user = await chooseOwnPassword(password)
      queryClient.setQueryData(['currentUser'], user)
    } catch (cause) {
      const code = cause instanceof ApiError ? (cause.body as { code?: string } | null)?.code : undefined
      if (code === 'PASSWORD_ALREADY_CHOSEN') {
        // Chosen already (e.g. in another tab): reload the user so the normal screens come back.
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        return
      }
      setError((code && SERVER_PROBLEMS[code]) ?? 'Your password could not be saved. Please try again.')
      setSaving(false)
    }
  }

  const inputType = visible ? 'text' : 'password'

  return (
    <ElderShell>
      <ScreenColumns
        left={
          <>
            <Slot order={1}>
              <ScreenHeader
                title="Choose your own password"
                subtitle="You signed in with a password you were given. Choose a new one that only you know."
              />
            </Slot>
            <Slot order={2}>{error && <StatusNote tone="problem">{error}</StatusNote>}</Slot>
          </>
        }
        right={
          <Slot order={3}>
            <InfoCard>
              <form className={styles.form} onSubmit={save} noValidate>
                <label className={styles.fieldLabel}>
                  <span>New password</span>
                  <input
                    type={inputType}
                    autoComplete="new-password"
                    value={password}
                    disabled={saving}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  <span>Type it again</span>
                  <input
                    type={inputType}
                    autoComplete="new-password"
                    value={again}
                    disabled={saving}
                    onChange={(event) => setAgain(event.target.value)}
                  />
                </label>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={saving}
                    onChange={(event) => setVisible(event.target.checked)}
                  />
                  <span>Show what I typed</span>
                </label>
                <WideButton type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save my password'}
                </WideButton>
              </form>
            </InfoCard>
          </Slot>
        }
        footer={
          <ScreenFooter>
            <SpeakButton />
          </ScreenFooter>
        }
      />
    </ElderShell>
  )
}

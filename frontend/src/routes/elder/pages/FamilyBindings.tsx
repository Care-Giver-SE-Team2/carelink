import {
  useEffect,
  useState,
} from 'react'
import type {
  FormEvent,
} from 'react'
import { Link } from 'react-router-dom'

import {
  createFamilyBinding,
  getFamilyBindings,
  revokeFamilyBinding,
} from '../../../features/family-binding/api'
import type {
  AccessScope,
  FamilyBinding,
  Relationship,
} from '../../../features/family-binding/types'
import { ApiError } from '../../../shared/api/client'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

function relationshipLabel(
  relationship: Relationship,
): string {
  switch (relationship) {
    case 'SON':
      return 'Son'
    case 'DAUGHTER':
      return 'Daughter'
    case 'SPOUSE':
      return 'Spouse'
    case 'GUARDIAN':
      return 'Guardian'
    default:
      return 'Other'
  }
}

function statusLabel(
  status: FamilyBinding['status'],
): string {
  switch (status) {
    case 'PENDING_CONFIRMATION':
      return 'Pending confirmation'
    case 'ACTIVE':
      return 'Active'
    case 'REJECTED':
      return 'Rejected'
    case 'REVOKED':
      return 'Removed'
  }
}

export default function FamilyBindings() {
  const [bindings, setBindings] =
    useState<FamilyBinding[]>([])

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [revokingId, setRevokingId] =
    useState<number | null>(null)

  const [
    familyUsername,
    setFamilyUsername,
  ] = useState('')

  const [
    relationship,
    setRelationship,
  ] =
    useState<Relationship>('OTHER')

  const [
    accessScope,
    setAccessScope,
  ] =
    useState<AccessScope>('FULL')

  const [
    primaryContact,
    setPrimaryContact,
  ] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [success, setSuccess] =
    useState<string | null>(null)

  useEffect(() => {
    const controller =
      new AbortController()

    getFamilyBindings()
      .then((result) => {
        setBindings(result)
      })
      .catch((failure: unknown) => {
        if (
          failure instanceof DOMException &&
          failure.name === 'AbortError'
        ) {
          return
        }

        setError(
          'Unable to load family members.',
        )
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      submitting ||
      !familyUsername.trim()
    ) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const created =
        await createFamilyBinding({
          familyUsername:
            familyUsername.trim(),
          relationship,
          primaryContact,
          accessScope,
        })

      setBindings((current) => [
        created,
        ...current.filter(
          (binding) =>
            binding.id !== created.id,
        ),
      ])

      setFamilyUsername('')
      setRelationship('OTHER')
      setAccessScope('FULL')
      setPrimaryContact(false)

      setSuccess(
        'Family binding request created.',
      )
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.status === 404
      ) {
        setError(
          'No family member account was found with that username.',
        )
      } else if (
        failure instanceof ApiError &&
        failure.status === 409
      ) {
        setError(
          'This family member is already linked or awaiting confirmation.',
        )
      } else if (
        failure instanceof ApiError
      ) {
        setError(failure.message)
      } else {
        setError(
          'Unable to create the family binding.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(
    bindingId: number,
  ) {
    if (revokingId !== null) {
      return
    }

    setRevokingId(bindingId)
    setError(null)
    setSuccess(null)

    try {
      const updated =
        await revokeFamilyBinding(
          bindingId,
        )

      setBindings((current) =>
        current.map((binding) =>
          binding.id === updated.id
            ? updated
            : binding,
        ),
      )

      setSuccess(
        'Family binding removed.',
      )
    } catch (failure) {
      if (
        failure instanceof ApiError
      ) {
        setError(failure.message)
      } else {
        setError(
          'Unable to remove the family binding.',
        )
      }
    } finally {
      setRevokingId(null)
    }
  }

  const visibleBindings =
    bindings.filter(
      (binding) =>
        binding.status !== 'REVOKED',
    )

  return (
    <RoleShell
      title="My family"
      theme="elder"
    >
      <div className={styles.page}>
        <Link
          className={styles.back}
          to="/elder"
        >
          ← Back
        </Link>

        <h1>Family members</h1>

        <p className={styles.meta}>
          View and manage the family
          members connected to your
          CareLink account.
        </p>

        {error && (
          <div
            role="alert"
            className={styles.warning}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className={styles.success}
          >
            {success}
          </div>
        )}

        {loading ? (
          <p>Loading family members…</p>
        ) : visibleBindings.length === 0 ? (
          <section
            className={styles.panel}
          >
            <p>
              You do not have any family
              members linked yet.
            </p>
          </section>
        ) : (
          visibleBindings.map(
            (binding) => (
              <section
                key={binding.id}
                className={styles.panel}
              >
                <h2>
                  {
                    binding.familyMemberName
                  }
                </h2>

                <p>
                  {relationshipLabel(
                    binding.relationship,
                  )}

                  {binding.primaryContact
                    ? ' · Primary contact'
                    : ''}
                </p>

                <p
                  className={
                    styles.meta
                  }
                >
                  Access:{' '}
                  {binding.accessScope ===
                  'FULL'
                    ? 'Full'
                    : 'Read only'}
                  {' · '}
                  Status:{' '}
                  {statusLabel(
                    binding.status,
                  )}
                </p>

                <button
                  type="button"
                  className={
                    styles.secondary
                  }
                  disabled={
                    revokingId !== null
                  }
                  onClick={() =>
                    handleRevoke(
                      binding.id,
                    )
                  }
                >
                  {revokingId ===
                  binding.id
                    ? 'Removing…'
                    : 'Remove family member'}
                </button>
              </section>
            ),
          )
        )}

        <section
          className={styles.panel}
        >
          <h2>
            Bind another family member
          </h2>

          <p>
            Enter the username of an
            existing CareLink family
            account.
          </p>

          <form
            className={
              styles.bindingForm
            }
            onSubmit={handleCreate}
          >
            <label
              className={
                styles.field
              }
            >
              <span>
                Family username
              </span>

              <input
                type="text"
                value={familyUsername}
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                required
                disabled={submitting}
                onChange={(event) =>
                  setFamilyUsername(
                    event.target.value,
                  )
                }
              />
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>Relationship</span>

              <select
                value={relationship}
                disabled={submitting}
                onChange={(event) =>
                  setRelationship(
                    event.target
                      .value as Relationship,
                  )
                }
              >
                <option value="SON">
                  Son
                </option>

                <option value="DAUGHTER">
                  Daughter
                </option>

                <option value="SPOUSE">
                  Spouse
                </option>

                <option value="GUARDIAN">
                  Guardian
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </label>

            <label
              className={
                styles.field
              }
            >
              <span>Access</span>

              <select
                value={accessScope}
                disabled={submitting}
                onChange={(event) =>
                  setAccessScope(
                    event.target
                      .value as AccessScope,
                  )
                }
              >
                <option value="FULL">
                  Full
                </option>

                <option value="READ_ONLY">
                  Read only
                </option>
              </select>
            </label>

            <label
              className={
                styles.checkboxField
              }
            >
              <input
                type="checkbox"
                checked={primaryContact}
                disabled={submitting}
                onChange={(event) =>
                  setPrimaryContact(
                    event.target.checked,
                  )
                }
              />

              <span>
                Primary contact
              </span>
            </label>

            <button
              className={styles.primary}
              type="submit"
              disabled={
                submitting ||
                !familyUsername.trim()
              }
            >
              {submitting
                ? 'Sending request…'
                : 'Send binding request'}
            </button>
          </form>
        </section>
      </div>
    </RoleShell>
  )
}
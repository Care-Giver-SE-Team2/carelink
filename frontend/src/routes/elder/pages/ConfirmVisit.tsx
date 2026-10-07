import {
  useEffect,
  useState,
} from 'react'
import type {
  FormEvent,
} from 'react'
import {
  Link,
} from 'react-router-dom'

import {
  getVisitsAwaitingConfirmation,
  submitVisitConfirmation,
} from '../../../features/visit-confirmation/api'
import type {
  ConfirmationStatus,
  PendingElderVisit,
} from '../../../features/visit-confirmation/types'
import {
  ApiError,
} from '../../../shared/api/client'
import {
  RoleShell,
} from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(
    new Date(value),
  )
}

export default function ConfirmVisit() {
  const [
    visits,
    setVisits,
  ] =
    useState<PendingElderVisit[]>([])

  const [
    selectedVisitId,
    setSelectedVisitId,
  ] =
    useState<number | null>(null)

  const [
    response,
    setResponse,
  ] =
    useState<ConfirmationStatus>(
      'CONFIRMED',
    )

  const [
    rating,
    setRating,
  ] =
    useState<number | null>(null)

  const [
    notes,
    setNotes,
  ] =
    useState('')

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<string | null>(null)

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(null)

  useEffect(() => {
    let active = true

    getVisitsAwaitingConfirmation()
      .then((result) => {
        if (!active) {
          return
        }

        setVisits(result)

        if (result.length > 0) {
          setSelectedVisitId(
            result[0].visitId,
          )
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Unable to load visits awaiting confirmation.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const selectedVisit =
    visits.find(
      (visit) =>
        visit.visitId ===
        selectedVisitId,
    ) ?? null

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      selectedVisit === null ||
      submitting
    ) {
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await submitVisitConfirmation(
        selectedVisit.visitId,
        {
          confirmationStatus:
            response,
          rating,
          comment:
            notes.trim() ||
            null,
        },
      )

      const remaining =
        visits.filter(
          (visit) =>
            visit.visitId !==
            selectedVisit.visitId,
        )

      setVisits(remaining)

      setSelectedVisitId(
        remaining.length > 0
          ? remaining[0].visitId
          : null,
      )

      setResponse('CONFIRMED')
      setRating(null)
      setNotes('')

      setSuccess(
        response === 'CONFIRMED'
          ? 'Thank you. Your confirmation has been recorded.'
          : 'Thank you. Your concern has been recorded and sent for follow-up.',
      )
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.status === 409
      ) {
        setError(
          'This visit has already been confirmed or is no longer awaiting confirmation.',
        )
      } else if (
        failure instanceof ApiError &&
        failure.status === 404
      ) {
        setError(
          'This visit could not be found.',
        )
      } else if (
        failure instanceof ApiError
      ) {
        setError(
          failure.message,
        )
      } else {
        setError(
          'Unable to submit your confirmation.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RoleShell
      title="Confirm service"
      theme="elder"
    >
      <div className={styles.page}>
        <Link
          className={styles.back}
          to="/elder"
        >
          ← Back
        </Link>

        <h1>
          Was the service completed?
        </h1>

        {error && (
          <div
            role="alert"
            className={
              styles.warning
            }
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className={
              styles.success
            }
          >
            {success}
          </div>
        )}

        {loading ? (
          <p>
            Loading visits…
          </p>
        ) : visits.length === 0 ? (
          <section
            className={
              styles.panel
            }
          >
            <h2>
              Nothing to confirm
            </h2>

            <p>
              You do not currently
              have any completed
              visits awaiting your
              confirmation.
            </p>
          </section>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
          >
            {visits.length > 1 && (
              <label>
                Visit
                <select
                  value={
                    selectedVisitId ??
                    ''
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedVisitId(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                >
                  {visits.map(
                    (visit) => (
                      <option
                        key={
                          visit.visitId
                        }
                        value={
                          visit.visitId
                        }
                      >
                        {visit.serviceType ??
                          'Care service'}
                        {' · '}
                        {formatDateTime(
                          visit.scheduledStart,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}

            {selectedVisit && (
              <section
                className={
                  styles.panel
                }
              >
                <h2>
                  Completed visit
                </h2>

                <p>
                  <strong>
                    {selectedVisit
                      .serviceType ??
                      'Care service'}
                  </strong>
                </p>

                <p
                  className={
                    styles.meta
                  }
                >
                  Scheduled:{' '}
                  {formatDateTime(
                    selectedVisit
                      .scheduledStart,
                  )}
                </p>

                {selectedVisit
                  .checkedOutAt && (
                  <p
                    className={
                      styles.meta
                    }
                  >
                    Completed:{' '}
                    {formatDateTime(
                      selectedVisit
                        .checkedOutAt,
                    )}
                  </p>
                )}
              </section>
            )}

            <div
              className={
                styles.actions
              }
            >
              <label
                className={
                  styles.option
                }
              >
                <input
                  type="radio"
                  name="confirmation"
                  checked={
                    response ===
                    'CONFIRMED'
                  }
                  disabled={
                    submitting
                  }
                  onChange={() =>
                    setResponse(
                      'CONFIRMED',
                    )
                  }
                />

                Yes, service was
                completed
              </label>

              <label
                className={
                  styles.option
                }
              >
                <input
                  type="radio"
                  name="confirmation"
                  checked={
                    response ===
                    'DISPUTED'
                  }
                  disabled={
                    submitting
                  }
                  onChange={() =>
                    setResponse(
                      'DISPUTED',
                    )
                  }
                />

                No, there was a
                problem
              </label>
            </div>

            <fieldset
              disabled={
                submitting
              }
            >
              <legend>
                Rating
              </legend>

              <div
                className={
                  styles.actions
                }
              >
                {[1, 2, 3, 4, 5]
                  .map(
                    (value) => (
                      <label
                        key={
                          value
                        }
                        className={
                          styles.option
                        }
                      >
                        <input
                          type="radio"
                          name="rating"
                          checked={
                            rating ===
                            value
                          }
                          onChange={() =>
                            setRating(
                              value,
                            )
                          }
                        />

                        {value}
                      </label>
                    ),
                  )}
              </div>
            </fieldset>

            <label>
              Optional feedback

              <textarea
                value={notes}
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="Tell us how the visit went"
              />
            </label>

            <button
              className={
                styles.primary
              }
              type="submit"
              disabled={
                submitting ||
                selectedVisit ===
                  null
              }
            >
              {submitting
                ? 'Submitting…'
                : 'Submit confirmation'}
            </button>
          </form>
        )}
      </div>
    </RoleShell>
  )
}
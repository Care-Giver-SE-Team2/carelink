import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Callout, MetaText, Pagination } from '../../../shared/components/ui'
import { ApplicationPanel } from '../components/ApplicationPanel'
import { ApplicationTable } from '../components/ApplicationTable'
import { ManagerShell } from '../components/ManagerShell'
import { approveIntakeApplication, declineIntakeApplication } from '../../../shared/api/profile'
import type { IntakeReview } from '../../../shared/api/profile'
import { APPLICATION_PAGE_SIZE, RESPONSE_WORKING_DAYS, nextApplicationId } from '../lib/applications'
import { useApplications } from '../lib/useApplications'
import styles from './Applications.module.css'

/**
 * Applications — its own item in the manager nav, between Elders and Caregivers. Families apply from the family app with their
 * relative's details and care needs; nothing is created until the manager approves here, which
 * creates the elder record and a login for the elder. The manager never sees that login: the
 * applicant reads it on the application in the family app until the elder chooses their own password.
 * Declining keeps the application, with the reason, for the audit trail.
 * The page and open row live in the URL (?page=2&id=41).
 */
export default function Applications() {
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const applications = useApplications()
  const [approved, setApproved] = useState<{ elderName: string; applicantName: string } | null>(null)

  const rows = applications.data ?? []
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageCount = Math.max(1, Math.ceil(rows.length / APPLICATION_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * APPLICATION_PAGE_SIZE, currentPage * APPLICATION_PAGE_SIZE)
  const selectedParam = Number(params.get('id')) || null
  const selected = rows.find((row) => row.id === selectedParam) ?? pageRows[0] ?? null

  const go = (next: { page?: number; id?: number | null }) => {
    const id = next.id === undefined ? selectedParam : next.id
    setParams({ page: String(next.page ?? currentPage), ...(id !== null && { id: String(id) }) }, { replace: true })
  }

  async function decide(row: IntakeReview, action: () => Promise<unknown>) {
    const nextId = nextApplicationId(rows, row.id)
    await action()
    await queryClient.invalidateQueries({ queryKey: ['applications'] })
    go({ id: nextId })
  }

  return (
    <ManagerShell headerContext="Applications">
      <div className={styles.layout}>
        <section className={styles.list} aria-label="Family applications">
          <p className={styles.helper}>
            Applications are answered within {RESPONSE_WORKING_DAYS} working days. Newest first.
          </p>
          {approved && (
            <Callout tone="info" role="status" className={styles.notice}>
              Approved. {approved.applicantName} will find {approved.elderName}'s sign-in details on the
              application in the family app.
            </Callout>
          )}
          {applications.isError ? (
            <p className={styles.status}>Could not load applications.</p>
          ) : applications.isPending ? (
            <p className={styles.status}>Loading applications…</p>
          ) : (
            <>
              <ApplicationTable rows={pageRows} selectedId={selected?.id ?? null} onSelect={(row) => go({ id: row.id })} />
              {rows.length > APPLICATION_PAGE_SIZE && (
                <div className={styles.pagination}>
                  <Pagination
                    page={currentPage}
                    pageSize={APPLICATION_PAGE_SIZE}
                    total={rows.length}
                    noun="applications"
                    onPageChange={(next) => go({ page: next, id: null })}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {selected ? (
          <ApplicationPanel
            key={selected.id}
            application={selected}
            onApprove={(message) =>
              decide(selected, async () => {
                await approveIntakeApplication(selected.id, message)
                setApproved({ elderName: selected.targetElderName, applicantName: selected.applicant.fullName })
                await queryClient.invalidateQueries({ queryKey: ['elders'] })
              })
            }
            onDecline={(message) =>
              decide(selected, async () => {
                await declineIntakeApplication(selected.id, message)
                setApproved(null)
              })
            }
          />
        ) : (
          <aside className={styles.emptyPanel} aria-label="Application detail">
            {applications.isSuccess && <MetaText tone="faint">Nothing to review.</MetaText>}
          </aside>
        )}
      </div>
    </ManagerShell>
  )
}

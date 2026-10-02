import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { publishCredential, rejectCredential } from '../../../shared/api/profile'
import type { CredentialRegisterRow } from '../../../shared/api/profile'
import { FilterChips, MetaText, Pagination } from '../../../shared/components/ui'
import { CertTable } from '../components/CertTable'
import { ManagerShell } from '../components/ManagerShell'
import { RejectCertificateDialog } from '../components/RejectCertificateDialog'
import { ReviewPanel } from '../components/ReviewPanel'
import { CERT_PAGE_SIZE, filterCounts, filterRows, nextSubmittedId } from '../lib/certifications'
import type { CertFilter } from '../lib/certifications'
import { useCredentialRegister, useVisitsAtRisk } from '../lib/useCertifications'
import styles from './Certifications.module.css'

const FILTERS: { value: CertFilter; label: string }[] = [
  { value: 'review', label: 'TO REVIEW' },
  { value: 'expiring', label: 'EXPIRING' },
  { value: 'all', label: 'ALL' },
]

const EMPTY: Record<CertFilter, string> = {
  review: 'Nothing waiting for review.',
  expiring: 'No certifications expire within 30 days.',
  all: 'No certifications recorded yet.',
}

/**
 * Certifications — MG06: every caregiver certification in one register, and the review of
 * renewals and new certificates submitted from the caregiver app. A row opens in the panel
 * on the right; a submitted one can be published or rejected.
 * The filter, page and open row live in the URL (?filter=expiring&page=2&id=14).
 */
export default function Certifications() {
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const register = useCredentialRegister()
  const risks = useVisitsAtRisk()
  const [rejecting, setRejecting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  // Kept with the row it was made on, so it disappears once another row is opened.
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const filter: CertFilter = FILTERS.some((f) => f.value === params.get('filter'))
    ? (params.get('filter') as CertFilter)
    : 'review'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const selectedParam = Number(params.get('id')) || null

  const rows = useMemo(() => register.data ?? [], [register.data])
  const counts = filterCounts(rows)
  const shown = filterRows(rows, filter)
  const pageCount = Math.max(1, Math.ceil(shown.length / CERT_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = shown.slice((currentPage - 1) * CERT_PAGE_SIZE, currentPage * CERT_PAGE_SIZE)
  const selected = rows.find((row) => row.id === selectedParam) ?? pageRows[0] ?? null

  const go = (next: { filter?: CertFilter; page?: number; id?: number | null }) => {
    const id = next.id === undefined ? selectedParam : next.id
    setParams(
      {
        filter: next.filter ?? filter,
        page: String(next.page ?? currentPage),
        ...(id !== null && { id: String(id) }),
      },
      { replace: true },
    )
  }

  async function review(row: CredentialRegisterRow, action: () => Promise<void>) {
    const nextId = nextSubmittedId(rows, row.id)
    await action()
    await queryClient.invalidateQueries({ queryKey: ['credentials'] })
    setRejecting(false)
    go({ id: nextId ?? row.id })
  }

  async function handlePublish(row: CredentialRegisterRow) {
    setPublishing(true)
    setError(null)
    try {
      await review(row, () => publishCredential(row.id))
    } catch (err) {
      setError({ id: row.id, message: err instanceof Error ? err.message : 'Could not publish this certificate.' })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <ManagerShell headerContext="Certifications">
      <div className={styles.layout}>
        <section className={styles.register} aria-label="Certification register">
          <div className={styles.filters}>
            <FilterChips
              label="Certification filter"
              options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
              value={filter}
              onChange={(next) => go({ filter: next, page: 1, id: null })}
            />
          </div>
          {register.isError ? (
            <p className={styles.status}>Could not load the certification register.</p>
          ) : register.isPending ? (
            <p className={styles.status}>Loading certifications…</p>
          ) : (
            <>
              <CertTable
                rows={pageRows}
                visitsAtRisk={risks.data}
                selectedId={selected?.id ?? null}
                onSelect={(row) => go({ id: row.id })}
                empty={EMPTY[filter]}
              />
              {shown.length > CERT_PAGE_SIZE && (
                <div className={styles.pagination}>
                  <Pagination
                    page={currentPage}
                    pageSize={CERT_PAGE_SIZE}
                    total={shown.length}
                    noun="certifications"
                    onPageChange={(next) => go({ page: next, id: null })}
                  />
                </div>
              )}
            </>
          )}
          <MetaText tone="faint" className={styles.footnote}>
            A scheduled scan raises reminders at 30 days and withholds affected visit types on expiry. Withheld visits
            appear on the roster as needing cover.
          </MetaText>
        </section>

        {selected ? (
          <ReviewPanel
            key={selected.id}
            row={selected}
            visitsAtRisk={risks.data ? (risks.data.get(selected.id) ?? null) : undefined}
            busy={publishing}
            error={error?.id === selected.id ? error.message : null}
            onPublish={() => handlePublish(selected)}
            onReject={() => setRejecting(true)}
          />
        ) : (
          <aside className={styles.emptyPanel} aria-label="Certification detail">
            {register.isSuccess && <MetaText tone="faint">Select a certification to see its details.</MetaText>}
          </aside>
        )}
      </div>

      {rejecting && selected && (
        <RejectCertificateDialog
          row={selected}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason) => review(selected, () => rejectCredential(selected.id, reason))}
        />
      )}
    </ManagerShell>
  )
}

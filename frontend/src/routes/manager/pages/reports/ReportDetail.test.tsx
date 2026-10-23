import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import ReportDetail from './ReportDetail'
import * as authApi from '../../../../features/auth/api'
import * as incidentsApi from '../../../../features/incidents/api'
import * as reportsApi from '../../../../features/reports/api'
import * as download from '../../../../features/reports/download'
import type { ReportDetail as Detail } from '../../../../features/reports/types'
import * as profileApi from '../../../../shared/api/profile'
import * as rosteringApi from '../../../../shared/api/rostering'
import { ApiError } from '../../../../shared/api/client'

/**
 * The manager's UC-MG07 report page against a stubbed API: the report as filed,
 * and the PDF of it saved under the report's number.
 *
 * @author Wang Ziyu
 */

const filed: Detail = {
  id: 42,
  elderId: 1,
  audience: 'INTERNAL',
  periodStart: '2026-09-14',
  periodEnd: '2026-09-20',
  status: 'PUBLISHED',
  dataComplete: false,
  missingItems: ['Visit 13 on 2026-09-18 not closed'],
  generatedBy: 'TEMPLATE',
  createdAt: '2026-09-20T23:00:00',
  archivedAt: null,
  sections: [{ key: 'service-completion', title: 'Service completion', body: '3 visits: 1 scheduled, 2 verified.' }],
  disclaimer: null,
  amendments: [],
}

beforeEach(() => {
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockImplementation(async ({ size }) => ({ items: [], page: 0, size, totalElements: 0 }))
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 11, username: 'alice', displayName: 'Alice Tan', roles: ['MANAGER'] })
  vi.spyOn(profileApi, 'fetchCredentialRegister').mockResolvedValue([])
  vi.spyOn(rosteringApi, 'fetchVisitsAtRisk').mockResolvedValue([])
  vi.spyOn(reportsApi, 'getReport').mockResolvedValue(filed)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderReport(id: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/manager/reports/${id}`]}>
        <Routes>
          <Route path="/manager/reports/:id" element={<ReportDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('saves the report as a PDF named by its number', async () => {
  const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
  const exportReport = vi.spyOn(reportsApi, 'exportReport').mockResolvedValue(pdf)
  const saveFile = vi.spyOn(download, 'saveFile').mockImplementation(() => undefined)

  renderReport(42)
  await screen.findByRole('heading', { name: 'Internal report — Elder #1' })
  await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))

  expect(exportReport).toHaveBeenCalledWith(42)
  expect(saveFile).toHaveBeenCalledWith(pdf, 'care-report-42.pdf')
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('says why the PDF could not be made and leaves the report on screen', async () => {
  vi.spyOn(reportsApi, 'exportReport').mockRejectedValue(
    new ApiError('The report could not be exported (HTTP 503)', 503, {
      title: 'Report export unavailable',
      detail: 'The PDF could not be produced. The report itself is unchanged and can still be read; try the export again.',
    }),
  )
  const saveFile = vi.spyOn(download, 'saveFile').mockImplementation(() => undefined)

  renderReport(42)
  await screen.findByRole('heading', { name: 'Internal report — Elder #1' })
  await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('The report itself is unchanged')
  expect(saveFile).not.toHaveBeenCalled()
  expect(screen.getByRole('region', { name: 'Service completion' })).toBeInTheDocument()
})

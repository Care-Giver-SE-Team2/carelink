import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import ReportList from './ReportList'
import * as authApi from '../../../../features/auth/api'
import * as incidentsApi from '../../../../features/incidents/api'
import * as reportsApi from '../../../../features/reports/api'
import * as profileApi from '../../../../shared/api/profile'
import * as rosteringApi from '../../../../shared/api/rostering'

/**
 * The manager's UC-MG07 report list against a stubbed API.
 *
 * @author Wang Ziyu
 */

beforeEach(() => {
  vi.spyOn(incidentsApi, 'listIncidentQueue').mockImplementation(async ({ size }) => ({ items: [], page: 0, size, totalElements: 0 }))
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 11, username: 'alice', displayName: 'Alice Tan', roles: ['MANAGER'] })
  vi.spyOn(profileApi, 'fetchCredentialRegister').mockResolvedValue([])
  vi.spyOn(rosteringApi, 'fetchVisitsAtRisk').mockResolvedValue([])
  vi.spyOn(reportsApi, 'listReports').mockResolvedValue({ items: [], page: 0, size: 30, totalElements: 0 })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('says when the weekly run files the reports', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/manager/reports']}>
        <ReportList />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  expect(
    await screen.findByText(/Every Sunday at 23:00 \(Singapore time\), the week's reports are filed automatically\./),
  ).toBeInTheDocument()
  expect(await screen.findByText(/No reports are on file here yet/)).toBeInTheDocument()
})

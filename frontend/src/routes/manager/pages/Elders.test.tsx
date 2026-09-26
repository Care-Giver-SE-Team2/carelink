import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import Elders from './Elders'
import * as authApi from '../../../features/auth/api'
import * as carePlanApi from '../../../shared/api/careplan'
import * as profileApi from '../../../shared/api/profile'
import type { ElderListItem } from '../../../shared/api/profile'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const elders: ElderListItem[] = [
  { id: 1, fullName: 'Chan Bee Choo', dateOfBirth: '1943-01-01', address: 'Bishan St 23', sector: 'S31', planStatus: 'published', planVersion: 4, nextVisitDate: null },
  { id: 2, fullName: 'Goh Bee Lian', dateOfBirth: '1938-01-01', address: 'Bishan St 11', sector: 'S31', planStatus: 'none', planVersion: null, nextVisitDate: null },
  { id: 3, fullName: 'Kamala Devi Rajan', dateOfBirth: '1950-01-01', address: 'Toa Payoh Lor 4', sector: 'S34', planStatus: 'draft', planVersion: 5, nextVisitDate: null },
]

beforeEach(() => {
  vi.spyOn(authApi, 'getCurrentUser').mockResolvedValue({ id: 1, username: 'tml', displayName: 'Tan Mei Ling', roles: ['MANAGER'] })
  vi.spyOn(profileApi, 'fetchElderList').mockResolvedValue(elders)
  vi.spyOn(carePlanApi, 'fetchLatestCarePlan').mockResolvedValue(null)
})

function renderElders() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/manager/elders']}>
        <Routes>
          <Route path="/manager/elders" element={<Elders />} />
          <Route path="/manager/elders/:elderId" element={<p>care plan page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('previews the selected elder in the rail, offering Create care plan when there is none', async () => {
  renderElders()
  expect(screen.getByText('Select an elder to preview their care plan.')).toBeInTheDocument()

  fireEvent.click(await screen.findByRole('option', { name: /Goh Bee Lian/ }))

  expect(screen.getByRole('option', { name: /Goh Bee Lian/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('No plan published yet.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Create care plan' })).toBeInTheDocument()
})

it('moves the selection with the arrow keys and opens the plan on Enter', async () => {
  renderElders()
  const list = await screen.findByRole('listbox', { name: 'Elders' })
  await screen.findByRole('option', { name: /Chan Bee Choo/ })

  // No-plan elders float to the top: Goh Bee Lian, then Chan Bee Choo, then Kamala Devi Rajan.
  fireEvent.keyDown(list, { key: 'ArrowDown' })
  fireEvent.keyDown(list, { key: 'ArrowDown' })
  expect(screen.getByRole('option', { name: /Chan Bee Choo/ })).toHaveAttribute('aria-selected', 'true')

  fireEvent.keyDown(list, { key: 'Enter' })
  expect(await screen.findByText('care plan page')).toBeInTheDocument()
})

it('filters by name after the search debounce', async () => {
  renderElders()
  await screen.findByRole('option', { name: /Kamala/ })
  vi.useFakeTimers()

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search elders by name or ID' }), { target: { value: 'bee' } })
  expect(screen.getByRole('option', { name: /Kamala/ })).toBeInTheDocument()

  act(() => vi.advanceTimersByTime(200))
  expect(screen.queryByRole('option', { name: /Kamala/ })).not.toBeInTheDocument()
  expect(screen.getByText('2 of 3 shown · matching "bee"')).toBeInTheDocument()
})

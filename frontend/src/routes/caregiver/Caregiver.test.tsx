import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import CaregiverHome from './index'
import type { Schedule, WorkPack } from '../../features/caregiver/api'

const day = '2026-09-24'
const visit = { id: 41, elderId: 7, elderName: 'Demo Elder Mei', serviceType: 'MORNING_CARE',
  scheduledStart: day + 'T09:00:00', scheduledEnd: day + 'T10:00:00', status: 'SCHEDULED', version: 0 }
const schedule: Schedule = { dateFrom: day, dateTo: day, timeZone: 'Asia/Singapore', upcomingVisits: [visit],
  certificationAlerts: [{ id: 1, name: 'First aid', certificateNo: null, expiryDate: '2026-09-23', status: 'EXPIRED', warning: 'EXPIRED' }] }
const pack: WorkPack = { visit, elder: { elderId: 7, preferredName: 'Demo Elder Mei', serviceAddress: 'Demo address',
  postalSector: 'North', languageNeeds: ['English'], accessNotes: null, emergencyNotes: null },
  carePlanId: 10, carePlanVersion: 1, serviceInstructions: ['Hygiene'],
  tasks: [{ id: 1, name: 'Hygiene', status: 'PENDING', outcome: null, caregiverNote: null }], requiredEvidenceKinds: ['CHECKLIST'] }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
let scheduleResponse: () => Promise<Response>
let packResponse: () => Promise<Response>
let profileResponse: () => Promise<Response>

beforeEach(() => {
  scheduleResponse = async () => reply(schedule)
  packResponse = async () => reply(pack)
  profileResponse = async () => reply({ id: 1, fullName: 'Caregiver A' })
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/auth/me') return Promise.resolve(reply({ username: 'a', displayName: 'Caregiver A', roles: ['CAREGIVER'] }))
    if (url === '/api/auth/csrf') return Promise.resolve(new Response(null, { status: 200 }))
    if (url === '/api/caregivers/me') return profileResponse()
    if (url.startsWith('/api/caregivers/me/schedule')) return scheduleResponse()
    if (url.endsWith('/work-pack')) return packResponse()
    if (url === '/api/auth/logout') return Promise.resolve(new Response(null, { status: 204 }))
    throw new Error('Unexpected URL: ' + url)
  }))
})
afterEach(() => vi.unstubAllGlobals())
function SwitchVisit() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/caregiver/visits/42')}>Other visit</button>
}
function mount(path = '/caregiver?dateFrom=' + day + '&dateTo=' + day) {
  return render(<MemoryRouter initialEntries={[path]}><SwitchVisit /><Routes>
    <Route path="/caregiver/*" element={<CaregiverHome />} />
    <Route path="/" element={<h1>Sign in</h1>} />
  </Routes></MemoryRouter>)
}
describe('caregiver read workflow', () => {
  it('shows assigned cards and alerts; work pack keeps the return date range', async () => {
    mount()
    expect(await screen.findByText('Demo Elder Mei')).toBeInTheDocument()
    expect(screen.getByText('First aid · Expired')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /View work pack/ }))
    expect(await screen.findByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText(/Read-only work pack/)).toBeInTheDocument()
    expect(screen.getByText('Checklist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← My schedule' })).toHaveAttribute('href', '/caregiver?dateFrom=' + day + '&dateTo=' + day)
    expect(screen.queryByRole('button', { name: /Check.in|Submit/ })).not.toBeInTheDocument()
  })
  it('opens a work pack directly after profile validation', async () => {
    mount('/caregiver/visits/41')
    expect(await screen.findByText('Version 1')).toBeInTheDocument()
    expect(screen.getByText('Demo address')).toBeInTheDocument()
  })
  it('shows a genuine empty schedule', async () => {
    scheduleResponse = async () => reply({ ...schedule, upcomingVisits: [] })
    mount()
    expect(await screen.findByText('No assigned visits in this period')).toBeInTheDocument()
  })
  it('rejects a reversed or excessively long date range without a new query', async () => {
    mount()
    await screen.findByText('Demo Elder Mei')
    const calls = vi.mocked(fetch).mock.calls.length
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose both dates')
    expect(vi.mocked(fetch).mock.calls).toHaveLength(calls)
  })
  it('clears the previous work pack immediately during retry and failure', async () => {
    mount('/caregiver/visits/41')
    await screen.findByText('Demo address')
    packResponse = async () => reply({}, 503)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.queryByText('Demo address')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load')
    packResponse = async () => reply(pack)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Demo address')).toBeInTheDocument()
  })
  it('does not reuse previous visit data on 403 after changing visit id', async () => {
    mount('/caregiver/visits/41')
    await screen.findByText('Demo address')
    packResponse = async () => reply({}, 403)
    fireEvent.click(screen.getByRole('button', { name: 'Other visit' }))
    expect(screen.queryByText('Demo address')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Access not permitted')
  })
  it('redirects an expired session and removes protected details', async () => {
    mount('/caregiver/visits/41')
    await screen.findByText('Demo address')
    packResponse = async () => reply({}, 401)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Demo address')).not.toBeInTheDocument()
  })
  it('shows missing profile and never requests clinical data', async () => {
    profileResponse = async () => reply({}, 404)
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('Caregiver profile not linked')
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/schedule'))).toBe(false)
  })
  it('ignores a late response from the previously viewed visit', async () => {
    let complete!: (response: Response) => void
    packResponse = () => new Promise(resolve => { complete = resolve })
    mount('/caregiver/visits/41')
    await waitFor(() => expect(complete).toBeDefined())
    packResponse = async () => reply({}, 404)
    fireEvent.click(screen.getByRole('button', { name: 'Other visit' }))
    await screen.findByText('Visit not found')
    await act(async () => complete(reply(pack)))
    expect(screen.queryByText('Demo address')).not.toBeInTheDocument()
  })
  it('sign out removes the work pack', async () => {
    mount('/caregiver/visits/41')
    await screen.findByText('Demo address')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Demo address')).not.toBeInTheDocument()
  })
})

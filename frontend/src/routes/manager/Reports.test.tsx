import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ManagerHome from './index'

/**
 * UC-MG07 through the manager console: generate a period's reports, find them
 * in the list, open one, append a correction.
 *
 * The fetch mock is a small server that remembers what was done to it, so a
 * screen that assembled its own next state instead of reading the server's
 * would be caught. Bodies are the shapes the backend serialises, copied from
 * `ReportControllerTest`'s output: `archivedAt: null`, section bodies with one
 * item per line and the timeline steps indented under their incident, and a
 * nanosecond `createdAt` on the answer to the request that filed the report.
 *
 * @author Wang Ziyu
 */

const DISCLAIMER =
  'This summary is prepared from care records for information only and does not constitute medical advice.'

const SECTIONS: Record<string, { title: string; body: string }[]> = {
  FAMILY: [
    {
      title: 'Service completion',
      body:
        '3 visits: 1 scheduled, 2 verified.\n' +
        'Mon 14 Sep 09:00 · Personal care · Daniel Goh · verified · evidence 2 of 2 verified\n' +
        'Wed 16 Sep 09:00 · Personal care · Daniel Goh · verified · evidence 2 of 2 verified\n' +
        'Fri 18 Sep 09:00 · Personal care · Daniel Goh · scheduled · no evidence',
    },
    {
      title: 'Vital signs',
      body: 'Systolic 128–142 mmHg\nDiastolic 82–88 mmHg\nPulse 72–76 bpm\nTemperature 36.6–36.8 °C',
    },
    {
      title: 'Observations',
      body:
        'Mon 14 Sep · Daniel Goh: Walked to the void deck with the cane, steady on her feet.\n' +
        'Wed 16 Sep · Daniel Goh: Ate half of lunch; said she was not hungry.',
    },
    {
      title: 'Incidents',
      body:
        'Tue 15 Sep 10:15 · Fall reported · Slipped getting out of the shower, no injury. · resolved Tue 15 Sep 11:02',
    },
  ],
  REGULATOR: [
    {
      title: 'Service completion',
      body:
        '3 visits: 1 scheduled, 2 verified.\n' +
        'Mon 14 Sep 09:00 · Personal care · caregiver #3 · verified · evidence 2 of 2 verified',
    },
    {
      title: 'Vital signs',
      body: 'Wed 16 Sep 09:10 · visit 12 · Systolic 142 mmHg · out of range',
    },
    {
      title: 'Observations',
      body: '2 observations recorded across 2 visits. The notes themselves are not included in this version.',
    },
    {
      title: 'Incidents',
      body:
        'Tue 15 Sep 10:15 · incident 2 · FALL · severity MEDIUM · RESOLVED · resolved Tue 15 Sep 11:02 · outcome HANDLED_ON_SITE\n' +
        '  Tue 15 Sep 10:21 · CLAIMED · staff',
    },
  ],
  INTERNAL: [
    {
      title: 'Service completion',
      body:
        '3 visits: 1 scheduled, 2 verified.\n' +
        'Mon 14 Sep 09:00 · Personal care · Daniel Goh (caregiver #3) · verified · evidence 2 of 2 verified',
    },
    {
      title: 'Vital signs',
      body: 'Wed 16 Sep 09:10 · visit 12 · Systolic 142 mmHg · out of range',
    },
    {
      title: 'Observations',
      body: 'Mon 14 Sep 09:00 · visit 11 · Daniel Goh (caregiver #3) · Mobility: Walked to the void deck with the cane, steady on her feet.',
    },
    {
      title: 'Incidents',
      body:
        'Tue 15 Sep 10:15 · incident 2 · FALL · severity MEDIUM · RESOLVED · Slipped getting out of the shower, no injury.\n' +
        '  Tue 15 Sep 10:21 · CLAIMED · Ben Lim (demo-ben) · taken over; countdown stopped\n' +
        '  Resolution: HANDLED_ON_SITE :: No injury. Bathroom grab bar to be fitted this week.',
    },
  ],
}

const AUDIENCES = ['FAMILY', 'REGULATOR', 'INTERNAL'] as const

function summary(id: number, audience: string, createdAt: string) {
  return {
    id,
    elderId: 1,
    audience,
    periodStart: '2026-09-14',
    periodEnd: '2026-09-20',
    status: 'PUBLISHED',
    dataComplete: false,
    missingItems: ['Visit 13 on 2026-09-18 not closed'],
    generatedBy: 'TEMPLATE',
    createdAt,
    archivedAt: null,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Amendment = { id: number; note: string; authorUserId: number; createdAt: string }

/**
 * A stand-in for the report module that remembers what it has filed and what
 * has been appended, so every read after a write returns the new state.
 */
function createServer(options: { alreadyFiled?: boolean; listStatus?: number } = {}) {
  const filed = new Map<number, { summary: ReturnType<typeof summary>; amendments: Amendment[] }>()

  function file(createdAt: string) {
    AUDIENCES.forEach((audience, index) => {
      const id = 40 + index
      if (!filed.has(id)) filed.set(id, { summary: summary(id, audience, createdAt), amendments: [] })
    })
  }

  if (options.alreadyFiled) {
    file('2026-09-20T23:00:00')
    filed.get(42)?.amendments.push({
      id: 1,
      note: 'Visit 13 was cancelled by the family.',
      authorUserId: 11,
      createdAt: '2026-09-21T09:30:00',
    })
  }

  const fetchMock = vi.fn().mockImplementation((input: string, init: RequestInit = {}) => {
    const url = String(input)
    const method = (init.method ?? 'GET').toUpperCase()

    if (url.endsWith('/auth/csrf')) {
      document.cookie = 'XSRF-TOKEN=manager-token; path=/'
      return Promise.resolve(new Response(null))
    }

    if (url.endsWith('/auth/me')) {
      return Promise.resolve(
        json({ id: 11, username: 'demo-alice', displayName: 'Alice Tan', roles: ['MANAGER'] }),
      )
    }

    if (url.startsWith('/api/reports?')) {
      if (options.listStatus) return Promise.resolve(new Response(null, { status: options.listStatus }))
      const audience = new URLSearchParams(url.split('?')[1]).get('audience')
      const items = [...filed.values()]
        .map((entry) => entry.summary)
        .filter((report) => !audience || report.audience === audience)
      return Promise.resolve(json({ items, page: 0, size: 30, totalElements: items.length }))
    }

    const body = init.body ? JSON.parse(String(init.body)) : {}

    if (url === '/api/reports/generate' && method === 'POST') {
      if (body.periodEnd < body.periodStart) {
        return Promise.resolve(
          json(
            {
              status: 400,
              title: 'Invalid request',
              detail: 'Request validation failed',
              fields: { periodInOrder: 'periodEnd must not be before periodStart' },
            },
            400,
          ),
        )
      }
      file('2026-09-24T11:19:45.851234567')
      return Promise.resolve(json([...filed.values()].map((entry) => entry.summary), 202))
    }

    const amend = /^\/api\/reports\/(\d+)\/amendments$/.exec(url)
    if (amend && method === 'POST') {
      if (!String(body.note ?? '').trim()) {
        return Promise.resolve(
          json(
            {
              status: 400,
              title: 'Invalid request',
              detail: 'Request validation failed',
              fields: { note: 'note is required' },
            },
            400,
          ),
        )
      }
      const entry = filed.get(Number(amend[1]))
      const stored = { id: 7, note: body.note, authorUserId: 11, createdAt: '2026-09-24T11:25:02.118000000' }
      entry?.amendments.push(stored)
      return Promise.resolve(json(stored, 201))
    }

    const read = /^\/api\/reports\/(\d+)$/.exec(url)
    if (read && method === 'GET') {
      const entry = filed.get(Number(read[1]))
      if (!entry) {
        return Promise.resolve(
          json({ status: 404, title: 'Resource not found', detail: `Report [${read[1]}] does not exist` }, 404),
        )
      }
      return Promise.resolve(
        json({
          ...entry.summary,
          sections: SECTIONS[entry.summary.audience],
          disclaimer: entry.summary.audience === 'FAMILY' ? DISCLAIMER : null,
          amendments: entry.amendments,
        }),
      )
    }

    throw new Error('the manager console asked for ' + method + ' ' + url)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function openConsole(path: string) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>Sign in to CareLink</p>} />
          <Route path="/manager/*" element={<ManagerHome />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function requestsTo(fetchMock: ReturnType<typeof vi.fn>, pattern: RegExp, method = 'GET') {
  return fetchMock.mock.calls.filter(
    ([url, init]) => pattern.test(String(url)) && ((init as RequestInit | undefined)?.method ?? 'GET') === method,
  )
}

function generateForm() {
  return screen.getByRole('button', { name: 'Generate' }).closest('form') as HTMLFormElement
}

beforeEach(() => {
  // Thursday 24 September 2026: "last week" is Monday 14 to Sunday 20.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 24, 10, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('the report list', () => {
  it("offers last week, files the period's three reports and reads the list again", async () => {
    const fetchMock = createServer()
    openConsole('/manager/reports')
    const user = userEvent.setup()

    expect(await screen.findByText(/No reports are on file here yet/)).toBeInTheDocument()
    const form = within(generateForm())
    expect(form.getByLabelText('From')).toHaveValue('2026-09-14')
    expect(form.getByLabelText('To')).toHaveValue('2026-09-20')

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      '3 reports on file for 14 Sep – 20 Sep 2026, one elder.',
    )
    const rows = await screen.findAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(within(rows[1]).getByText('Family')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Regulator')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Internal')).toBeInTheDocument()
    expect(within(rows[1]).getByText('incomplete · 1 missing')).toBeInTheDocument()
    expect(within(rows[1]).getByText('24 Sep 2026 11:19')).toBeInTheDocument()

    const generated = requestsTo(fetchMock, /\/api\/reports\/generate$/, 'POST')
    expect(generated).toHaveLength(1)
    expect(JSON.parse(String(generated[0][1].body))).toEqual({
      periodStart: '2026-09-14',
      periodEnd: '2026-09-20',
    })
    expect(new Headers(generated[0][1].headers).get('X-XSRF-TOKEN')).toBe('manager-token')
    expect(requestsTo(fetchMock, /\/api\/reports\?/)).toHaveLength(2)
  })

  it('names the elder when the manager asks for one', async () => {
    const fetchMock = createServer()
    openConsole('/manager/reports')
    const user = userEvent.setup()

    await user.type(within(generateForm()).getByLabelText('Elder #'), '1')
    await user.click(screen.getByRole('button', { name: 'Generate' }))

    await screen.findByRole('status')
    const generated = requestsTo(fetchMock, /\/api\/reports\/generate$/, 'POST')
    expect(JSON.parse(String(generated[0][1].body))).toMatchObject({ elderId: 1 })
  })

  /* A blank elder means every elder, so a typo must not be sent as one. */
  it('refuses an elder that is not a number rather than generating for everybody', async () => {
    const fetchMock = createServer()
    openConsole('/manager/reports')
    const user = userEvent.setup()

    await user.type(within(generateForm()).getByLabelText('Elder #'), 'Grace')
    await user.click(screen.getByRole('button', { name: 'Generate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Elder # has to be a whole number')
    expect(requestsTo(fetchMock, /\/api\/reports\/generate$/, 'POST')).toHaveLength(0)
  })

  it("shows the server's reason when a period is refused", async () => {
    createServer()
    openConsole('/manager/reports')
    const user = userEvent.setup()

    fireEvent.change(within(generateForm()).getByLabelText('From'), { target: { value: '2026-09-20' } })
    fireEvent.change(within(generateForm()).getByLabelText('To'), { target: { value: '2026-09-14' } })
    await user.click(screen.getByRole('button', { name: 'Generate' }))

    const refusal = await screen.findByRole('alert')
    expect(refusal).toHaveTextContent('periodInOrder: periodEnd must not be before periodStart')
    expect(refusal).not.toHaveTextContent('Request failed with status 400.')
  })

  it('narrows the list to one reader', async () => {
    createServer({ alreadyFiled: true })
    openConsole('/manager/reports')
    const user = userEvent.setup()

    expect(await screen.findAllByRole('row')).toHaveLength(4)
    await user.selectOptions(screen.getByLabelText('Reader'), 'REGULATOR')

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2))
    expect(within(screen.getAllByRole('row')[1]).getByText('Regulator')).toBeInTheDocument()
  })

  /* The manager console has no session guard of its own; the screen that met the 401 sends the manager back. */
  it('returns to sign in when the session has expired', async () => {
    createServer({ listStatus: 401 })
    openConsole('/manager/reports')

    expect(await screen.findByText('Sign in to CareLink')).toBeInTheDocument()
  })
})

describe('one report', () => {
  it('opens from the list with its sections in order, the gap named at the top and the disclaimer under it', async () => {
    createServer({ alreadyFiled: true })
    openConsole('/manager/reports')
    const user = userEvent.setup()

    const rows = await screen.findAllByRole('row')
    await user.click(within(rows[1]).getByRole('link', { name: '14 Sep – 20 Sep 2026' }))

    expect(await screen.findByText('Family report — Elder #1')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Data incomplete',
      'Service completion',
      'Vital signs',
      'Observations',
      'Incidents',
      'Corrections — appended, never edited',
    ])
    expect(
      within(screen.getByRole('region', { name: 'Data incomplete' })).getByText('Visit 13 on 2026-09-18 not closed'),
    ).toBeInTheDocument()
    expect(screen.getByText('Systolic 128–142 mmHg')).toBeInTheDocument()
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
    expect(screen.getByText('No corrections have been appended.')).toBeInTheDocument()
  })

  it('shows the internal version without a disclaimer, the timeline under its incident, and its corrections', async () => {
    createServer({ alreadyFiled: true })
    openConsole('/manager/reports/42')

    expect(await screen.findByText('Internal report — Elder #1')).toBeInTheDocument()
    expect(screen.queryByText(DISCLAIMER)).not.toBeInTheDocument()
    expect(
      screen.getByText('Tue 15 Sep 10:21 · CLAIMED · Ben Lim (demo-ben) · taken over; countdown stopped'),
    ).toBeInTheDocument()
    expect(screen.getByText('Visit 13 was cancelled by the family.')).toBeInTheDocument()
    expect(screen.getByText('21 Sep 2026 09:30 · user #11')).toBeInTheDocument()
  })

  it('appends a correction and reads the report again rather than adding it on screen', async () => {
    const fetchMock = createServer({ alreadyFiled: true })
    openConsole('/manager/reports/40')
    const user = userEvent.setup()

    await screen.findByText('Family report — Elder #1')
    await user.type(screen.getByLabelText('Correction'), 'Grace was in hospital on Friday; the visit was not due.')
    await user.click(screen.getByRole('button', { name: 'Append correction' }))

    expect(
      await screen.findByText('Grace was in hospital on Friday; the visit was not due.'),
    ).toBeInTheDocument()
    expect(screen.getByText('24 Sep 2026 11:25 · user #11')).toBeInTheDocument()
    expect(screen.getByLabelText('Correction')).toHaveValue('')

    const appended = requestsTo(fetchMock, /\/api\/reports\/40\/amendments$/, 'POST')
    expect(JSON.parse(String(appended[0][1].body))).toEqual({
      note: 'Grace was in hospital on Friday; the visit was not due.',
    })
    expect(new Headers(appended[0][1].headers).get('X-XSRF-TOKEN')).toBe('manager-token')
    expect(requestsTo(fetchMock, /\/api\/reports\/40$/)).toHaveLength(2)
  })

  it("shows the server's reason when a correction is refused, and stays on the report", async () => {
    createServer({ alreadyFiled: true })
    openConsole('/manager/reports/40')
    const user = userEvent.setup()

    await screen.findByText('Family report — Elder #1')
    await user.click(screen.getByRole('button', { name: 'Append correction' }))

    const refusal = await screen.findByRole('alert')
    expect(refusal).toHaveTextContent('Request validation failed — note: note is required')
    expect(refusal).not.toHaveTextContent('Request failed with status 400.')
    expect(screen.getByText('Family report — Elder #1')).toBeInTheDocument()
  })

  it("shows the server's sentence for a report that does not exist", async () => {
    createServer()
    openConsole('/manager/reports/99')

    expect(await screen.findByRole('alert')).toHaveTextContent('Report [99] does not exist')
    expect(screen.getByRole('link', { name: 'Back to reports' })).toBeInTheDocument()
  })

  it('says so when the address is not a report number', async () => {
    createServer()
    openConsole('/manager/reports/latest')

    expect(await screen.findByText('That is not a report number.')).toBeInTheDocument()
  })
})

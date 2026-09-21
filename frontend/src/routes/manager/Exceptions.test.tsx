import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ManagerHome from './index'

/**
 * UC-MG05 end to end through the manager console: queue, take-over, family
 * contact, playbook, severity, close.
 *
 * The fetch mock is a small server rather than a table of canned answers,
 * because the behaviour worth proving is that the screen reads the state back
 * after every write instead of assembling it. Bodies are the shapes the
 * deployed backend sends, `closed` and nanosecond timestamps included.
 *
 * @author Wang Ziyu
 */

const unroutedSos = {
  id: 3,
  elderId: 1,
  visitId: null,
  reportedByUserId: 5,
  responderUserId: null,
  source: 'ELDER_SOS',
  category: 'SOS',
  severity: 'HIGH',
  status: 'OPEN',
  latitude: null,
  longitude: null,
  locationText: null,
  description: null,
  respondBy: null,
  reportedAt: '2026-09-21T15:55:49.849359769',
  resolvedAt: null,
  closed: false,
}

const routedFall = {
  id: 4,
  elderId: 2,
  visitId: 41,
  reportedByUserId: 6,
  responderUserId: 12,
  source: 'CAREGIVER',
  category: 'FALL',
  severity: 'HIGH',
  status: 'OPEN',
  latitude: null,
  longitude: null,
  locationText: 'Blk 123 #04-56',
  description: 'Found on the bathroom floor, conscious, refusing an ambulance.',
  respondBy: '2026-09-21T16:10:00',
  reportedAt: '2026-09-21T15:55:00',
  resolvedAt: null,
  closed: false,
}

const fallPlaybook = {
  code: 'PB-FALL',
  category: 'FALL',
  title: 'Fall reported',
  steps: [
    'Do not move the elder; confirm consciousness and pain location by phone',
    'Dispatch the nearest caregiver on shift',
  ],
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** The 409 the domain throws when a failed call to the family carries no reason. */
const contactReasonRequired = {
  status: 409,
  title: 'Operation not allowed by a business rule',
  detail: 'A contact attempt that did not reach the family needs a reason',
  code: 'CONTACT_REASON_REQUIRED',
}

/**
 * A stand-in for the incident module that remembers what has been done to it,
 * so a refreshed read returns the new state and a screen that invented one
 * would be caught.
 */
function createServer(options: { resolveStatus?: number; queueStatus?: number } = {}) {
  const incidents: Record<number, Record<string, unknown>> = {
    3: { ...unroutedSos },
    4: { ...routedFall },
  }
  const timelines: Record<number, unknown[]> = {
    3: [],
    4: [
      {
        actor: 'system',
        action: 'BROADCAST',
        detail: 'alerted 3 managers',
        occurredAt: '2026-09-21T15:55:00.120000000',
      },
      {
        actor: 'system',
        action: 'ASSIGNED',
        detail: 'assigned to Ben Lim',
        occurredAt: '2026-09-21T15:55:00.480000000',
      },
    ],
  }

  function entry(action: string, detail: string) {
    timelines[4].push({ actor: 'Alice Tan (demo-alice)', action, detail, occurredAt: '2026-09-21T15:58:03' })
  }

  const fetchMock = vi.fn().mockImplementation((input: string, init: RequestInit = {}) => {
    const url = String(input)
    const method = (init.method ?? 'GET').toUpperCase()

    if (url.endsWith('/auth/csrf')) {
      document.cookie = 'XSRF-TOKEN=manager-token; path=/'
      return Promise.resolve(new Response(null))
    }

    if (url.startsWith('/api/incidents?')) {
      if (options.queueStatus) return Promise.resolve(new Response(null, { status: options.queueStatus }))
      const open = Object.values(incidents).filter((incident) => incident.status !== 'RESOLVED')
      return Promise.resolve(
        json({ items: [incidents[4], incidents[3]].filter((i) => open.includes(i)), page: 0, size: 20, totalElements: open.length }),
      )
    }

    if (url === '/api/incident-playbooks') {
      return Promise.resolve(json([fallPlaybook]))
    }

    const chain = /^\/api\/incidents\/(\d+)\/escalation-chain$/.exec(url)
    if (chain) {
      const incident = incidents[Number(chain[1])]
      return Promise.resolve(
        json({
          incidentId: incident.id,
          assembledAt: '2026-09-21T15:55:00.900000000',
          severity: incident.severity,
          assembledFrom: `severity ${incident.severity}, office hours, duty roster`,
          levels: [
            {
              position: 1,
              tier: 'Assigned responder',
              responderUserId: 12,
              responderName: 'Ben Lim',
              countdownMinutes: 5,
              state: 'CURRENT',
            },
            {
              position: 2,
              tier: 'Manager who knows this elder',
              responderUserId: null,
              responderName: null,
              countdownMinutes: 10,
              state: 'SKIPPED_UNAVAILABLE',
            },
          ],
        }),
      )
    }

    const action = /^\/api\/incidents\/(\d+)(?:\/([a-z-]+))?$/.exec(url)
    if (!action) throw new Error('the manager console asked for ' + url)

    const incident = incidents[Number(action[1])]

    if (method === 'GET') {
      return Promise.resolve(
        json({
          incident,
          suggestedPlaybookCode: incident.category === 'FALL' ? 'PB-FALL' : 'PB-SOS',
          timeline: timelines[Number(action[1])],
        }),
      )
    }

    const body = init.body ? JSON.parse(String(init.body)) : {}

    switch (action[2]) {
      case 'claim':
        incident.status = 'IN_PROGRESS'
        incident.responderUserId = 11
        incident.respondBy = null
        entry('CLAIMED', 'taken over; countdown stopped')
        return Promise.resolve(json(incident))

      case 'contact-attempts':
        if (body.outcome === 'NOT_REACHED' && !body.note) {
          return Promise.resolve(json(contactReasonRequired, 409))
        }
        entry('CONTACT_ATTEMPTED', `${body.channel}: ${body.outcome}`)
        return Promise.resolve(
          json(
            {
              reachedTheFamily: body.outcome === 'REACHED',
              recorded: `${body.channel}: ${body.outcome}`,
              fallbackPlaybook: body.outcome === 'REACHED' ? null : fallPlaybook,
            },
            201,
          ),
        )

      case 'playbook':
        entry('PLAYBOOK_APPLIED', `${body.playbookCode} - Fall reported`)
        return Promise.resolve(json(incident))

      case 'severity':
        entry('SEVERITY_CHANGED', `${incident.severity} -> ${body.severity}: ${body.reason}`)
        incident.severity = body.severity
        return Promise.resolve(json(incident))

      case 'resolve':
        if (options.resolveStatus === 403) {
          return Promise.resolve(
            json(
              {
                status: 403,
                title: 'Insufficient permission',
                detail: 'Only the responder handling this incident may resolve it',
              },
              403,
            ),
          )
        }
        incident.status = 'RESOLVED'
        entry('RESOLVED', `${body.outcome} :: ${body.resolutionNote}`)
        return Promise.resolve(json(incident))

      default:
        throw new Error('the manager console posted to ' + url)
    }
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function openConsole(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Sign in to CareLink</p>} />
        <Route path="/manager/*" element={<ManagerHome />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('the exception queue', () => {
  it('lists what still needs attention, deadline first, and names what nobody was assigned', async () => {
    createServer()
    openConsole('/manager/exceptions')

    const cards = await screen.findAllByRole('listitem')
    expect(cards).toHaveLength(2)

    const fall = within(cards[0])
    expect(fall.getByText('EXC-4')).toBeInTheDocument()
    expect(fall.getByText('SEV 1 HIGH')).toBeInTheDocument()
    expect(fall.getByText('Open')).toBeInTheDocument()
    expect(fall.getByText('Fall reported — Elder #2')).toBeInTheDocument()
    expect(fall.getByText('responder #12')).toBeInTheDocument()
    expect(fall.getByText(/respond by 21 Sep 16:10/)).toBeInTheDocument()

    const sos = within(cards[1])
    expect(sos.getByText('EXC-3')).toBeInTheDocument()
    expect(sos.getByText('responder unassigned')).toBeInTheDocument()
    expect(sos.getByText('no response deadline')).toBeInTheDocument()
    expect(sos.getByText(/respond by not set/)).toBeInTheDocument()
  })

  it('takes an incident over from the queue and opens the workbench on it', async () => {
    const fetchMock = createServer()
    openConsole('/manager/exceptions')

    const user = userEvent.setup()
    const cards = await screen.findAllByRole('listitem')
    await user.click(within(cards[0]).getByRole('button', { name: 'Take over' }))

    expect(await screen.findByText('Audit timeline — every entry immutable')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()

    const claims = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/4/claim'))
    expect(claims).toHaveLength(1)
    expect(new Headers(claims[0][1].headers).get('X-XSRF-TOKEN')).toBe('manager-token')
  })

  /* The manager console frames its own shell and has no session guard, so an
     expired session has to be caught by the screen that met it. */
  it('returns to sign in when the session has expired', async () => {
    createServer({ queueStatus: 401 })
    openConsole('/manager/exceptions')

    expect(await screen.findByText('Sign in to CareLink')).toBeInTheDocument()
  })
})

describe('the take-over workbench', () => {
  it('walks one incident from take-over to close, reading the state back each time', async () => {
    createServer()
    openConsole('/manager/exceptions/4')
    const user = userEvent.setup()

    // A2 — the whole timeline, the chain and the standard response for a fall.
    expect(
      await screen.findByText('Found on the bathroom floor, conscious, refusing an ambulance.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Everyone who could act was told')).toBeInTheDocument()
    expect(screen.getByText('Responsibility assigned')).toBeInTheDocument()
    expect(screen.getByText('Ben Lim')).toBeInTheDocument()
    expect(screen.getByText('nobody available')).toBeInTheDocument()
    expect(screen.getByText('PB-FALL — Fall reported')).toBeInTheDocument()
    expect(screen.getByText(/respond by 21 Sep 16:10/)).toBeInTheDocument()

    // A3 — taking it over stops the countdown, and the screen reads that back.
    await user.click(screen.getByRole('button', { name: 'Take over' }))
    expect(await screen.findByText('Taken over')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText(/respond by not set/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take over' })).not.toBeInTheDocument()

    // A5 — the server's sentence, not "Request failed with status 409."
    await user.click(screen.getByRole('button', { name: 'Contact family' }))
    await user.selectOptions(screen.getByLabelText('Outcome'), 'NOT_REACHED')
    await user.click(screen.getByRole('button', { name: 'Record contact attempt' }))

    const refusal = await screen.findByRole('alert')
    expect(refusal).toHaveTextContent(
      'A contact attempt that did not reach the family needs a reason',
    )
    expect(refusal).not.toHaveTextContent('Request failed with status 409.')

    // A4 — with a reason it is recorded, and the fallback playbook is offered.
    await user.type(screen.getByLabelText('Note'), 'rang twice, no answer')
    await user.click(screen.getByRole('button', { name: 'Record contact attempt' }))

    const fallback = (await screen.findByText('Family not reached — fall back on PB-FALL'))
      .closest('section') as HTMLElement
    expect(
      within(fallback).getByText('Dispatch the nearest caregiver on shift'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Family contact attempted')).toBeInTheDocument()

    // A6 — applying it lands on the timeline and the offer is put away.
    await user.click(screen.getByRole('button', { name: 'Apply PB-FALL' }))
    expect(await screen.findByText('Playbook applied')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByText('Family not reached — fall back on PB-FALL'),
      ).not.toBeInTheDocument(),
    )

    // A7 — the chain is assembled again for the new severity.
    await user.click(screen.getByRole('button', { name: 'Change severity' }))
    await user.selectOptions(screen.getByLabelText('Severity'), 'MEDIUM')
    await user.type(screen.getByLabelText('Reason'), 'stable on arrival')
    await user.click(screen.getByRole('button', { name: 'Save new severity' }))

    expect(await screen.findByText('Severity changed')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByText('severity MEDIUM, office hours, duty roster'),
      ).toBeInTheDocument(),
    )

    // A8 — closing it puts every action away and leaves the record behind.
    await user.click(screen.getByRole('button', { name: 'Resolve' }))
    await user.type(screen.getByLabelText('Resolution note'), 'caregiver stayed until the family arrived')
    await user.click(screen.getByRole('button', { name: 'Close incident' }))

    expect(await screen.findByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Contact family' })).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    expect(screen.getByText('Everyone who could act was told')).toBeInTheDocument()
  })

  it('shows why somebody else’s incident cannot be closed, and stays on the screen', async () => {
    createServer({ resolveStatus: 403 })
    openConsole('/manager/exceptions/4')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Take over' }))
    await user.click(await screen.findByRole('button', { name: 'Resolve' }))
    await user.type(screen.getByLabelText('Resolution note'), 'not mine to close')
    await user.click(screen.getByRole('button', { name: 'Close incident' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the responder handling this incident may resolve it',
    )
    expect(screen.getByText('Audit timeline — every entry immutable')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })
})

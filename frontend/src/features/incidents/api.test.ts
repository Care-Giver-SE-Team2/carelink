import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyPlaybook,
  changeSeverity,
  claimIncident,
  escalateIncident,
  getEscalationChain,
  getIncident,
  listIncidentQueue,
  listPlaybooks,
  recordContactAttempt,
  resolveIncident,
} from './api'
import { ApiError } from '../../shared/api/client'

/**
 * The request each function makes and the body it hands back, against responses
 * shaped exactly as the deployed backend sends them — including `closed`, which
 * Jackson derives from the record's `isClosed()` and which no TypeScript type
 * here declares.
 *
 * @author Wang Ziyu
 */

/** An unrouted SOS: nobody named on it, no deadline. Real, and the awkward case. */
const unroutedIncident = {
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Answers the CSRF bootstrap like the server does, then everything else with `body`. */
function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.endsWith('/csrf')) {
      document.cookie = 'XSRF-TOKEN=queue-token; path=/'
      return Promise.resolve(new Response(null))
    }
    return Promise.resolve(json(body, status))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The last call that was not the CSRF bootstrap. */
function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls.filter(([url]) => !String(url).endsWith('/csrf'))
  return { url: String(calls[calls.length - 1][0]), init: calls[calls.length - 1][1] as RequestInit }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
})

describe('incident API reads', () => {
  it('asks for the queue with the page, and with the filters only when they were chosen', async () => {
    const fetchMock = stubFetch({ items: [unroutedIncident], page: 0, size: 20, totalElements: 1 })

    await expect(listIncidentQueue({ page: 0, size: 20 })).resolves.toMatchObject({
      totalElements: 1,
    })
    expect(lastRequest(fetchMock).url).toBe('/api/incidents?page=0&size=20')

    await listIncidentQueue({ page: 2, size: 5, status: 'OPEN', severity: 'HIGH' })
    expect(lastRequest(fetchMock).url).toBe(
      '/api/incidents?page=2&size=5&status=OPEN&severity=HIGH',
    )
  })

  it('reads an incident, its chain and the playbooks without sending a body', async () => {
    const fetchMock = stubFetch({})

    await getIncident(3)
    expect(lastRequest(fetchMock).url).toBe('/api/incidents/3')

    await getEscalationChain(3)
    expect(lastRequest(fetchMock).url).toBe('/api/incidents/3/escalation-chain')

    await listPlaybooks()
    expect(lastRequest(fetchMock).url).toBe('/api/incident-playbooks')

    expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit).body === undefined)).toBe(
      true,
    )
  })

  it('hands back the timeline exactly as the server sent it', async () => {
    stubFetch({
      incident: unroutedIncident,
      suggestedPlaybookCode: 'PB-SOS',
      timeline: [
        {
          actor: 'system',
          action: 'BROADCAST',
          detail: 'alerted 3 managers',
          occurredAt: '2026-09-21T15:55:49.849359769',
        },
      ],
    })

    const detail = await getIncident(3)

    expect(detail.suggestedPlaybookCode).toBe('PB-SOS')
    expect(detail.timeline[0].action).toBe('BROADCAST')
    expect(detail.incident.responderUserId).toBeNull()
    expect(detail.incident.respondBy).toBeNull()
  })
})

describe('incident API writes', () => {
  it('initialises CSRF and sends the token on every write', async () => {
    const fetchMock = stubFetch(unroutedIncident)

    await claimIncident(3)

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/auth/csrf')
    const { url, init } = lastRequest(fetchMock)
    expect(url).toBe('/api/incidents/3/claim')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('queue-token')
  })

  it('sends each action to its own path with the body the contract names', async () => {
    const fetchMock = stubFetch(unroutedIncident)

    await escalateIncident(3, 'no answer from the duty manager')
    expect(lastRequest(fetchMock)).toMatchObject({
      url: '/api/incidents/3/escalate',
      init: { method: 'POST', body: JSON.stringify({ reason: 'no answer from the duty manager' }) },
    })

    await applyPlaybook(3, 'PB-SOS')
    expect(lastRequest(fetchMock)).toMatchObject({
      url: '/api/incidents/3/playbook',
      init: { body: JSON.stringify({ playbookCode: 'PB-SOS' }) },
    })

    await changeSeverity(3, 'HIGH', 'condition worsened')
    expect(lastRequest(fetchMock)).toMatchObject({
      url: '/api/incidents/3/severity',
      init: { body: JSON.stringify({ severity: 'HIGH', reason: 'condition worsened' }) },
    })

    await resolveIncident(3, { resolutionNote: 'ambulance called', outcome: 'REFERRED_TO_MEDICAL_CARE' })
    expect(lastRequest(fetchMock)).toMatchObject({
      url: '/api/incidents/3/resolve',
      init: {
        body: JSON.stringify({
          resolutionNote: 'ambulance called',
          outcome: 'REFERRED_TO_MEDICAL_CARE',
        }),
      },
    })
  })

  it('returns the fallback playbook the server offers when the family was not reached', async () => {
    const fetchMock = stubFetch(
      {
        reachedTheFamily: false,
        recorded: 'PHONE: not reached - no answer',
        fallbackPlaybook: {
          code: 'PB-SOS',
          category: 'SOS',
          title: 'Elder emergency call',
          steps: ['Call the elder directly; if there is no answer, treat as unresponsive'],
        },
      },
      201,
    )

    const result = await recordContactAttempt(3, {
      channel: 'PHONE',
      outcome: 'NOT_REACHED',
      note: 'no answer',
    })

    expect(result.reachedTheFamily).toBe(false)
    expect(result.fallbackPlaybook?.steps).toHaveLength(1)
    expect(lastRequest(fetchMock)).toMatchObject({
      url: '/api/incidents/3/contact-attempts',
      init: {
        method: 'POST',
        body: JSON.stringify({ channel: 'PHONE', outcome: 'NOT_REACHED', note: 'no answer' }),
      },
    })
  })

  it('throws the problem body through, so the rule that was broken survives the trip', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        url.endsWith('/csrf')
          ? Promise.resolve(new Response(null))
          : Promise.resolve(
              json(
                {
                  status: 409,
                  title: 'Operation not allowed by a business rule',
                  detail: 'A contact attempt that did not reach the family needs a reason',
                  code: 'CONTACT_REASON_REQUIRED',
                },
                409,
              ),
            ),
      ),
    )

    await expect(
      recordContactAttempt(3, { channel: 'PHONE', outcome: 'NOT_REACHED' }),
    ).rejects.toMatchObject({
      status: 409,
      body: { code: 'CONTACT_REASON_REQUIRED' },
    })

    await expect(
      recordContactAttempt(3, { channel: 'PHONE', outcome: 'NOT_REACHED' }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

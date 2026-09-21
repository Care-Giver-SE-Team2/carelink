import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../shared/api/client'
import {
  awaitingTakeOver,
  beingHandled,
  clockNow,
  countdown,
  incidentClock,
  incidentTime,
  problemDetail,
  timelineTitle,
} from './presentation'

/**
 * The two things the console gets wrong silently if nobody checks: a timestamp
 * read in the wrong zone, and an error message that says nothing.
 *
 * @author Wang Ziyu
 */

describe('incident timestamps', () => {
  /*
   * Both shapes are real. The seed script writes whole seconds; the application
   * writes nanoseconds, because that is what LocalDateTime.now() carries.
   */
  it.each([
    ['2026-09-09T10:15:00', '9 Sep 10:15', '10:15:00'],
    ['2026-09-21T15:55:49.849359769', '21 Sep 15:55', '15:55:49'],
    ['2026-01-02T00:00:00', '2 Jan 00:00', '00:00:00'],
    ['2026-12-31T23:59', '31 Dec 23:59', '23:59:00'],
  ])('reads %s without a time zone getting involved', (value, readable, clock) => {
    expect(incidentTime(value)).toBe(readable)
    expect(incidentClock(value)).toBe(clock)
  })

  /**
   * The same value formatted under two process time zones has to come out the
   * same. `new Date('2026-09-21T15:55:49')` would not: it reads the text as
   * local time, so CI in UTC and a browser in Singapore would disagree by eight
   * hours and the assertion above would pass or fail by luck.
   */
  it('does not move with the machine the code runs on', () => {
    vi.stubEnv('TZ', 'UTC')
    const asUtc = incidentTime('2026-09-21T15:55:49.849359769')
    vi.stubEnv('TZ', 'Pacific/Kiritimati')
    const asFarEast = incidentTime('2026-09-21T15:55:49.849359769')
    vi.unstubAllEnvs()

    expect(asUtc).toBe('21 Sep 15:55')
    expect(asFarEast).toBe('21 Sep 15:55')
  })

  it('says so rather than inventing a time when there is none', () => {
    expect(incidentTime(null)).toBe('Not available')
    expect(incidentTime('')).toBe('Not available')
    expect(incidentTime('yesterday')).toBe('Not available')
    expect(incidentClock(null)).toBe('--:--:--')
  })

  it('produces the current time in the shape the backend uses', () => {
    expect(clockNow()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  })
})

describe('response countdown', () => {
  it('counts down to the deadline in hours, minutes and seconds', () => {
    expect(countdown('2026-09-21T16:00:00', '2026-09-21T15:55:48')).toBe('00:04:12')
    expect(countdown('2026-09-21T18:30:30', '2026-09-21T15:55:48')).toBe('02:34:42')
  })

  it('keeps counting once the deadline has gone, with a sign rather than a zero', () => {
    expect(countdown('2026-09-21T15:55:00', '2026-09-21T15:56:30')).toBe('-00:01:30')
  })

  it('has nothing to show for an incident nobody routed', () => {
    expect(countdown(null, '2026-09-21T15:55:48')).toBeNull()
  })

  it('ignores the fractional seconds the application writes', () => {
    expect(countdown('2026-09-21T16:00:00', '2026-09-21T15:59:00.849359769')).toBe('00:01:00')
  })
})

describe('error bodies', () => {
  it('shows the rule the server named, not the status code', () => {
    const conflict = new ApiError('Request failed with status 409.', 409, {
      status: 409,
      title: 'Operation not allowed by a business rule',
      detail: 'A contact attempt that did not reach the family needs a reason',
      code: 'CONTACT_REASON_REQUIRED',
    })

    expect(problemDetail(conflict)).toBe(
      'A contact attempt that did not reach the family needs a reason',
    )
    expect(problemDetail(conflict)).not.toContain('409')
  })

  it('falls back to the title, and lists the fields a 400 complained about', () => {
    expect(problemDetail(new ApiError('', 403, { title: 'Insufficient permission' }))).toBe(
      'Insufficient permission',
    )
    expect(
      problemDetail(
        new ApiError('', 400, {
          title: 'Invalid request',
          fields: { resolutionNote: 'resolutionNote is required' },
        }),
      ),
    ).toBe('Invalid request — resolutionNote: resolutionNote is required')
  })

  it('says something usable when the failure never reached the server', () => {
    expect(problemDetail(new TypeError('Failed to fetch'))).toContain('Check your connection')
    expect(problemDetail(new ApiError('Request failed with status 500.', 500, null))).toBe(
      'Request failed with status 500.',
    )
  })
})

describe('what a manager may do next', () => {
  it('follows the status and nothing else', () => {
    expect(awaitingTakeOver('OPEN')).toBe(true)
    expect(awaitingTakeOver('ACKNOWLEDGED')).toBe(true)
    expect(awaitingTakeOver('IN_PROGRESS')).toBe(false)
    expect(beingHandled('IN_PROGRESS')).toBe(true)
    expect(beingHandled('RESOLVED')).toBe(false)
    expect(awaitingTakeOver('RESOLVED')).toBe(false)
  })
})

describe('timeline actions', () => {
  it('reads the known actions and passes an unknown one through untouched', () => {
    expect(timelineTitle('CLAIM_REJECTED')).toBe('Take-over refused')
    expect(timelineTitle('SOMETHING_ADDED_LATER')).toBe('SOMETHING_ADDED_LATER')
  })
})

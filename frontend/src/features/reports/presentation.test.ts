import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../shared/api/client'
import {
  amendmentKindLabels,
  audienceLabels,
  figureText,
  metricsLine,
  previousWeek,
  problemDetail,
  reportDay,
  reportNumber,
  reportPeriod,
  reportTime,
  sectionLines,
  sparkline,
  todayIso,
} from './presentation'

/**
 * The things the report screens get wrong silently if nobody checks: a date
 * read in the wrong zone, a "last week" that starts on the wrong day, and an
 * error message that says nothing.
 *
 * @author Wang Ziyu
 */

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('report dates', () => {
  it.each([
    ['2026-09-14', '14 Sep 2026'],
    ['2026-01-02', '2 Jan 2026'],
    ['2026-12-31', '31 Dec 2026'],
  ])('reads the date %s by its characters', (value, readable) => {
    expect(reportDay(value)).toBe(readable)
  })

  it('names the year once when a period does not cross one', () => {
    expect(reportPeriod('2026-09-14', '2026-09-20')).toBe('14 Sep – 20 Sep 2026')
    expect(reportPeriod('2026-08-31', '2026-09-06')).toBe('31 Aug – 6 Sep 2026')
    expect(reportPeriod('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027')
    expect(reportPeriod('2026-09-14', '2026-09-14')).toBe('14 Sep 2026')
  })

  /*
   * Both shapes are real: whole seconds when the report is read back from the
   * database, nanoseconds in the answer to the request that filed it.
   */
  it.each([
    ['2026-09-20T23:00:00', '20 Sep 2026 23:00'],
    ['2026-09-24T11:19:45.851234567', '24 Sep 2026 11:19'],
  ])('reads the timestamp %s without a time zone getting involved', (value, readable) => {
    expect(reportTime(value)).toBe(readable)
  })

  it('does not move with the machine the code runs on', () => {
    vi.stubEnv('TZ', 'Pacific/Honolulu')
    const west = [reportDay('2026-09-14'), reportTime('2026-09-20T23:00:00')]
    vi.stubEnv('TZ', 'Pacific/Kiritimati')
    const east = [reportDay('2026-09-14'), reportTime('2026-09-20T23:00:00')]

    expect(west).toEqual(['14 Sep 2026', '20 Sep 2026 23:00'])
    expect(east).toEqual(west)
  })

  it('says so rather than inventing a date when there is none', () => {
    expect(reportDay(null)).toBe('Not available')
    expect(reportTime(null)).toBe('Not available')
    expect(reportTime('yesterday')).toBe('Not available')
    expect(reportPeriod('', '2026-09-20')).toBe('Not available')
  })
})

describe('the default period', () => {
  it.each([
    ['2026-09-24', '2026-09-14', '2026-09-20'], // Thursday
    ['2026-09-21', '2026-09-14', '2026-09-20'], // Monday
    ['2026-09-27', '2026-09-14', '2026-09-20'], // Sunday: still the week before this one
    ['2026-01-01', '2025-12-22', '2025-12-28'], // across a year end
  ])('on %s last week is %s to %s', (today, start, end) => {
    expect(previousWeek(today)).toEqual({ start, end })
  })

  it('reads today off the browser calendar in the same form', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 24, 10, 30))

    expect(todayIso()).toBe('2026-09-24')
  })

  it('refuses something that is not a date', () => {
    expect(() => previousWeek('last week')).toThrow()
  })
})

describe('section text', () => {
  it('keeps the order of the lines and marks the indented timeline steps', () => {
    expect(
      sectionLines('Tue 15 Sep 10:15 · incident 2 · FALL\n  Tue 15 Sep 10:21 · CLAIMED · staff\n\n'),
    ).toEqual([
      { text: 'Tue 15 Sep 10:15 · incident 2 · FALL', nested: false },
      { text: 'Tue 15 Sep 10:21 · CLAIMED · staff', nested: true },
    ])
  })

  it('has a label for every reader', () => {
    expect(Object.keys(audienceLabels)).toEqual(['FAMILY', 'REGULATOR', 'INTERNAL'])
  })
})

describe('reading an error', () => {
  it('uses the problem detail rather than the status line', () => {
    const error = new ApiError('Request failed with status 409.', 409, {
      status: 409,
      title: 'Operation not allowed by a business rule',
      detail: 'A correction has to say what it corrects',
      code: 'REPORT_AMENDMENT_NOTE_REQUIRED',
    })

    expect(problemDetail(error)).toBe('A correction has to say what it corrects')
  })

  it('lists what a 400 complained about', () => {
    const error = new ApiError('Request failed with status 400.', 400, {
      detail: 'Request validation failed',
      title: 'Invalid request',
      fields: { periodInOrder: 'periodEnd must not be before periodStart' },
    })

    expect(problemDetail(error)).toBe(
      'Request validation failed — periodInOrder: periodEnd must not be before periodStart',
    )
  })

  it('falls back to the title, then to the status line, then to a plain sentence', () => {
    expect(problemDetail(new ApiError('x', 403, { title: 'Insufficient permission' }))).toBe(
      'Insufficient permission',
    )
    expect(problemDetail(new ApiError('Request failed with status 502.', 502, null))).toBe(
      'Request failed with status 502.',
    )
    expect(problemDetail(new TypeError('Failed to fetch'))).toMatch(/could not be completed/)
  })
})

describe('figures and charts', () => {
  it('writes a number as the report did and a figure by what it is', () => {
    expect(reportNumber(66.67)).toBe('66.67')
    expect(reportNumber(3.5)).toBe('3.5')
    expect(reportNumber(100)).toBe('100')
    expect(figureText({ key: 'fulfilment', label: 'Fulfilment', value: 66.67, outOf: null, unit: '%' })).toBe('66.67%')
    expect(figureText({ key: 'visits', label: 'Visits carried out', value: 2, outOf: 3, unit: null })).toBe('2 of 3')
    expect(figureText({ key: 'incidents', label: 'Incidents', value: 1, outOf: null, unit: null })).toBe('1')
  })

  it("puts a basis's numbers in one line, and a dash for a report without one", () => {
    const metrics = {
      visitsPlanned: 3,
      visitsCompleted: 2,
      fulfilmentRate: 66.67,
      vitalsOutOfRange: 1,
      incidentCount: 1,
      averageElderRating: 3.5,
      ratingCount: 2,
      dataComplete: false,
    }

    expect(metricsLine(metrics)).toBe('2 of 3 visits (66.67%) · 1 incident · rated 3.5')
    expect(
      metricsLine({ ...metrics, visitsPlanned: 0, visitsCompleted: 0, fulfilmentRate: null, incidentCount: 0, averageElderRating: null }),
    ).toBe('no visits planned · 0 incidents · not rated')
    expect(metricsLine(null)).toBe('—')
    expect(metricsLine(undefined)).toBe('—')
  })

  it('spaces the points evenly and scales them between the lowest and the highest', () => {
    const shape = sparkline(
      [
        { at: '2026-09-14T09:10', low: 128, high: 128, flagged: false },
        { at: '2026-09-16T09:10', low: 142, high: 142, flagged: true },
      ],
      100,
      40,
    )

    expect(shape?.min).toBe(128)
    expect(shape?.max).toBe(142)
    expect(shape?.points.map((point) => point.x)).toEqual([4, 96])
    expect(shape?.points[0].mid).toBe(36)
    expect(shape?.points[1].mid).toBe(4)
    expect(shape?.points[1].flagged).toBe(true)
    expect(shape?.line).toBe('M4.0 36.0 L96.0 4.0')
  })

  it("keeps both ends of a day's range and centres a single flat point", () => {
    const day = sparkline([{ at: '2026-09-14', low: 70, high: 96, flagged: true }], 100, 40)

    expect(day?.points[0].x).toBe(50)
    expect(day?.points[0].low).toBe(36)
    expect(day?.points[0].high).toBe(4)

    const flat = sparkline([{ at: '2026-09-14', low: 72, high: 72, flagged: false }], 100, 40)
    expect(flat?.points[0].mid).toBe(20)
    expect(sparkline([], 100, 40)).toBeNull()
  })

  it('names the two kinds of note', () => {
    expect(amendmentKindLabels.CORRECTION).toBe('Correction')
    expect(amendmentKindLabels.FOLLOW_UP).toBe('Follow-up')
  })
})

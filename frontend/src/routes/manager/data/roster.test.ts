import { describe, expect, it } from 'vitest'
import type { CaregiverOption } from '../../../shared/api/profile'
import type { VisitResponse } from '../../../shared/api/visit'
import type { ElderRow } from './elders'
import {
  addDays,
  dayContext,
  elderShort,
  isoWeek,
  mondayOf,
  pageOf,
  singaporeToday,
  toDayTimeline,
  toWeek,
  weekContext,
  weekDays,
} from './roster'

const caregiver = (id: number, fullName: string, extra: Partial<CaregiverOption> = {}): CaregiverOption => ({
  id,
  fullName,
  sector: 'S31',
  dialects: 'Hokkien,Mandarin',
  status: 'AVAILABLE',
  assignable: true,
  ...extra,
})

const elder = (id: string, name: string) => ({ id, name }) as ElderRow

const visit = (id: number, start: string, end: string | null, caregiverId: number | null, status: VisitResponse['status'] = 'SCHEDULED'): VisitResponse => ({
  id,
  elderId: 1,
  caregiverId,
  carePlanNodeId: 30,
  absenceId: null,
  serviceType: 'Bathing assistance',
  scheduledStart: start,
  scheduledEnd: end,
  checkedInAt: null,
  checkedOutAt: null,
  status,
  stateDeadline: null,
  carePlanId: 9,
  version: 0,
  createdAt: null,
  updatedAt: null,
})

describe('roster dates', () => {
  it('reads today in Singapore, not in the browser zone', () => {
    // 20:00 UTC on 1 Oct is already 04:00 on 2 Oct in Singapore.
    expect(singaporeToday(new Date('2026-10-01T20:00:00Z'))).toBe('2026-10-02')
  })

  it('steps days across a month end and finds the Monday of the week', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(mondayOf('2026-10-04')).toBe('2026-09-28')
    expect(mondayOf('2026-09-28')).toBe('2026-09-28')
  })

  it('labels a day and a week the way the header reads', () => {
    expect(dayContext('2026-08-28')).toBe('Fri 28 Aug')
    expect(isoWeek('2026-08-28')).toBe(35)
    expect(weekContext('2026-08-26')).toBe('Week 35 · 24–30 Aug')
    expect(weekContext('2026-10-02')).toBe('Week 40 · 28 Sep–4 Oct')
  })

  it('marks today and the days before it', () => {
    const days = weekDays('2026-10-02', '2026-10-01')
    expect(days.map((day) => day.label)).toEqual(['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4'])
    expect(days.filter((day) => day.isToday).map((day) => day.date)).toEqual(['2026-10-01'])
    expect(days.filter((day) => day.isPast)).toHaveLength(3)
  })
})

describe('elderShort', () => {
  it('keeps the family name and initials the rest', () => {
    expect(elderShort('Tan Hock Seng')).toBe('Tan H.S.')
    expect(elderShort('Rosnah')).toBe('Rosnah')
  })
})

describe('toDayTimeline', () => {
  it('puts each visit on its caregiver row, and unassigned ones in Needs cover', () => {
    const timeline = toDayTimeline(
      [
        visit(1, '2026-10-05T09:30:00', '2026-10-05T10:00:00', 5),
        visit(2, '2026-10-05T11:00:00', '2026-10-05T12:30:00', null),
        visit(3, '2026-10-05T14:00:00', '2026-10-05T15:00:00', 5, 'VERIFIED'),
      ],
      [caregiver(5, 'Ong Wei Jie'), caregiver(6, 'Aisyah N.'), caregiver(7, 'Left Last Year', { assignable: false, status: 'INACTIVE' })],
      [elder('1', 'Tan Hock Seng')],
    )

    expect(timeline.rows.map((row) => [row.name, row.subLine])).toEqual([
      ['Aisyah N.', 'S31 · Hokkien, Mandarin'],
      ['Ong Wei Jie', 'S31 · Hokkien, Mandarin'],
      ['Needs cover', '1 unassigned'],
    ])
    expect(timeline.rows[1].blocks.map((block) => [block.hour, block.state, block.elderShort])).toEqual([
      [9, 'assigned', 'Tan H.S.'],
      [14, 'closed', 'Tan H.S.'],
    ])
    expect(timeline.rows[2].blocks).toMatchObject([{ hour: 11, minutes: 90, state: 'needs_cover' }])
    expect([timeline.startHour, timeline.endHour]).toEqual([8, 20])
  })

  it('shows an uncovered visit that became an exception as an exception, still in Needs cover', () => {
    const timeline = toDayTimeline([visit(1, '2026-10-05T11:00:00', '2026-10-05T12:00:00', null, 'EXCEPTION')], [], [])
    expect(timeline.rows).toMatchObject([{ kind: 'cover', blocks: [{ state: 'exception', label: 'exception' }] }])
  })

  it('widens the hours to fit a visit outside 08–20', () => {
    const timeline = toDayTimeline([visit(1, '2026-10-05T07:00:00', '2026-10-05T07:30:00', 5)], [caregiver(5, 'Ong Wei Jie')], [])
    expect(timeline.startHour).toBe(7)
  })
})

describe('toWeek', () => {
  it('totals visits and hours per caregiver per day', () => {
    const empty: VisitResponse[] = []
    const rows = toWeek(
      [
        [visit(1, '2026-10-05T08:00:00', '2026-10-05T08:30:00', 5), visit(2, '2026-10-05T09:00:00', null, 5, 'EXCEPTION')],
        [visit(3, '2026-10-06T08:00:00', '2026-10-06T08:30:00', null)],
        empty, empty, empty, empty, empty,
      ],
      [caregiver(5, 'Ong Wei Jie')],
    )

    expect(rows.map((row) => row.name)).toEqual(['Ong Wei Jie', 'Needs cover'])
    expect(rows[0].days[0]).toEqual({ visits: 2, hours: 1.5, exceptions: 1 })
    expect(rows[0].totalHours).toBe(1.5)
    expect(rows[1].days[1]).toEqual({ visits: 1, hours: 0.5, exceptions: 0 })
  })
})

describe('paging the roster', () => {
  const rows = toDayTimeline(
    [
      visit(1, '2026-10-05T09:00:00', null, 7, 'EXCEPTION'),
      visit(2, '2026-10-05T10:00:00', null, null),
    ],
    [caregiver(5, 'Aisyah N.'), caregiver(6, 'Ben Tan'), caregiver(7, 'Zainal A.')],
    [],
  ).rows

  it('puts a caregiver with an exception first, so it lands on page 1', () => {
    expect(rows.map((row) => row.name)).toEqual(['Zainal A.', 'Aisyah N.', 'Ben Tan', 'Needs cover'])
  })

  it('pages caregivers only, keeping Needs cover on every page', () => {
    expect(pageOf(rows, 2, 2)).toMatchObject({ page: 2, total: 3, rows: [{ name: 'Ben Tan' }, { name: 'Needs cover' }] })
    expect(pageOf(rows, 9, 2).page).toBe(2)
  })
})

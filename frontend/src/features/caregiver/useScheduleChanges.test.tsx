import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { scheduleChanges, useScheduleChanges } from './useScheduleChanges'
import type { QueryResult } from './useCaregiverQuery'
import type { Schedule } from './api'

const visit = { id: 1, elderId: 7, elderName: 'Private name', serviceType: 'CARE', scheduledStart: '2026-09-25T09:00:00', scheduledEnd: null, status: 'SCHEDULED', version: 0 }
const data: Schedule = { dateFrom: '2026-09-25', dateTo: '2026-09-25', timeZone: 'Asia/Singapore', upcomingVisits: [visit], certificationAlerts: [] }
const success = (revision: number, upcomingVisits = [visit]): QueryResult<Schedule> => ({ key: 'range', revision, status: 'success', data: { ...data, upcomingVisits }, receivedAt: 1 })

describe('schedule comparisons', () => {
  it('reports addition, time and status changes without clinical fields', () => {
    const messages = scheduleChanges([visit], [{ ...visit, scheduledStart: '2026-09-25T10:00:00', status: 'CANCELLED' }, { ...visit, id: 2 }])
    expect(messages).toEqual(['Visit #1 time changed.', 'Visit #1 status changed.', 'Visit #2 added to this schedule.'])
    expect(messages.join()).not.toContain('Private name')
  })
  it('detects an end-time change and describes removals without guessing their cause', () => {
    expect(scheduleChanges([{ ...visit, scheduledEnd: '2026-09-25T10:00:00' }], [visit])).toEqual(['Visit #1 time changed.'])
    expect(scheduleChanges([visit], [])).toEqual(['1 visit moved out of this schedule. Review your current assignments.'])
    expect(scheduleChanges([visit, { ...visit, id: 2 }], [])).toEqual(['2 visits moved out of this schedule. Review your current assignments.'])
    expect(scheduleChanges([visit], [visit])).toEqual([])
  })
  it('does not announce first load, retains a minimal baseline during refresh, and clears old notices', () => {
    const { result, rerender } = renderHook(({ response }) => useScheduleChanges('range', response), { initialProps: { response: success(0) } })
    expect(result.current).toEqual([])
    act(() => rerender({ response: { key: 'range', revision: 1, status: 'loading' } }))
    expect(result.current).toEqual([])
    act(() => rerender({ response: success(1, []) }))
    expect(result.current[0]).toContain('moved out')
    act(() => rerender({ response: success(2, []) }))
    expect(result.current).toEqual([])
  })
  it('resets the baseline on filter changes or errors', () => {
    const { result, rerender } = renderHook(({ key, response }) => useScheduleChanges(key, response), { initialProps: { key: 'range', response: success(0) } })
    act(() => rerender({ key: 'different', response: success(1, []) }))
    expect(result.current).toEqual([])
    act(() => rerender({ key: 'different', response: { key: 'different', revision: 2, status: 'error', error: new Error() } }))
    act(() => rerender({ key: 'different', response: success(3) }))
    expect(result.current).toEqual([])
  })
})

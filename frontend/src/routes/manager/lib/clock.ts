import { useEffect, useState } from 'react'
import type { Exception } from '../data/today'

const pad = (value: number) => String(value).padStart(2, '0')

/** Milliseconds left as "HH:MM:SS"; negative once the moment has passed ("-00:01:05"). */
export function formatCountdown(msRemaining: number): string {
  const total = Math.trunc(msRemaining / 1000)
  const seconds = Math.abs(total)
  const clock = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
  return total < 0 ? `-${clock}` : clock
}

/** An ISO timestamp as a local "HH:MM". */
export function formatTimeOfDay(iso: string): string {
  const at = new Date(iso)
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** The current time in ms, re-read every `intervalMs` — drives live countdowns. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Queue order: most severe first, then the nearest deadline. */
export function byUrgency(a: Exception, b: Exception): number {
  return a.severity - b.severity || Date.parse(a.deadline) - Date.parse(b.deadline)
}

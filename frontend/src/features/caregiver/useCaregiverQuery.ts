import { useEffect, useState } from 'react'

type Result<T> = { key: string; revision: number } & (
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown }
)
/** No cross-account cache. Changed parameters hide previous responses before effects run. */
export function useCaregiverQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result<T>>({ key, revision, status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      data => { if (!controller.signal.aborted) setResult({ key, revision, status: 'success', data }) },
      error => { if (!controller.signal.aborted) setResult({ key, revision, status: 'error', error }) },
    )
    return () => controller.abort()
  }, [key, load, revision])
  const current: Result<T> = result.key === key && result.revision === revision ? result : { key, revision, status: 'loading' }
  return { result: current, reload: () => setRevision(r => r + 1) }
}

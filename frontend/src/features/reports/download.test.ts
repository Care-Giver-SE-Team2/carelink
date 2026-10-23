import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveFile } from './download'

/**
 * Saving a file through a link nobody sees, and letting its URL go afterwards.
 *
 * @author Wang Ziyu
 */

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('saveFile', () => {
  it('clicks a link to the file under the given name, then releases the file', () => {
    vi.useFakeTimers()
    const created = vi.fn().mockReturnValue('blob:report-42')
    const revoked = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: created, revokeObjectURL: revoked })
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })

    saveFile(pdf, 'care-report-42.pdf')

    expect(created).toHaveBeenCalledWith(pdf)
    expect(clicked).toHaveLength(1)
    expect(clicked[0].getAttribute('href')).toBe('blob:report-42')
    expect(clicked[0].download).toBe('care-report-42.pdf')
    expect(document.body.contains(clicked[0])).toBe(false)
    expect(revoked).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(revoked).toHaveBeenCalledWith('blob:report-42')
  })
})

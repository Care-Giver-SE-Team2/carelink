/** How long the browser is given to start saving before the file is let go. */
const RELEASE_AFTER_MS = 10_000

/**
 * Hands a file to the browser to save under the given name.
 *
 * Through an object URL and a link nobody sees, which the browsers the console
 * supports save rather than open. The URL is released a little later rather
 * than at once - Safari can still be reading it when the click returns - so a
 * manager saving one report after another does not keep them all in memory.
 *
 * @param file What to save
 * @param name The file name the browser offers: "care-report-42.pdf"
 * @author Wang Ziyu
 */
export function saveFile(file: Blob, name: string): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS)
}

/** Joins the truthy class names, so conditional modifiers read as `cx(styles.row, selected && styles.selected)`. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

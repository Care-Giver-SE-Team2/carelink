import { DeleteIcon, EditIcon } from './icons'
import { cx } from './cx'
import styles from './IconButton.module.css'

type Props = {
  icon: 'edit' | 'delete'
  /** Accessible name and tooltip — say what it acts on ("Remove task from sub-plan"). */
  label: string
  onClick: () => void
  size?: 22 | 26
  disabled?: boolean
}

/** Square row action. The delete glyph is drawn in the danger colour. */
export function IconButton({ icon, label, onClick, size = 26, disabled }: Props) {
  const Glyph = icon === 'edit' ? EditIcon : DeleteIcon
  return (
    <button
      type="button"
      className={cx(styles.iconButton, icon === 'delete' && styles.delete, size === 22 ? styles.s22 : styles.s26)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Glyph size={size === 22 ? 11 : 13} />
    </button>
  )
}

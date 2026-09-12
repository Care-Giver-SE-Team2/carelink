import { ManagerShell } from '../components/ManagerShell'
import styles from './Placeholder.module.css'

/**
 * Today board — MG03/MG04/MG05: roster table beside a live exception queue.
 * Placeholder for now; see README.md for the use cases this screen covers.
 */
export default function Today() {
  return (
    <ManagerShell>
      <p className={styles.placeholder}>
        Today board placeholder — stat strip, roster table and exception queue
        go here next.
      </p>
    </ManagerShell>
  )
}

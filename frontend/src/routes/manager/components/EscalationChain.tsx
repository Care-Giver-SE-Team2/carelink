import { Eyebrow, Timeline } from '../../../shared/components/ui'
import type { EscalationStep } from '../data/today'
import styles from './EscalationChain.module.css'

/** Who an exception has reached so far and who it goes to next if nobody answers. */
export function EscalationChain({ exceptionId, steps }: { exceptionId: string; steps: EscalationStep[] }) {
  return (
    <section className={styles.chain} aria-label={`Escalation chain for ${exceptionId}`}>
      <Eyebrow wide>Escalation chain · {exceptionId}</Eyebrow>
      <div className={styles.steps}>
        <Timeline
          steps={steps.map((step) => ({
            label: step.person ? `${step.role} · ${step.person}` : step.role,
            sub: step.note,
            state: step.state,
          }))}
          footnote="Chain assembled at run time from severity, time of day and duty roster."
        />
      </div>
    </section>
  )
}

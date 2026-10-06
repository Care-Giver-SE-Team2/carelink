import { useState } from 'react'
import { ElderShell } from '../components/ElderShell'
import {
  ActionStack,
  ChoiceButton,
  InfoNote,
  ScreenColumns,
  ScreenFooter,
  ScreenHeader,
  Slot,
  SpeakButton,
  StatusNote,
  WideButton,
} from '../components/ElderUi'
import { greeting } from '../lib/greeting'
import styles from '../Elder.module.css'

/** No more than four, so the screen never offers more choices than the elder can scan at once. */
const SERVICES = ['Hospital escort', 'Grocery assistance', 'Companionship', 'Light housekeeping']

export default function ValueAddedServices() {
  const [service, setService] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  return (
    <ElderShell>
      <ScreenColumns
        left={
          <>
            <Slot order={1}>
              <ScreenHeader backTo="/elder" eyebrow={greeting()} title="What do you need?" />
            </Slot>
            <Slot order={3}>
              {service && !sent && (
                <InfoNote>
                  <p className={styles.requestPreview}>{service}, today or tomorrow.</p>
                  <p className={styles.requestAudience}>Your care manager will see this request.</p>
                </InfoNote>
              )}
            </Slot>
            <Slot order={5}>
              <p className={styles.meta}>No payment is taken here.</p>
            </Slot>
          </>
        }
        right={
          <>
            <Slot order={2}>
              <ActionStack>
                {SERVICES.map((option) => (
                  <ChoiceButton
                    key={option}
                    label={option}
                    selected={service === option}
                    onSelect={() => setService(option)}
                    disabled={sent}
                  />
                ))}
              </ActionStack>
            </Slot>
            <Slot order={4}>
              {sent ? (
                <StatusNote tone="success">Request sent. Your care manager will reply.</StatusNote>
              ) : (
                <WideButton onClick={() => setSent(true)} disabled={!service}>
                  Send request
                </WideButton>
              )}
            </Slot>
          </>
        }
        footer={
          <ScreenFooter>
            <SpeakButton />
          </ScreenFooter>
        }
      />
    </ElderShell>
  )
}

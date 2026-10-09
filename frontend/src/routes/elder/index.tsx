import { Route, Routes } from 'react-router-dom'
import { ElderShell } from './components/ElderShell'
import {
  ActionStack,
  BigAction,
  ScreenColumns,
  ScreenFooter,
  ScreenHeader,
  Slot,
  SpeakButton,
} from './components/ElderUi'
import { greeting } from './lib/greeting'
import { useElderUser } from './lib/useElderSession'
import ChoosePassword from './pages/ChoosePassword'
import ConfirmVisit from './pages/ConfirmVisit'
import ValueAddedServices from './pages/ValueAddedServices'
import Emergency from './pages/Emergency'
import FamilyBindings from './pages/FamilyBindings'

function ElderDashboard() {
  const { data: user } = useElderUser()
  const name = user?.displayName || user?.username

  return (
    <ElderShell>
      <ScreenColumns
        left={
          <Slot order={1}>
            <ScreenHeader title={greeting()} subtitle={name} />
          </Slot>
        }
        right={
          <Slot order={2}>
            <nav aria-label="What would you like to do?">
              {/* Help stays last in the stack at every screen size. */}
              <ActionStack>
                <BigAction variant="primary" icon="✓" label="Visit is done" to="confirm-service" />
                <BigAction icon="+" label="Ask for something" to="extra-services" />
                <BigAction icon="♥" label="My family" to="family" />
                <BigAction variant="help" icon="!" label="I need help now" to="emergency" />
              </ActionStack>
            </nav>
          </Slot>
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

export default function ElderHome() {
  const { data: user, isPending } = useElderUser()

  // Wait for the user rather than flash the dashboard at an elder who must choose a password first.
  if (isPending) {
    return null
  }
  if (user?.passwordChangeRequired) {
    return <ChoosePassword />
  }

  return <Routes>
    <Route index element={<ElderDashboard />} />
    <Route path="confirm-service" element={<ConfirmVisit />} />
    <Route path="extra-services" element={<ValueAddedServices />} />
    <Route path="emergency" element={<Emergency />} />
    <Route path="family" element={<FamilyBindings />} />
  </Routes>
}

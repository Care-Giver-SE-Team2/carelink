import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { chooseOwnPassword } from '../../../features/auth/api'
import { ApiError } from '../../../shared/api/client'
import ChoosePassword from './ChoosePassword'

vi.mock('../../../features/auth/api', () => ({ chooseOwnPassword: vi.fn() }))
vi.mock('../components/ElderShell', () => ({
  ElderShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const elder = { id: 1, username: 'tan.bee.choo', displayName: 'Tan Bee Choo', roles: ['ELDER'] }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['currentUser'], { ...elder, passwordChangeRequired: true })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChoosePassword />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

async function typePasswords(password: string, again = password) {
  await userEvent.type(screen.getByLabelText('New password'), password)
  await userEvent.type(screen.getByLabelText('Type it again'), again)
  await userEvent.click(screen.getByRole('button', { name: 'Save my password' }))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Choose your own password', () => {
  it('saves the password and updates the signed-in user', async () => {
    vi.mocked(chooseOwnPassword).mockResolvedValue({ ...elder, passwordChangeRequired: false })
    const queryClient = renderPage()

    await typePasswords('bee-choo-own')

    expect(chooseOwnPassword).toHaveBeenCalledWith('bee-choo-own')
    expect(queryClient.getQueryData(['currentUser'])).toMatchObject({ passwordChangeRequired: false })
  })

  it('asks for at least 8 characters and the same password twice before sending', async () => {
    renderPage()

    await typePasswords('short')
    expect(screen.getByRole('alert')).toHaveTextContent('at least 8')

    await userEvent.clear(screen.getByLabelText('New password'))
    await userEvent.clear(screen.getByLabelText('Type it again'))
    await typePasswords('bee-choo-own', 'bee-choo-0wn')
    expect(screen.getByRole('alert')).toHaveTextContent('not the same')
    expect(chooseOwnPassword).not.toHaveBeenCalled()
  })

  it('explains when the temporary password is chosen again', async () => {
    vi.mocked(chooseOwnPassword).mockRejectedValue(
      new ApiError('Choose a password different from the temporary one', 409, { code: 'SAME_AS_TEMPORARY_PASSWORD' }),
    )
    renderPage()

    await typePasswords('Kq7mT4xPa2')

    expect(await screen.findByRole('alert')).toHaveTextContent('not the one you were given')
    expect(screen.getByRole('button', { name: 'Save my password' })).toBeEnabled()
  })

  it('can show what was typed', async () => {
    renderPage()

    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByLabelText('Show what I typed'))
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text')
  })
})

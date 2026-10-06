import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the landing page with a sign-in form and no dev shortcuts', () => {
    render(<App />)

    expect(screen.getByText('CareLink')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument()
    for (const label of ['Manager', 'Caregiver', 'Family', 'Elder', 'Admin']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  })
})

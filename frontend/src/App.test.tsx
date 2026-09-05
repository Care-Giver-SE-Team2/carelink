import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the landing page with a sign-in form and dev shortcuts to each role client', () => {
    render(<App />)

    expect(screen.getByText('CareLink')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument()
    for (const label of ['Manager', 'Caregiver', 'Family', 'Elder', 'Admin']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})

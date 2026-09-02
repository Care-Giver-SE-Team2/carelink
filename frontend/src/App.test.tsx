import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('offers an entry point for each of the four role clients', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /CareLink/i })).toBeInTheDocument()
    for (const label of ['主管台', '护理员端', '家属端', '老人端']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})

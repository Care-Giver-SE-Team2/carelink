import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('渲染出应用标题', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /CareLink/i })).toBeInTheDocument()
  })
})

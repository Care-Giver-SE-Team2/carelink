import { describe, expect, it } from 'vitest'

// DELIBERATE FAULT - pipeline verification only.
describe('pipeline verification', () => {
  it('is supposed to fail', () => {
    expect('green').toBe('red')
  })
})

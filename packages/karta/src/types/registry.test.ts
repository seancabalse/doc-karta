import { describe, expect, it } from 'vitest'
import { qualifiedId } from './registry'

describe('qualifiedId', () => {
  it('composes {project}/{library}/{node-id}', () => {
    expect(qualifiedId('chirp', 'portfolio-bff', 'get-portfolio')).toBe(
      'chirp/portfolio-bff/get-portfolio',
    )
  })
})

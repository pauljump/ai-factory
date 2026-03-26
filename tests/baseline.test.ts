import { describe, it, expect } from 'vitest'
import { estimateSessions, detectCategory } from '../src/engine/baseline.js'

describe('estimateSessions', () => {
  it('clusters commits within 4 hours into sessions', () => {
    const timestamps = [
      '2026-03-20 10:00:00',
      '2026-03-20 10:30:00',
      '2026-03-20 11:00:00',
      '2026-03-20 20:00:00',
      '2026-03-20 21:00:00',
      '2026-03-21 10:00:00',
    ]
    expect(estimateSessions(timestamps)).toBe(3)
  })

  it('handles single commit', () => {
    expect(estimateSessions(['2026-03-20 10:00:00'])).toBe(1)
  })

  it('handles empty array', () => {
    expect(estimateSessions([])).toBe(0)
  })
})

describe('detectCategory', () => {
  it('detects iOS', () => {
    expect(detectCategory('ios-swift', [])).toBe('ios')
  })
  it('detects web', () => {
    expect(detectCategory('nextjs', [])).toBe('web')
  })
  it('detects API', () => {
    expect(detectCategory('node-fastify', ['@pauljump/api-kit'])).toBe('api')
  })
  it('detects data pipeline', () => {
    expect(detectCategory('node-typescript', ['@pauljump/etl-kit'])).toBe('data-pipeline')
  })
})

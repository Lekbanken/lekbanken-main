import { describe, expect, it } from 'vitest'
import {
  canTransition,
  getNextStatus,
  requiresPublishSnapshot,
} from '@/lib/planner/state-machine'

describe('planner publish canonicalization', () => {
  it('marks published as requiring the publish snapshot flow', () => {
    expect(requiresPublishSnapshot('published')).toBe(true)
    expect(requiresPublishSnapshot('draft')).toBe(false)
    expect(requiresPublishSnapshot('modified')).toBe(false)
    expect(requiresPublishSnapshot('archived')).toBe(false)
  })

  it('still exposes publish as a valid state-machine transition target', () => {
    expect(canTransition('draft', 'published')).toBe(true)
    expect(canTransition('modified', 'published')).toBe(true)
    expect(getNextStatus('draft', 'publish')).toBe('published')
    expect(getNextStatus('modified', 'publish')).toBe('published')
  })
})
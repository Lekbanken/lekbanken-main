import { describe, expect, it } from 'vitest'
import {
  resolveCanonicalAvatarUrl,
  withCanonicalAvatarUrl,
} from '@/lib/profile/avatar'

describe('avatar canonicalization', () => {
  it('prefers user_profiles avatar over users avatar', () => {
    expect(
      resolveCanonicalAvatarUrl('https://profiles.example/avatar.png', 'https://users.example/avatar.png')
    ).toBe('https://profiles.example/avatar.png')
  })

  it('falls back to users avatar when profile avatar is missing', () => {
    expect(resolveCanonicalAvatarUrl(null, 'https://users.example/avatar.png')).toBe(
      'https://users.example/avatar.png'
    )
  })

  it('overlays the canonical avatar on returned user rows', () => {
    expect(
      withCanonicalAvatarUrl(
        { id: 'user-1', avatar_url: 'https://users.example/avatar.png' },
        'https://profiles.example/avatar.png'
      )
    ).toEqual({
      id: 'user-1',
      avatar_url: 'https://profiles.example/avatar.png',
    })
  })
})
import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'
import {
  deriveEffectiveGlobalRole,
  deriveEffectiveGlobalRoleFromUser,
  isSystemAdminFromProfileAndUser,
  isSystemAdminFromUser,
  isSystemAdminRole,
} from '@/lib/auth/role'
import { isSystemAdmin as isSystemAdminFromTenantAuth } from '@/lib/utils/tenantAuth'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-03-19T00:00:00.000Z',
    ...overrides,
  } as User
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'User Example',
    avatar_url: null,
    language: null,
    preferred_theme: null,
    show_theme_toggle_in_header: true,
    global_role: null,
    role: null,
    created_at: '2026-03-19T00:00:00.000Z',
    updated_at: '2026-03-19T00:00:00.000Z',
    ...overrides,
  } as UserProfile
}

describe('auth role canonicalization', () => {
  it('prefers profile global_role over auth metadata role', () => {
    const user = makeUser({ app_metadata: { role: 'member', global_role: 'member' } })
    const profile = makeProfile({ global_role: 'system_admin' })

    expect(deriveEffectiveGlobalRole(profile, user)).toBe('system_admin')
    expect(isSystemAdminFromProfileAndUser(profile, user)).toBe(true)
  })

  it('uses auth app_metadata.global_role when profile global_role is absent', () => {
    const user = makeUser({ app_metadata: { global_role: 'system_admin' } })

    expect(deriveEffectiveGlobalRoleFromUser(user)).toBe('system_admin')
    expect(isSystemAdminFromUser(user)).toBe(true)
  })

  it('maps legacy admin claims to system_admin', () => {
    const user = makeUser({ app_metadata: { role: 'admin' } })

    expect(deriveEffectiveGlobalRoleFromUser(user)).toBe('system_admin')
    expect(isSystemAdminFromUser(user)).toBe(true)
    expect(isSystemAdminFromTenantAuth(user)).toBe(true)
  })

  it('keeps non-admin users non-admin across all wrappers', () => {
    const user = makeUser({ app_metadata: { role: 'member' }, user_metadata: { global_role: 'member' } })
    const profile = makeProfile({ global_role: 'member' })

    expect(deriveEffectiveGlobalRole(profile, user)).toBe('member')
    expect(isSystemAdminRole('member')).toBe(false)
    expect(isSystemAdminFromProfileAndUser(profile, user)).toBe(false)
    expect(isSystemAdminFromUser(user)).toBe(false)
    expect(isSystemAdminFromTenantAuth(user)).toBe(false)
  })
})
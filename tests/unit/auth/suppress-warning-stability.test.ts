/**
 * Smoke test: Verify that @supabase/auth-js still exposes the
 * `suppressGetSessionWarning` internal flag.
 *
 * We set this flag on server clients to suppress false-positive
 * "insecure getSession()" warnings. If Supabase removes or renames it,
 * this test will fail — prompting a review before the upgrade ships.
 *
 * See: lib/supabase/server.ts, proxy.ts
 */
import { describe, it, expect } from 'vitest'

describe('Supabase internal API stability', () => {
  it('GoTrueClient still exposes suppressGetSessionWarning', async () => {
    // Dynamic import to avoid supabase client init side-effects
    const { GoTrueClient } = await import('@supabase/auth-js')
    const client = new GoTrueClient({
      url: 'http://localhost:0',
      autoRefreshToken: false,
      persistSession: false,
    })
    // Verify the property exists AND is settable (not just present)
    expect('suppressGetSessionWarning' in client).toBe(true)
    ;(client as any).suppressGetSessionWarning = true
    expect((client as any).suppressGetSessionWarning).toBe(true)
  })
})

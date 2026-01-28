# lib/db Removal Notice

**Removed**: 2026-01-28  
**Reason**: Entire module was unused - no external imports found  
**Verified by**: grep search across all .ts/.tsx files

## What was removed

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 119 | Re-export hub |
| `users.ts` | 269 | User auth/profile queries |
| `tenants.ts` | 241 | Tenant management queries |
| `games.ts` | 447 | Game CRUD queries |
| `billing.ts` | 513 | Subscription/invoice queries |
| `products.ts` | 307 | Product/purpose queries |
| `browse.ts` | 429 | Search/discovery queries |

**Total**: ~2,325 lines of unused code

## Why it was unused

The codebase evolved to use:
- Direct Supabase queries in API routes
- `lib/supabase/server.ts` for auth (`getAuthUser()`)
- Domain-specific services in `lib/services/*`
- Server actions in `app/actions/*`

This `lib/db/` module was an early abstraction layer that was never adopted.

## Rollback

If needed, restore from git:
```bash
git checkout HEAD~1 -- lib/db/
```

Or from this commit's parent.

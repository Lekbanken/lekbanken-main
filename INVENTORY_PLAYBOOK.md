# Inventory Playbook (v2.0 - Partitioned)

## Metadata

- Owner: -
- Status: active
- Date: 2026-01-17
- Last updated: 2026-03-21
- Last validated: 2026-03-21

## Overview

This playbook describes how to maintain the Lekbanken system inventory using the **partitioned** 
inventory system. Instead of one large `inventory.json`, the data is split into domain-based 
partitions in the `.inventory/` directory for faster incremental updates.

## Quick Reference

| Task | Command |
|------|---------|
| Full rebuild | `npm run inventory` |
| Update DB only | `npm run inventory:db` |
| Update app domain | `npm run inventory:app` |
| Update admin domain | `npm run inventory:admin` |
| Update marketing domain | `npm run inventory:marketing` |
| Update sandbox | `npm run inventory:sandbox` |
| Update shared code | `npm run inventory:shared` |

---

## 0) Preconditions
- Use INVENTORY_RULES.md and .inventory/SCHEMA.json for validation.
- Capture current date and repo root.
- Ensure commands are reproducible (PowerShell; document exact commands).
- The partitioned system requires PowerShell 5.1+ (Windows) or pwsh (cross-platform).

## 1) Partition Structure

```
.inventory/
├── manifest.json       # Master index with timestamps per partition
├── domains/
│   ├── marketing.json  # Marketing domain (public pages)
│   ├── app.json        # App domain (authenticated user pages)
│   ├── admin.json      # Admin dashboard and APIs
│   ├── sandbox.json    # Sandbox/playground code
│   ├── demo.json       # Demo domain
│   └── shared.json     # Shared components, hooks, services
├── database/
│   ├── tables.json     # DB tables with usage, RLS info
│   ├── policies.json   # RLS policies
│   ├── triggers.json   # DB triggers
│   └── functions.json  # DB functions (RPC)
├── edges/
│   ├── routes.json     # Route → layout edges
│   └── db-usage.json   # Code → DB edges (.from/.rpc)
└── findings.json       # Security gaps, orphans, etc.
```

## 2) When to Update Which Partition

| Changed Area | Partition to Update | Command |
|--------------|---------------------|---------|
| `app/(marketing)/**` | `domains/marketing` | `npm run inventory:marketing` |
| `app/admin/**` | `domains/admin` | `npm run inventory:admin` |
| `app/app/**` | `domains/app` | `npm run inventory:app` |
| `app/sandbox/**` | `domains/sandbox` | `npm run inventory:sandbox` |
| `components/**`, `lib/**`, `hooks/**` | `domains/shared` | `npm run inventory:shared` |
| `supabase/migrations/**` | `database/*` | `npm run inventory:db` |
| Multiple areas | Full rebuild | `npm run inventory` |

## 3) Entrypoints Discovery (Automated)

The generator automatically discovers:
1. **Next.js routes**: `app/**/page.tsx`
2. **Route handlers**: `app/**/route.ts`
3. **Layouts**: `app/**/layout.tsx`
4. **Server actions**: Files containing `"use server"`
5. **Services**: Files in `lib/auth`, `lib/gdpr`, `lib/stripe`, etc.
6. **Components**: Critical ones file-level, others grouped
7. **Hooks**: Files in `hooks/`
8. **Edge functions**: `supabase/functions/*`

## 4) Database Discovery (Automated)

The generator:
- Parses `lib/supabase/database.types.ts` for tables, views, functions
- Parses `supabase/migrations/*.sql` for policies and triggers
- Scans codebase for `.from('table')` and `.rpc('fn')` usage
- Links code → DB with edges

## 5) Reachability Analysis

- **used_runtime**: Evidence of runtime execution (logs/telemetry)
- **used_referenced**: Reachable from used_runtime node
- **dormant_flagged**: Gated by flag/role, status unknown
- **unknown**: Insufficient evidence, requires audit

Edge types:
- `route_renders`: Route → layout
- `db_reads` / `db_writes`: Handler → table
- `db_rpc`: Handler → function
- `protected_by`: Table → RLS policy
- `triggers`: Table → trigger

## 6) Security Review (Slow Down)

These areas default to `unknown` until manually audited:
- Auth / onboarding
- GDPR / legal  
- Billing / Stripe
- Tenant / RBAC / RLS enforcement
- Data export / erasure

## 7) Findings Categories

- `orphan`: No references found
- `unreachable`: Cannot trace from entrypoint
- `security_gap`: Missing RLS or auth check
- `duplicate`: Multiple implementations
- `dead_code`: Never executed
- `policy_mismatch`: RLS policy doesn't match code assumptions

## 8) QA and Validation

```powershell
# Validate manifest structure
cat .inventory/manifest.json | ConvertFrom-Json

# Count nodes by partition
Get-ChildItem .inventory/domains/*.json | ForEach-Object {
  $p = Get-Content $_ | ConvertFrom-Json
  "$($_.Name): $($p.nodeCount) nodes"
}
```

## 9) Outputs

| File | Purpose |
|------|---------|
| `.inventory/manifest.json` | Master index with timestamps |
| `.inventory/domains/*.json` | Domain-specific nodes |
| `.inventory/database/*.json` | DB objects (tables, policies, etc.) |
| `.inventory/edges/*.json` | Relationships between nodes |
| `.inventory/findings.json` | Security findings and issues |
| `inventory.json` | Legacy format (auto-generated for backwards compat) |

## 10) Atlas Integration

The `/api/atlas/inventory` endpoint automatically:
1. Checks for `.inventory/manifest.json`
2. If present, loads from partitions
3. If not, falls back to legacy `inventory.json`

Query params:
- `?domain=app` - Load only specific domain
- `?partitioned=false` - Force legacy mode

## 11) Best Practices

1. **Run partial updates frequently**: After working on a domain, run that domain's update
2. **Full rebuild weekly**: Catch cross-domain changes
3. **Before PR merge**: Run full inventory to detect orphans
4. **After DB migrations**: Always run `npm run inventory:db`
5. **Review findings**: Address security gaps promptly

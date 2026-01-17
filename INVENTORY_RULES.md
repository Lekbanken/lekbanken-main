# Lekbanken Inventory Rules (v1.1)

## 1. Purpose
This inventory exists to:
- Enable safe cleanup (identify dead/orphaned code and data structures with evidence).
- Achieve accurate system understanding (routes → UI → services → API → DB → security).
- Reduce technical debt (duplicate flows, shadow schemas, redundant components).
- Support future architectural decisions (multi-tenant correctness, security posture, scalability).

This is a development-stage system; therefore, lack of runtime traffic must not be treated as proof of non-usage.

## 2. Scope
The inventory covers the full stack:

Application
- Next.js App Router: routes, route handlers, layouts, server actions, middleware/proxy.
- UI: components, hooks, shared libs, feature flags.
- API: internal endpoints, server actions, background jobs (if any).
- Edge: Supabase Edge Functions and any Next Edge runtime usage.
- Assets: icons/images/etc if relevant for cleanup.

Supabase
- Tables, views (including materialized if used), functions (RPC), triggers.
- RLS policies, grants/roles, indexes, enums/types.
- Storage buckets.
- Auth configuration elements that influence app behavior.

## 3. Classification: Node Types
All inventory items must be classified into one of these node types:
- route (page.tsx routes)
- route_handler (route.ts, API routes)
- layout
- component
- hook
- service (domain/service modules)
- api (logical API surface if separate from route_handler)
- server_action
- middleware / proxy
- edge_function
- job (cron/scheduled tasks if present)
- asset
- db_table
- db_view
- db_function (RPC)
- db_trigger
- rls_policy
- storage_bucket
- feature_flag

## 4. Usage Status Levels (Required)
Each node must have a usage status. Use ONLY these values:
- used_runtime: Evidence that it executes in production runtime (logs/telemetry/invocations).
- used_referenced: Imported/instantiated by something classified as used_runtime; may be branch-conditional.
- reachable_but_off: Route/handler exists in production build, but gated by flag/role/env and currently off.
- dormant_flagged: Reachable only under feature flags, specific roles, tenant conditions, or environment gates (unknown if enabled).
- legacy_deprecated: Superseded by a newer implementation; still present for compatibility/migration.
- dead_orphan: No reachable path from any entrypoint and no references/imports (candidate unless low risk).
- unknown: Insufficient evidence to classify; requires follow-up.

### Confidence
Each node must have confidence 0.0–1.0 based on evidence quality.

## 5. Evidence Requirements
Every classification must include at least one evidence item:
- import_path: concrete path showing reachability (A imports B imports C).
- route_reachability: route exists under active app router structure and layouts.
- link_ref: explicit link/navigation references (e.g., Next Link).
- flag_gate: feature flag or env gate makes it conditional.
- role_gate: requires specific role/permission.
- tenant_gate: requires tenant context/subdomain/custom domain.
- runtime_signal: logs/telemetry showing it executed.
- db_usage: code references .from('table')/.rpc('fn') or equivalent.
- manual_note: human-provided context (use sparingly; must be explicit).

## 6. Domains (Owner Domains)
Each node must have an ownerDomain label for organization/filtering:
- marketing
- app
- admin
- sandbox
- demo
- shared
- db

Rule: If an item is used across 2+ domains, label it shared (and still keep references via edges).

## 7. Runtime Scope & Exposure (Required)
Each node must include:
- runtime_scope: prod | dev_only | test_only | build_only
- exposure: public | authenticated | tenant_scoped | admin_only | internal

Reason: sandbox/demo must remain safe even if gates fail.

## 8. Entrypoints (Definition)
Primary entrypoints define reachability:
- Next.js routes: app/**/page.tsx
- Route handlers: app/**/route.ts
- Server actions ("use server") invoked by active routes/components
- Middleware/proxy layer (middleware.ts if present) and route matchers
- Supabase Edge Functions (invocations from app or scheduled triggers)
- Scheduled jobs/cron tasks (if present)
- Auth callbacks/hooks (if implemented and referenced by auth flow)
- Webhook endpoints (Stripe, auth providers, external integrations)

Secondary entrypoints (conditional):
- Feature-flagged routes/components
- Role-gated admin paths
- Tenant-gated routes/handlers

## 9. Link Types (Edges)
Edges must specify type and intent. Use these link types:
- route ➝ page/layout: route_renders
- page ➝ component: renders_component
- component ➝ hook/service: uses_hook | calls_service
- service ➝ db_table/db_function/storage_bucket: db_reads | db_writes | db_rpc | storage_access
- route_handler/server_action ➝ db_table/db_function/external API: handles_request | db_rpc | db_reads | db_writes | external_call
- db_table ➝ rls_policy/trigger/function: protected_by | triggers | used_by
- feature_flag ➝ route/component/service: gates
- middleware ➝ route_handler/route: guards

## 10. Security-Critical Areas (Slow down)
These require extra scrutiny before labeling dead_orphan:
- Auth / onboarding
- GDPR / legal
- Billing / Stripe
- Tenant / RBAC / RLS enforcement
- Data export / erasure

Default to unknown or legacy_deprecated unless evidence is strong.

## 11. Supabase Risk & Policy Coverage (Required for DB nodes)
Each db_table/db_view/db_function/db_trigger/storage_bucket must include:
- data_class: pii | auth | billing | tenant_core | content | telemetry | misc
- rls_required: true | false
- rls_covered: true | false | unknown
- tenant_key: column name or null

## 12. Findings Categories
Agents must produce findings in these categories:
- orphan
- unreachable
- duplicate
- dead_code
- db_shadow
- policy_mismatch
- security_gap

Each finding must include:
- summary
- affected nodes
- recommendation
- prechecks
- rollback notes

## 13. Dual-Agent QA Protocol
If using Codex + Claude:
- Both must output the same JSON schema (inventory.json + findings in inventory.json).
- Both must include confidence per node and evidence paths.
- For mismatches, create disputes.md with:
  - Agent A says…
  - Agent B says…
  - Required verification step…

## 14. Required Output Files
- inventory.json
- summary.md
- commands.md

## 15. Additional Required Governance Files
- INVENTORY_SCHEMA.json (strict schema)
- INVENTORY_PLAYBOOK.md (step-by-step process)
- INVENTORY_DECISIONS.md (decision log)
- disputes.md (created when agent outputs disagree)

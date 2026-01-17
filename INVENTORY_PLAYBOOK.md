# Inventory Playbook (v1.1)

## 0) Preconditions
- Use INVENTORY_RULES.md and INVENTORY_SCHEMA.json.
- Capture current date and repo root.
- Ensure commands are reproducible (PowerShell or bash; document exact commands).

## 1) Entrypoints discovery
1. Next.js routes: list app/**/page.tsx
2. Route handlers: list app/**/route.ts
3. Layouts: list app/**/layout.tsx
4. Middleware: check for middleware.ts and matcher config
5. Webhooks: scan for /webhook or external handler routes (Stripe, auth)
6. Server actions: search for "use server"
7. Edge functions: list supabase/functions/*
8. Jobs/cron: inspect scripts/ or scheduling config

## 2) UI & service discovery
- Components: list components/**
- Features: list features/**
- Hooks: list hooks/** and hooks inside features/**
- Services: list lib/** (service, db, auth, stripe, legal, gdpr)

## 3) Supabase discovery
- Parse supabase/migrations/** for: tables, views, functions, triggers, policies, buckets.
- Read lib/supabase/database.types.ts to confirm DB object list.
- Derive data_class and tenant_key per DB object (manual check when unclear).

## 4) Reachability analysis
- Build edge types per INVENTORY_RULES.md.
- Trace: route ➝ page/layout ➝ component ➝ hook/service ➝ db_table/db_function
- Mark used_runtime only with runtime evidence.
- Mark used_referenced when reachable from a used_runtime node.
- Mark reachable_but_off when route/handler is gated and disabled in current config.
- Mark dormant_flagged when a feature flag/role gate is present but status is unknown.
- Add API/server_action → DB evidence:
	- grep .from('table'), .rpc('fn'), fetch('/api/*') and map to edges.
	- attach evidence to nodes and edges.
- Reduce unknowns in priority areas:
	- resolve imports from app/** to features/** and components/**.
	- promote reachable items to used_referenced with import_path evidence.

## 5) Security review (slow down)
- Auth, billing, GDPR, tenant/RBAC, data export/erasure: default to unknown unless evidence is strong.
- Verify RLS coverage for storage buckets and sensitive tables.

## 6) Findings generation
- orphan, unreachable, duplicate, dead_code, db_shadow, policy_mismatch, security_gap
- For each: summary, affected nodes, recommendation, prechecks, rollback.

## 7) QA and schema validation
- Validate inventory.json against INVENTORY_SCHEMA.json.
- Run count summaries by node type, ownerDomain, usage status.
- If dual-agent: compare outputs and create disputes.md for mismatches.

## 8) Outputs
- inventory.json
- summary.md
- commands.md
- INVENTORY_DECISIONS.md updates (decisions, assumptions)
- disputes.md if needed

# Lekbanken System Inventory Summary (v3 - Partitioned)

Generated: 2026-01-27

## Overview

The inventory system has been upgraded to use **partitioned storage** in `.inventory/` for 
faster incremental updates. Instead of regenerating the entire 1,776 node inventory each time,
you can now update only the domain you've been working on.

## Totals

| Metric | Count |
|--------|-------|
| **Total Nodes** | 1,776 |
| **Total Edges** | 1,816 |
| **Findings** | 2 |
| **Partitions** | 12 |

## By Domain Partition

| Domain | Nodes | Description |
|--------|-------|-------------|
| shared | 362 | Components, hooks, services, lib |
| admin | 117 | Admin dashboard and APIs |
| sandbox | 78 | Sandbox/playground code |
| app | 51 | Authenticated user pages |
| marketing | 18 | Public marketing pages |
| demo | 3 | Demo domain |

## By Database Partition

| Type | Nodes | Description |
|------|-------|-------------|
| policies | 957 | RLS policies from migrations |
| tables | 105 | DB tables + views |
| triggers | 79 | DB triggers |
| functions | 6 | RPC functions |

## By Node Type (Combined)

- rls_policy: 957
- route: ~270
- route_handler: ~230
- db_table: 105
- db_trigger: 79
- component: ~40
- server_action: ~25
- service: ~27
- layout: ~12
- hook: ~3
- db_function: 6
- edge_function: 1
- middleware / proxy: 1

## Usage Status Distribution

- **unknown**: ~1,100 (security-critical items pending audit)
- **used_referenced**: ~500 (traced from routes)
- **dormant_flagged**: ~80 (sandbox/demo gated)

## v2 → v3 Changes

| Metric | v2 (Jan 17) | v3 (Jan 27) | Change |
|--------|-------------|-------------|--------|
| Nodes | 1,634 | 1,776 | +142 |
| Edges | 1,018 | 1,816 | +798 |
| Partitions | 1 | 12 | Modular |

### Key Improvements
- **Partitioned storage**: 12 separate files for domain-specific updates
- **More edges detected**: Better `.from()` / `.rpc()` scanning
- **Faster updates**: `npm run inventory:app` takes seconds, not minutes
- **Manifest tracking**: Each partition has timestamp for staleness detection
- Billing RLS gap only reported if no policies found (none detected in v2 findings).
- Remaining v2 findings focus on proxy wiring and edge function invocation.

## Key security findings (v2)
- [orphan] proxy.ts has no detected imports or middleware wiring
- [unreachable] cleanup-demo-data edge function invocation not verified

## Top actionable cleanup candidates (risk-scored)
1. proxy.ts (risk: medium) — confirm wiring before removal
2. cleanup-demo-data edge function (risk: medium) — confirm schedule/invocation

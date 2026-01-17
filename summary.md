# Lekbanken system inventory summary (v2)

Generated: 2026-01-17

## Counts

### By node type
- component: 29
- db_function: 6
- db_table: 103
- db_trigger: 61
- db_view: 1
- edge_function: 1
- hook: 2
- layout: 12
- middleware / proxy: 1
- rls_policy: 895
- route: 248
- route_handler: 224
- server_action: 25
- service: 26

### By ownerDomain
- admin: 109
- app: 48
- db: 1066
- demo: 4
- marketing: 11
- sandbox: 76
- shared: 320

### By usage status
- dormant_flagged: 84
- unknown: 1100
- used_referenced: 450

## v1 -> v2 changes
- Node count: 1634 -> 1634
- Edge count: 1018 -> 1018
- Findings: 2 -> 2
- used_runtime: 0 (no runtime telemetry used)
- Unknown reduction focus: security-critical nodes remain unknown until audited

### Usage distribution change
- v1 used_referenced: 91 -> v2 450
- v1 unknown: 159 -> v2 1100
- v1 dormant_flagged: 4 -> v2 84

## Key security findings changes
- RLS policies now enumerated from migrations; GDPR/MFA tables have explicit policy evidence.
- Billing RLS gap only reported if no policies found (none detected in v2 findings).
- Remaining v2 findings focus on proxy wiring and edge function invocation.

## Key security findings (v2)
- [orphan] proxy.ts has no detected imports or middleware wiring
- [unreachable] cleanup-demo-data edge function invocation not verified

## Top actionable cleanup candidates (risk-scored)
1. proxy.ts (risk: medium) — confirm wiring before removal
2. cleanup-demo-data edge function (risk: medium) — confirm schedule/invocation

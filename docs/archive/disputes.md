# Disputes

## Template
- Node ID:
- Agent A classification:
- Agent B classification:
- Evidence A:
- Evidence B:
- Required verification step:
- Resolution:
- Date:

---

## Dispute 1: Layout Usage Classification
- **Node ID:** `layout:app/layout.tsx`
- **Agent A (Claude) classification:** `used_runtime`, confidence: 0.95
- **Agent B (Codex) classification:** `used_referenced`, confidence: 0.7
- **Evidence A:** Layouts are executed at runtime by Next.js App Router for every request within their scope. The root layout wraps all pages and executes server-side.
- **Evidence B:** Codex may have classified based on static analysis showing layouts are "referenced" by the routing system rather than directly imported.
- **Required verification step:** Run `grep -r "layout.tsx" app/` to verify no explicit imports; confirm Next.js documentation states layouts execute at runtime.
- **Resolution:** PENDING
- **Date:** 2025-01-14

---

## Dispute 2: Security-Critical Area Status
- **Node ID:** `route_handler:app/api/billing/*` (multiple)
- **Agent A (Claude) classification:** `unknown` with `domain: billing`
- **Agent B (Codex) classification:** `used_referenced`, confidence: 0.7
- **Evidence A:** Per INVENTORY_RULES.md Section 10: "Security-critical areas (auth, billing, GDPR, tenant/RBAC) default to 'unknown' until verified by security audit."
- **Evidence B:** Codex may not have applied Section 10 conservatism, classifying based on import analysis only.
- **Required verification step:** Security audit of all billing endpoints; verify RLS policies protect all billing tables.
- **Resolution:** PENDING - Requires security team verification
- **Date:** 2025-01-14

---

## Dispute 3: Missing Node Type - RLS Policies
- **Node ID:** Multiple `rls_policy:*` nodes
- **Agent A (Claude) classification:** NOT INCLUDED as separate nodes; included as metadata in `findings` section
- **Agent B (Codex) classification:** 8 separate `rls_policy` nodes
- **Evidence A:** INVENTORY_SCHEMA.json does not list `rls_policy` as a valid node type. Claude treated RLS as security metadata.
- **Evidence B:** Codex included RLS policies as first-class nodes with status tracking.
- **Required verification step:** Review INVENTORY_SCHEMA.json to determine if `rls_policy` is a valid node type.
- **Resolution:** PENDING - Schema clarification needed
- **Date:** 2025-01-14

---

## Dispute 4: Granularity - Component Grouping
- **Node ID:** Multiple component nodes
- **Agent A (Claude) classification:** 10 `service` nodes for lib/* directories
- **Agent B (Codex) classification:** 28 `component` nodes, 1 `hook` node
- **Evidence A:** Claude focused on security-critical service boundaries. Components were not enumerated individually due to playbook focus on entrypoints and security.
- **Evidence B:** Codex performed more granular UI component analysis, tracking individual components.
- **Required verification step:** Determine if component-level tracking is required for security audit or can remain at service level.
- **Resolution:** PENDING - Scope clarification needed
- **Date:** 2025-01-14

---

## Dispute 5: Server Action Count
- **Node ID:** `server_action:*` nodes
- **Agent A (Claude) classification:** 3 example nodes (billing-actions.ts, quiz-actions.ts, play-actions.ts)
- **Agent B (Codex) classification:** 25 `server_action` nodes
- **Evidence A:** Claude identified 19 server action FILES but sampled 3 for inventory due to scope. Full enumeration would match Codex.
- **Evidence B:** Codex enumerated all 25 server action modules.
- **Required verification step:** Expand Claude inventory to include all 19+ server action files.
- **Resolution:** ACKNOWLEDGED - Claude under-sampled; full enumeration recommended
- **Date:** 2025-01-14

---

## Dispute 6: Route Count Discrepancy
- **Node ID:** `route:*` nodes
- **Agent A (Claude) classification:** 25 `route` nodes (sampled)
- **Agent B (Codex) classification:** 19 `route` nodes
- **Evidence A:** Claude discovered 200+ page.tsx files but sampled key routes for inventory.
- **Evidence B:** Codex may have grouped routes or used different selection criteria.
- **Required verification step:** Both agents should enumerate all 200+ routes or agree on consistent grouping strategy.
- **Resolution:** PENDING - Alignment on sampling strategy needed
- **Date:** 2025-01-14

---

## Dispute 7: Edge Count Discrepancy
- **Node ID:** N/A - Graph-level metric
- **Agent A (Claude) classification:** 14 edges traced
- **Agent B (Codex) classification:** 5 edges traced
- **Evidence A:** Claude traced layoutâ†’route, routeâ†’route_handler, middleware dependencies.
- **Evidence B:** Codex may have focused only on explicit import relationships.
- **Required verification step:** Define edge semantics - should edges represent (1) imports only, (2) runtime calls, or (3) data flow?
- **Resolution:** PENDING - Edge definition standardization needed
- **Date:** 2025-01-14

---

## Dispute 8: DB Table Classification Alignment
- **Node ID:** `db_table:*` nodes (103 total)
- **Agent A (Claude) classification:** 20 sampled nodes, 40 marked `used_runtime`, rest inferred
- **Agent B (Codex) classification:** 103 nodes, majority `unknown` (159 across all types)
- **Evidence A:** Claude used `.from()` grep search (170+ references) to identify used tables.
- **Evidence B:** Codex marked more conservatively as `unknown`.
- **Required verification step:** Cross-reference `.from()` calls against table list to determine actual usage.
- **Resolution:** PENDING - Codex may be more conservative on DB tables
- **Date:** 2025-01-14

---

## Summary Statistics

| Metric | Claude (Agent A) | Codex (Agent B) | Delta |
|--------|------------------|-----------------|-------|
| Total Nodes | 85 | 254 | -169 |
| Edges | 14 | 5 | +9 |
| Findings | 7 | 7 | 0 |
| used_runtime | 40 | 0 | +40 |
| used_referenced | 3 | 91 | -88 |
| unknown | 38 | 159 | -121 |
| dormant_flagged | 0 | 4 | -4 |

### Key Observations

1. **Claude is more selective:** 85 vs 254 nodes, focusing on security-critical entrypoints
2. **Claude traces more dependencies:** 14 vs 5 edges, capturing runtime relationships
3. **Codex is more granular:** Includes individual components, hooks, and RLS policies
4. **Usage classification diverges:** Claude uses `used_runtime` for layouts/routes; Codex uses `used_referenced`
5. **Both identify 7 findings:** Similar security gap detection despite different approaches
6. **Codex identifies dormant code:** 4 `dormant_flagged` items not captured by Claude

### Recommendations for Resolution

1. **Standardize granularity:** Agree on whether to track file-level or directory-level nodes
2. **Clarify schema:** Update INVENTORY_SCHEMA.json to explicitly include/exclude `rls_policy`, `hook` types
3. **Define edge semantics:** Document what relationships edges should capture
4. **Align usage classification:** Clarify when `used_runtime` vs `used_referenced` applies
5. **Merge inventories:** Combine Claude's edge tracing with Codex's component coverage

---

## Iteration 2 reconciliation

### Dispute 1: Layout Usage Classification
- **Status:** Resolved
- **Evidence:** All layout nodes now `used_referenced` with `route_reachability` evidence in [inventory.json](inventory.json)
- **v2 change:** Removed `used_runtime` classifications for layouts due to lack of runtime telemetry.

### Dispute 2: Security-Critical Area Status
- **Status:** Resolved
- **Evidence:** Billing/auth/GDPR/tenant routes and services set to `unknown` with `manual_note` evidence (`security-critical; requires audit`) in [inventory.json](inventory.json)
- **v2 change:** Applied INVENTORY_RULES.md Section 10 consistently for critical areas.

### Dispute 3: Missing Node Type - RLS Policies
- **Status:** Resolved
- **Evidence:** 895 `rls_policy` nodes generated from migrations; edges `db_table -> rls_policy` with `protected_by` in [inventory.json](inventory.json)
- **v2 change:** Full schema compliance for `rls_policy` nodes.

### Dispute 4: Granularity - Component Grouping
- **Status:** Partially resolved
- **Evidence:** Critical component directories (auth/legal/billing/cookie) enumerated at file-level; non-critical directories remain grouped in [inventory.json](inventory.json)
- **v2 change:** File-level granularity enforced only for critical areas.

### Dispute 5: Server Action Count
- **Status:** Resolved
- **Evidence:** All files containing `use server` now enumerated as `server_action` nodes in [inventory.json](inventory.json)
- **v2 change:** Full server action enumeration (25 nodes).

### Dispute 6: Route Count Discrepancy
- **Status:** Resolved
- **Evidence:** All `page.tsx` routes (248) and `route.ts` handlers (224) enumerated in [inventory.json](inventory.json)
- **v2 change:** Removed sampling; full entrypoint coverage.

### Dispute 7: Edge Count Discrepancy
- **Status:** Resolved
- **Evidence:** Added `route_renders`, `db_reads`, `db_writes`, and `db_rpc` edges (1018 total) in [inventory.json](inventory.json)
- **v2 change:** Normalized edge semantics per INVENTORY_RULES.md Section 9.

### Dispute 8: DB Table Classification Alignment
- **Status:** Resolved
- **Evidence:** All 103 tables enumerated; `used_referenced` set when `.from()` usage detected; `rls_covered` populated from migrations in [inventory.json](inventory.json)
- **v2 change:** Table usage derived from reachability evidence.

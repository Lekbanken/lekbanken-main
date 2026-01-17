# Inventory Decisions Log

## 2026-01-17
- Decision: Adopt Inventory Rules v1.1 with explicit usage split (used_runtime vs used_referenced vs reachable_but_off).
  - Rationale: Reduce risk of removing latent but properly wired code.
- Decision: Require runtime_scope and exposure on every node.
  - Rationale: Sandbox/demo routes must be safe even if gates fail.
- Decision: Require DB risk metadata (data_class, rls_required, rls_covered, tenant_key).
  - Rationale: Prevent unsafe DB cleanup and improve compliance review.
- Decision: Standardize edge types for graph consistency and auditability.
  - Rationale: Make graph executable for cleanup and reasoning.
- Decision: Add dual-agent QA protocol with disputes.md.
  - Rationale: Provide deterministic resolution steps for mismatches.

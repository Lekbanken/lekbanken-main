# Triplet Creation Checklist

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-03-21

## Purpose

Use this checklist when a domain needs a new active documentation triplet:

- architecture
- audit
- implementation plan

This checklist prevents ad hoc document creation, missing metadata, and broken navigation.

## Before creating a new triplet

- [ ] Confirm the domain does not already have a canonical triplet.
- [ ] Read [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md).
- [ ] Read [TRIPLET_WORKFLOW_STANDARD.md](TRIPLET_WORKFLOW_STANDARD.md).
- [ ] Confirm the canonical location for this domain.
- [ ] Confirm whether the domain belongs in `docs/`, `launch-readiness/`, or an existing root triplet area.
- [ ] Avoid creating a new root-level triplet unless governance explicitly requires it.

## Create the documents

- [ ] Create the architecture doc from [templates/TRIPLET_ARCHITECTURE_TEMPLATE.md](templates/TRIPLET_ARCHITECTURE_TEMPLATE.md).
- [ ] Create the audit doc from [templates/TRIPLET_AUDIT_TEMPLATE.md](templates/TRIPLET_AUDIT_TEMPLATE.md).
- [ ] Create the implementation plan from [templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md](templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md).
- [ ] Add `Date`, `Last updated`, `Last validated`, `Scope`, and `Status` near the top of each active doc.
- [ ] Apply the semantics in [DOCUMENT_DATING_STANDARD.md](DOCUMENT_DATING_STANDARD.md) so `Date`, `Last updated`, and `Last validated` do not drift.
- [ ] Keep naming consistent with the domain's existing convention.

## Fill the first version correctly

### Architecture

- [ ] Document the stable system shape.
- [ ] Include route structure if routes exist.
- [ ] Include component ownership and data flow.
- [ ] Record durable architectural decisions only.

### Audit

- [ ] Verify current code, schema, runtime wiring, or routes before writing conclusions.
- [ ] Document current reality, not intended future state.
- [ ] Record current risks and known diffs from previous assumptions.
- [ ] State the validation basis clearly.

### Implementation plan

- [ ] Define milestones in delivery order.
- [ ] Mark what is in scope and out of scope.
- [ ] Record risks, blockers, and prerequisites.
- [ ] Use checklist items that can actually be completed and dated.

## Register the new triplet

- [ ] Add the new canonical entrypoint to [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) if needed.
- [ ] Add navigation to [README.md](README.md) if it should be discoverable from docs start.
- [ ] Add the new docs to [DOCS_INDEX.md](DOCS_INDEX.md) if they are part of the curated docs map.
- [ ] Add the new docs to [INVENTORY.md](INVENTORY.md).
- [ ] Update [.github/copilot-instructions.md](../.github/copilot-instructions.md) if agent read-order must change.
- [ ] Update [REPO_GOVERNANCE.md](../REPO_GOVERNANCE.md) if the canonical location or trust model changes.

## First implementation cycle

- [ ] Verify the initial audit before coding.
- [ ] Update the implementation plan before coding if scope changed.
- [ ] Implement the planned work.
- [ ] Update the implementation plan after coding.
- [ ] Update the audit after coding.
- [ ] Update architecture if stable design changed.

## Definition of done

The new triplet is ready when:

- [ ] all three docs exist in the correct canonical location
- [ ] all three docs have current metadata
- [ ] navigation and inventory are updated
- [ ] the audit reflects verified reality
- [ ] the implementation plan reflects actual status
- [ ] the architecture doc reflects stable design

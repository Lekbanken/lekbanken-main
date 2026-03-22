# Triplet Workflow Standard

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-03-21

## Purpose

This document defines the mandatory working loop for active domain documentation built as a triplet:

- architecture
- audit
- implementation plan

The goal is to keep domain docs synchronized with reality so agents and humans do not rebuild understanding from stale material.

## When this standard applies

Use this workflow when:

- a domain already has an active triplet
- you make structural or behavioral changes in a domain that depends on an audit and implementation plan
- you create a new active audit or implementation plan for a domain

If a domain does not yet have a triplet, use this standard when creating one.

## Core rule

Do not treat an audit or implementation plan as static paperwork.

They are operational documents and must be updated before and after meaningful implementation work.

## Required document roles

### Architecture

Use the architecture doc for stable structure:

- component map
- route map
- data flow
- domain boundaries
- durable design decisions

Update it when the stable system shape changes.

### Audit

Use the audit doc for current reality:

- what exists now
- what has been verified
- current risks
- resolved risks
- important diffs from earlier understanding

The audit must describe the current codebase, not the intended future state.

### Implementation plan

Use the implementation plan for execution state:

- intended work
- milestone order
- status per milestone
- what is completed
- what remains
- implementation notes after completion

The implementation plan must show the actual delivery status, not only the original idea.

## Required metadata and dating

Every active audit and implementation plan should include, near the top:

- `Date:` when the document or current workstream was created
- `Last updated:` when content changed materially
- `Last validated:` when the doc was checked against current code, behavior, or schema
- `Status:` current execution state
- `Scope:` the domain/files/routes/tables covered

Use ISO dates: `YYYY-MM-DD`.

Follow [DOCUMENT_DATING_STANDARD.md](DOCUMENT_DATING_STANDARD.md) for the exact semantics of `Date`, `Last updated`, and `Last validated`.

If a document already uses Swedish labels such as `Senast uppdaterad`, preserve the established style. The important requirement is that the date exists and is updated.

## Mandatory work loop

### 1. Find the canonical docs first

Before implementation:

1. locate the domain's canonical entrypoint
2. read the architecture doc
3. read the latest audit
4. read the implementation plan

Use [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) first if the correct location is unclear.

### 2. Verify the existing audit before coding

Before making changes:

1. compare the audit against the current code, routes, schema, or runtime wiring
2. identify any diffs between documented state and actual state
3. update the audit if the doc is already stale enough to mislead implementation
4. update the audit's validation/update date

This is mandatory when the existing audit contains broken assumptions, outdated risks, or missing structural reality.

### 3. Update the implementation plan before coding

Before implementation:

1. record the planned milestone or task
2. mark current status clearly
3. add or adjust checklist items if scope changed
4. note blockers, assumptions, or prerequisites

This prevents code from moving ahead while the plan still describes an older intent.

### 4. Implement the planned change

Do the work described in the plan.

If the scope changes materially while implementing, update the implementation plan during the same work session instead of waiting until later.

### 5. Update the implementation plan after coding

After implementation:

1. mark completed items with status and date
2. update milestone state
3. add `Noteringar:` with key implementation details when useful
4. record anything intentionally deferred

Preferred completion format where already used in the repo:

- `[x]` plus `✅ KLAR (YYYY-MM-DD)`

### 6. Update the audit after coding

After implementation:

1. update the current-state sections that changed
2. resolve or downgrade risks that were actually fixed
3. add newly discovered risks
4. note important behavioral or structural diffs
5. update `Last updated` and `Last validated`

The audit should reflect the new reality immediately after the implementation lands.

### 7. Update architecture when the stable design changed

If the work changed durable structure, also update the architecture doc:

- route structure
- component ownership
- data flow
- domain boundaries
- canonical APIs or tables

Do not force architecture updates for small bug fixes that do not change system shape.

## Rules for new audits or new triplets

When creating a new audit or implementation plan:

1. place it in the domain's canonical location
2. reuse the existing naming pattern for that domain when one exists
3. if no canonical location exists, place it according to [REPO_GOVERNANCE.md](../REPO_GOVERNANCE.md) and the domain's doc structure
4. register it in navigation docs if it becomes a canonical entrypoint

For this repo specifically:

- existing active root triplets stay where they already are unless there is an explicit migration plan
- do not create new root-level active triplets unless governance explicitly allows it

If a new canonical triplet is introduced, update these in the same change when relevant:

- [README.md](README.md)
- [DOCS_INDEX.md](DOCS_INDEX.md)
- [INVENTORY.md](INVENTORY.md)
- [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md)
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)

## Recommended templates

Use these templates when creating new triplet documents:

- [templates/TRIPLET_ARCHITECTURE_TEMPLATE.md](templates/TRIPLET_ARCHITECTURE_TEMPLATE.md)
- [templates/TRIPLET_AUDIT_TEMPLATE.md](templates/TRIPLET_AUDIT_TEMPLATE.md)
- [templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md](templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md)

Use [TRIPLET_CREATION_CHECKLIST.md](TRIPLET_CREATION_CHECKLIST.md) when creating a new canonical triplet in the repo.

## Minimum completion rule

A domain task is not documentation-complete until all relevant documents are synchronized:

- implementation plan reflects what was done
- audit reflects current reality
- architecture reflects stable structural change when applicable

## Anti-patterns

Avoid:

- implementing from an old audit without re-verifying it
- marking work as complete in code but leaving the implementation plan outdated
- resolving risks in code without updating the audit
- creating a new audit in an ad hoc location
- leaving dates blank on active docs
- creating replacement docs when the existing canonical doc should have been updated

## Definition of done

This workflow is working when:

- agents can start from the existing triplet instead of re-auditing from scratch
- audits show dated, verified current reality
- implementation plans show both planned and completed work
- structural changes leave a trace in both code and documentation
- stale docs become visible quickly because dates and status no longer hide drift
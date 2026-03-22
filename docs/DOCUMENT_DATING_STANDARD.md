# Document Dating Standard

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-03-21

## Purpose

This document defines how dates must be used in active documentation.

The goal is to stop date drift, prevent false freshness, and make it obvious whether a document was merely edited or actually verified against reality.

## Core rule

Do not update dates mechanically.

Each date field has a different meaning. If those meanings drift, the documentation system becomes untrustworthy.

Do not guess today's date from memory.

## Authoritative date source

When writing or updating document dates, use this order of trust:

1. the current conversation or runtime context date, if explicitly provided by the system
2. the local system date from the active machine, if you explicitly checked it during the session

Rules:

- never infer today's date from an older document
- never reuse a previous session's date without checking
- if you are updating active canonical docs and the current date is unclear, verify it before writing metadata
- if there is any doubt, check the system date first and then stamp the document

Practical rule:

- if the environment already provides the current date in the active session context, use that
- otherwise run a date check before editing active canonical doc metadata

## Required date semantics

### `Date`

Use `Date` for the origin date of the document or workstream.

Meaning:

- when the document was first created
- or when the current workstream / revision series began

Rules:

- do not change `Date` on normal follow-up edits
- change it only if the document is intentionally restarted as a new revision baseline
- keep revision notes in the same line if needed, for example `2026-03-06 (rev 4)`

### `Last updated`

Use `Last updated` when the document content changed materially.

Meaning:

- the document text was meaningfully changed
- findings, status, scope, decisions, milestones, or guidance changed

Rules:

- update it when the document meaning changed
- do not update it for trivial formatting-only edits unless the formatting change materially improves usability or structure
- if you changed content and verified it in the same pass, `Last updated` and `Last validated` may be the same date

### `Last validated`

Use `Last validated` only when the document was checked against reality.

Meaning:

- the document was compared to current code, schema, routes, runtime wiring, or operational state

Rules:

- only update it after actual verification
- do not bump it just because you touched wording
- do not copy `Last updated` into `Last validated` unless verification really happened
- if the document is still unverified, keep the old date or leave it blank if the doc has never been validated

## Required format

Use ISO dates only:

- `YYYY-MM-DD`

Allowed:

- `2026-03-21`
- `2026-03-06 (rev 4)` for a stable revision label on `Date`
- `2026-03-19 (publish/status canonicalization)` as an annotation on `Last updated` when the note helps future readers

Avoid:

- `December 10, 2024`
- `21/03/2026`
- `2026-3-9`
- undated `Updated recently`

## Language rule

Use either English or Swedish labels consistently within the document.

Preferred English labels:

- `Date`
- `Last updated`
- `Last validated`

Preferred Swedish labels:

- `Datum`
- `Senast uppdaterad`
- `Senast validerad`

Do not mix random variants such as `Last Updated`, `Audit Date`, `Startdatum`, and `Senast uppdaterad av ...` in active canonical docs unless there is a strong domain reason.

## Decision table

| Situation | Update `Date` | Update `Last updated` | Update `Last validated` |
|----------|----------------|-----------------------|-------------------------|
| New active doc created | Yes | Yes | Only if verified immediately |
| Material content change after coding | No | Yes | Yes, if verified |
| Verified doc with no content changes | No | No | Yes |
| Pure formatting cleanup | No | Usually no | No |
| Navigation/index update only | No | Yes if meaningfully changed | No |
| Re-baselined document / new revision series | Yes | Yes | Yes if verified |

## Rules for active canonical docs

For active canonical docs, place the dating fields near the top.

Minimum recommended fields:

- `Date`
- `Last updated`
- `Last validated`
- `Status`
- `Scope`

If the document is active and missing these fields, add them the next time the document is materially updated.

## Rules for triplets

For `architecture + audit + implementation plan` triplets:

- architecture: update `Last updated` only when stable design changed
- audit: update `Last validated` whenever the audit is rechecked against reality
- implementation plan: update `Last updated` whenever milestone state changed

If code changed but the audit or implementation plan date did not change, that is a review smell.

## Anti-patterns

Avoid:

- bumping all dates to today's date to make docs look fresh
- guessing today's date from model memory instead of the active session context or system date
- treating `Last updated` as proof of verification
- updating `Last validated` without checking code or runtime reality
- changing `Date` every time the doc changes
- using multiple date formats in active canonical docs

## Practical review rule

When reviewing a canonical doc, ask three questions:

1. When was this document started?
2. When did its content last materially change?
3. When was it last verified against reality?

If the current metadata does not answer those three questions clearly, the date block is not good enough.

## Definition of done

The dating system is working when:

- readers can distinguish age from freshness
- `Last validated` actually means verified
- active docs use one date format
- stale canonical docs become visible instead of hiding behind misleading timestamps

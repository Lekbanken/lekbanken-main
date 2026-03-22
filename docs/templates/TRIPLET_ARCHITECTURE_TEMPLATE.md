# [Domain Name] — Architecture

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: -

> Active template for new architecture documents in domains that use an architecture + audit + implementation plan triplet.

**Scope:** Routes, components, data flow, domain boundaries  
**Template status:** Active reference architecture

---

## Purpose

Describe the stable system design for this domain.

Use this document for:

- route structure
- component ownership
- domain boundaries
- data flow
- durable architectural decisions

Do not use this document as a backlog or audit log.

---

## 1. System overview

[2-5 paragraphs or a diagram describing the domain at a high level]

---

## 2. Route structure

| Route | File | Responsibility |
|-------|------|----------------|
| `/app/example` | `app/app/example/page.tsx` | Example |

---

## 3. Component map

| Component | Location | Responsibility | Notes |
|-----------|----------|----------------|-------|
| `ExamplePanel` | `features/example/components/ExamplePanel.tsx` | UI orchestration | Canonical |

---

## 4. Data flow

```text
Client UI
  -> route handler or server action
  -> domain service
  -> Supabase / external system
  -> response / state update
```

Document:

- canonical reads
- canonical writes
- cache boundaries
- feature-flag or tenant boundaries

---

## 5. Domain boundaries

State clearly:

- what belongs to this domain
- what it imports from adjacent domains
- what must not be duplicated elsewhere

---

## 6. Durable decisions

| ID | Decision | Reason | Consequence |
|----|----------|--------|-------------|
| ADR-1 | Example decision | Why | What this locks in |

---

## 7. Change log for stable design

- YYYY-MM-DD: [Describe architectural change]

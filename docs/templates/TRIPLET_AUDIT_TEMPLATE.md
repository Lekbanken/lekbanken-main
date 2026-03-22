# [Domain Name] — Audit

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: -

> Active template for current-state audit documents in domains that use an architecture + audit + implementation plan triplet.

**Scope:** Files, routes, tables, APIs, runtime surfaces covered by this audit  
**Template status:** Active audit

---

## Purpose

Describe the current verified reality of the domain.

Use this document for:

- what exists now
- what was verified
- current risks
- resolved risks
- diffs from earlier assumptions

Do not use this document as a future-state implementation plan.

---

## 1. Current state

### 1.1 Routes and navigation

| Route | File | Verified behavior | Notes |
|-------|------|-------------------|-------|
| `/app/example` | `app/app/example/page.tsx` | Loads example page | - |

### 1.2 Runtime chain

Document the actual wiring:

```text
Layout
  -> page
  -> feature component
  -> hooks/services
  -> storage or API
```

### 1.3 Data model / APIs

| Surface | Status | Notes |
|---------|--------|-------|
| `example_table` | Verified | RLS enabled |
| `/api/example` | Verified | Uses domain service |

---

## 2. Risks

| Risk | Likelihood | Impact | Description | Status |
|------|------------|--------|-------------|--------|
| Example drift | Medium | Medium | Audit differs from runtime | Open |

Use these conventions where relevant:

- resolved risks may be struck through and marked `✅ LÖST`
- important fixes may be annotated with completion date

---

## 3. Verified diffs from previous audit

- YYYY-MM-DD: [What was previously assumed]
- YYYY-MM-DD: [What is now confirmed]

---

## 4. Recommended follow-up

### High priority

- [ ] Item

### Medium priority

- [ ] Item

### Low priority

- [ ] Item

---

## 5. Validation notes

Record the basis for the audit:

- files inspected
- routes followed
- DB objects checked
- tests or runtime checks used

# Admin Tech Review (follow-up to Claude overview)

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-04
- Last updated: 2026-03-21
- Last validated: -

> Historisk uppföljningsreview av adminytan. Behåll som genomfört tekniskt reviewunderlag, inte som aktuell design- eller strukturkälla.

## Scope
- Admin UI/logic only. No auth or Supabase security touched.
- Reviewed shared admin primitives and tightened layout/accessibility.

## Adjustments Made
- `AdminPageLayout`: adds consistent page padding/spacing and retains max-width options so all admin pages inherit the same gutter and rhythm.
- `AdminGrid`: replaces dynamic Tailwind class composition with a safelisted map for gaps/columns to avoid missing classes in builds.
- `AdminDataTable`: fixes pagination copy to use a real en dash for item ranges.
- `AdminPageHeader`: uses an accessible `<nav aria-label="Brödsmulor">` with `<ol>` for breadcrumbs.

## Notes / Opportunities
- Shared primitives now carry spacing; admin pages can drop bespoke padding wrappers.
- Grid helpers are predictable for Tailwind JIT. If additional breakpoints are needed, extend the explicit maps rather than string interpolation.
- Breadcrumbs now have better semantics; consider adopting the same pattern in other headers.

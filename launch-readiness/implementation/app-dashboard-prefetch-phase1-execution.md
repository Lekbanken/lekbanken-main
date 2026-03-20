# App Dashboard Prefetch Phase 1

## Goal

Reduce startup route churn on `/app` by disabling non-essential route prefetch on the dashboard and app shell.

## Scope

Only change these files in Phase 1:

- `features/journey/AppDashboardPage.tsx`
- `components/app/nav-items.tsx`
- `components/app/SideNav.tsx`
- `components/app/BottomNav.tsx`

Do not change fetch logic, notification behavior, loading states, or route structure in this phase.

## Prefetch Rule

Keep prefetch only for the single most likely next navigation from the dashboard:

- Keep: `/app/browse`

Disable prefetch for all other dashboard and shell links in scope.

## Implementation Rules

- Add `prefetch={false}` to secondary dashboard links.
- Add explicit prefetch control to app shell nav items.
- Keep the existing redirect-route canonicalization intact.
- Do not combine this patch with fetch, cache, or notification changes.

## Measurement Plan

Measure immediately after Phase 1 on first open of `/app`:

1. Number of `_rsc` requests
2. Number of fetch/XHR requests in the first 5 seconds
3. Time until the dashboard feels usable
4. Whether navigation to planner/play/browse feels slower

## Decision Rule

1. If startup request noise drops and navigation still feels good, continue to Phase 2.
2. If one destination feels meaningfully slower, re-enable prefetch only for that route.
3. Do not broaden prefetch again globally.

## Out Of Scope

- Dashboard mount fetch decomposition
- Notification bell startup changes
- Skeleton/loading refactors
- Additional alias or route cleanup
## Artifact State Machine Change

> Use this template when your PR modifies `ArtifactStateStatus` values, guards, or status-derived UI.
> Reference: `ARTIFACT_COMPONENTS.md §9 ArtifactStateStatus Contract`

### Policy

Adding a new `ArtifactStateStatus` value requires: updating §9 + at least one UI map (Badge/Pin/Panel) + a derivation rationale in the PR description. A status that is never assigned by `loadArtifacts()` must not exist in the union.

### Checklist

- [ ] Updated derivation in `loadArtifacts()` in `useSessionState.ts` (source of status assignment)
- [ ] Updated `ARTIFACT_STATUSES` const array in `types/session-cockpit.ts` (type is derived automatically)
- [ ] Updated all status-map lookups: `STATE_CONFIG` (ArtifactBadge), `STATUS_DOT` (PinnedArtifactBar)
- [ ] Updated guards in `DirectorArtifactActions`, `ArtifactInspector`, `DirectorModePanel` per §9 Guard Guidance
- [ ] Searched for status strings globally and fixed all remaining references:
  ```sh
  # ripgrep (recommended, cross-platform)
  rg -n "(ArtifactStateStatus|'hidden'|'revealed'|'solved'|'failed'|'locked')" --type ts --type tsx .

  # PowerShell fallback (Windows)
  Select-String -Path .\**\*.ts,.\**\*.tsx -Pattern "ArtifactStateStatus|'hidden'|'revealed'|'solved'|'failed'|'locked'" -List
  ```
- [ ] Updated docs: `ARTIFACT_COMPONENTS.md §9` (if semantics changed)
- [ ] `tsc --noEmit` clean
- [ ] `eslint` on changed files — no new errors

### What changed and why

<!-- Brief description of the status change and its motivation -->

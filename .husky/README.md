# Developer Guardrails

## Metadata
- Status: active
- Date: 2025-12-10
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: repo-governance
- Scope: Local git-hook quality guardrails

Lekbanken använder tre nivåer av kvalitetskontroll — **lokalt innan commit, lokalt innan push, och i GitHub Actions på PR**. Målet: **fel ska fångas innan de når main**.

## Nivåmodell

### Nivå A — Pre-commit (snabb, staged filer)
Körs automatiskt på varje `git commit`:
- **lint-staged**: ESLint på ändrade `.ts/.tsx`, action-validator på `.yml/.yaml`
- **TypeScript**: `tsc --noEmit` (hela projektet, ~15s)

### Nivå B — Pre-push (full verify)
Körs automatiskt på varje `git push`:
- ESLint (hela projektet)
- TypeScript typecheck
- Workflow-validering (alla `.github/workflows/*.yml`)
- i18n-validering
- Vitest unit tests
- Integrationstester

Exakt samma kontroller som GitHub Actions kräver.

### Nivå C — GitHub Actions (PR gate)
Körs på alla PRs till `main`/`develop` via `.github/workflows/validate.yml`:
- Alla Nivå B-kontroller
- `as any`-check på ändrad kod
- Next.js build
- (Specialiserade workflows: RLS-tester, baseline-check, i18n-audit — körs separat med path-filter)

## Kommandon

| Kommando | Vad det gör | När |
|----------|-------------|-----|
| `npm run verify` | Full verify (= Nivå B) | Manuellt / pre-push |
| `npm run verify:quick` | Lint + typecheck + workflows + i18n | Snabbkoll |
| `npm run check:workflows` | Validera GitHub Actions-filer | Manuellt |
| `npm run lint` | ESLint | Manuellt |
| `npm run type-check` | TypeScript | Manuellt |

## Branch-strategi

> **Pusha aldrig direkt till `main`.**

Rekommenderad flow:
1. Skapa branch: `git checkout -b feat/mitt-arbete`
2. Jobba, committa (pre-commit körs automatiskt)
3. `git push` (pre-push verify körs automatiskt)
4. Öppna PR i GitHub
5. `validate.yml` körs — grön = merge-redo
6. Merge via GitHub

### Branch protection (GitHub UI)
Konfigurera i GitHub → Settings → Branches → Branch protection rules för `main`:
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Required: `Lint + Typecheck + Tests` (från validate.yml)
- [x] Require branches to be up to date before merging
- [ ] Include administrators (valfritt — tillåter admin emergency merge)

## Bypass (använd sparsamt!)

```bash
git commit --no-verify  # hoppa pre-commit
git push --no-verify    # hoppa pre-push verify
```

**Använd aldrig `--no-verify` som vana.** Det är en nödlucka, inte en genväg.

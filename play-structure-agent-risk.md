# Play Structure — Agent Risk Profile

> Generated 2026-03-16. Rules for AI agents working in the play domain.

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Frozen agent-risk snapshot for the 2026-03-16 play structure audit pass. Revalidated 2026-03-21 after the orphan cleanup. Current working rules still defer to repo governance and the active play docs cluster.

---

## Architecture Quick Reference

The play domain uses a **4-layer architecture**. Dependencies flow **one direction only**:

```
components/play/          ← Shared UI primitives (puzzle modules, immersion, session UI)
  ↑ imported by
features/play/            ← Domain orchestration (play modes, director, sessions)
  ↑ imported by
features/play-participant/  ← API client (join/create session, token persistence)
  ↑ imported by
lib/play/                 ← Server utilities (guards, commands, state mapping)
```

Route pages import from `features/play` and `components/play` as needed.

---

## Import Rules

### MUST

- Import **puzzle UI components** from `@/components/play`
- Import **play mode shells, director, session orchestration** from `@/features/play`
- Import **session API calls** from `@/features/play-participant` (client-side) or `@/lib/play` (server-side)

### MUST NOT

- `components/play/` must **never** import from `features/play/` — this would create a circular dependency
- `components/play/` must **never** import from `features/play-participant/` or `lib/play/`
- Do not create new files in `components/play/` unless the component is truly shared across marketing, admin, sandbox, AND features/play

### CHECK

Before adding a new play component, verify:

1. Is it used by multiple consumers (routes, sandbox, marketing)? → `components/play/`
2. Is it only used within play session orchestration? → `features/play/`
3. Is it a server-only utility for API routes? → `lib/play/`

---

## File Placement Guide

| Category | Location | Examples |
|----------|----------|---------|
| Puzzle interaction module | `components/play/` | RiddleInput, TilePuzzle, CipherDecoder |
| Immersion overlay | `components/play/` | CountdownOverlay, TypewriterText, StoryOverlay |
| Session status UI | `components/play/` | SessionStatusBadge, SessionControls |
| Play mode shell | `features/play/` | HostPlayMode, ParticipantPlayMode |
| Session management | `features/play/` | ActiveSessionShell, RunsDashboard |
| Director mode | `features/play/` | DirectorModePanel, DirectorModeDrawer |
| Realtime hooks | `features/play/hooks/` | useLiveSession, usePuzzleRealtime |
| Play API calls | `features/play/api/` | session-api, chat-api, signals-api |
| Join/create session | `features/play-participant/` | joinSession, createSession |
| API route guards | `lib/play/` | session-guards, session-command |

---

## Barrel Export Surfaces

| Module | Import path | What it exports |
|--------|-------------|-----------------|
| `components/play` | `@/components/play` | Shared UI components + hooks |
| `features/play` | `@/features/play` | Play modes, session shells, RunsDashboard, PlayPlanPage, types |
| `features/play-participant` | `@/features/play-participant` | API functions + token storage |
| `lib/play` | `@/lib/play` | No barrel — import individual files |

---

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|---------------|-----------------|
| Creating puzzle component in `features/play/` | Puzzle UI is shared — used in sandbox, marketing | Put in `components/play/`, export via barrel |
| Importing `@/components/play` in API routes | UI primitives in server code | Use `@/lib/play` for server utilities |
| Duplicating a component that exists in `components/play/` | components/play already has Session*, Participant*, puzzle modules | Check `components/play/index.ts` first |
| Moving components/play into features/play | Breaks marketing, admin, sandbox consumers | Leave the architecture as-is |
| Adding feature-specific orchestration to components/play | Violates the shared primitive contract | Put orchestration in features/play |

---

## Route Wiring Reference

| Route pattern | Primary imports |
|---------------|----------------|
| `app/(marketing)/play/**` | `components/play` (JoinSessionForm, SessionStatusBadge) + `features/play` (ParticipantPlayMode) |
| `app/app/play/**` | `features/play` (all play modes, session shells, RunsDashboard) |
| `app/admin/**/game-builder/**` | `components/play` (TriggerWizard) |
| `app/sandbox/play/**` | `components/play` (puzzle modules, lobby, immersion) |
| `app/api/play/**` | `lib/play` (guards, commands) + `features/play-participant` (API functions) |

---

## Resolved Risk

This domain was previously classified as "largest structural risk" in `repo-structure-consolidation-plan.md`. The 2026-03-16 audit found:

- The architecture is **intentional and correct** — NOT a broken parallel system
- Dependencies flow in **one direction only** (no circular imports)
- The historical orphan (`SessionCard.tsx`) is already deleted; no current orphaned file remains from that 2026-03-16 pass
- `SessionHeader` exists in both trees but they are **different components** with different props — both are used
- No reorganisation needed

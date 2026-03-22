# Play Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-22
- Last validated: 2026-03-21

> Entry point for the play documentation cluster. This folder mixes active play references, contracts, and dated audit snapshots that must be read together with the cluster-local play structure guardrails.

## Purpose

Use this folder to understand the runtime play system, participant UI rules, trigger contracts, and bounded audit history for `/play` and related session surfaces.

The play structure audits in this folder remain the guardrails for large-scale refactors. The files here include both structural guardrails and more feature-/UI-specific play references.

## Read order

1. `play-structure-audit.md`
2. `PLAY_SYSTEM_DOCUMENTATION.md`
3. `PLAY_UI_CONTRACT.md`
4. `TRIGGER_ENGINE_CONTRACT.md`
5. The active audits in this folder for specific participant/play-mode questions
6. Older wiring snapshots only when you need audit history

## Status map

### Active references

- `PLAY_SYSTEM_DOCUMENTATION.md` — broad play-system reference and workstream log
- `PLAY_UI_CONTRACT.md` — canonical surface/layout contract for play UIs
- `TRIGGER_ENGINE_CONTRACT.md` — canonical trigger-engine contract
- `PARTICIPANT_PLAY_UI_LAWS.md` — immutable participant UI laws for the mobile-first play view
- `LEGENDARY_PLAY_ADVANCED_FEATURES.md` — advanced immersion UX draft for Legendary Play
- `PLAY_SESSIONS_UI_SPEC.md` — draft UI/UX spec across participant, host, and admin play surfaces

### Active audits

- `play-structure-audit.md` — frozen structural guardrail for the deliberate 4-layer play architecture
- `play-structure-agent-risk.md` — frozen agent-risk guardrail for play-domain changes
- `play-structure-canonical-map.md` — frozen file classification map for play-related surfaces
- `PARTICIPANT_PLAY_AUDIT.md` — participant play architecture and contract audit
- `PLAY_MODE_UI_AUDIT.md` — play-mode routing and UI audit
- `PLAY_UI_WIRING_AUDIT_REPORT_v2.md` — current verified wiring audit reference
- `PLAY_LOBBY_SOT.md` — frozen host-lobby source-of-truth snapshot

### Historical snapshots

- `PLAY_IMPLEMENTATION_GUIDE_P0.md` — bounded P0 implementation guide
- `PLAY_UI_WIRING_AUDIT_REPORT.md` — earlier wiring audit snapshot superseded by v2
- `LEGENDARY_PLAY_IMPLEMENTATION_PLAN.md` — historical Legendary Play rollout plan
- `play-structure-consolidation-plan.md` — historical action-plan snapshot from the 2026-03-16 play structure audit

## Related guardrails

- `play-structure-audit.md`
- `play-structure-canonical-map.md`
- `play-structure-agent-risk.md`

## Working rule

If a file in this folder conflicts with the current play structure guardrails or the code, prefer the play structure audits in this folder for structural questions and the active contracts in this folder for surface-specific rules.
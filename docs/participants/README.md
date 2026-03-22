# Participants docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the participants documentation cluster. Use this folder for participant-session identity, join flows, play-surface linkage, and historical participants specs.

## Purpose

This cluster covers anonymous participant identity, participant sessions, join and rejoin flows, token lifecycle, and the historical architecture and MVP notes that explain how the current implementation evolved.

## Read order

1. [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md)
2. [../PLAY_DOMAIN.md](../PLAY_DOMAIN.md) for the play runtime that consumes participants tables and APIs
3. [PARTICIPANTS_DOMAIN_ARCHITECTURE.md](PARTICIPANTS_DOMAIN_ARCHITECTURE.md) only for historical design context
4. [PARTICIPANTS_DOMAIN_MVP.md](PARTICIPANTS_DOMAIN_MVP.md) and [PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md](PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md) only for historical context

## Active docs

- [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md) — current participants domain reference anchored to repo code

## Historical docs

- [PARTICIPANTS_DOMAIN_ARCHITECTURE.md](PARTICIPANTS_DOMAIN_ARCHITECTURE.md) — historical architecture/spec snapshot
- [PARTICIPANTS_DOMAIN_MVP.md](PARTICIPANTS_DOMAIN_MVP.md) — historical MVP/spec snapshot
- [PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md](PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md) — historical implementation report snapshot

## Related docs

- [../PLAY_DOMAIN.md](../PLAY_DOMAIN.md) — canonical play runtime and host/participant flow reference
- [../GAMES_DOMAIN.md](../GAMES_DOMAIN.md) — game content model referenced by play sessions

## Placement rule

- Keep active participants and anonymous-join docs in `docs/participants/`.
- Keep historical architecture, MVP, and implementation-report snapshots in this cluster rather than in root `docs/`.
- Do not add participants domain docs back to root `docs/`.
# Hub Structure Source

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active source brief for Notion AI hub generation. Use it to shape Notion navigation hubs without introducing repo-divergent technical claims.

## Purpose

This file gives Notion AI a safe structure for the first important hubs in the Lekbanken workspace.

The hubs should summarize and route people correctly. They should not become duplicate technical manuals.

## Engineering Hub

### Purpose

Entry point for developers and technical contributors.

### Should contain

- links to repo docs and architecture entry points
- workflow and tooling guidance
- release and handoff summaries
- links to domain docs

### Recommended sections

1. What this hub is for
2. Start here
3. Workflow and environments
4. Architecture and domains
5. Release and handoff
6. Active priorities

### Key repo docs

- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/README.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/VS_CODE_WORKFLOW.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/TOOLING_MATRIX.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/PROJECT_CONTEXT.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/launch-readiness/launch-control.md

## Operations Hub

### Purpose

Entry point for environments, deploy flow, incidents, runbooks, and operational constraints.

### Should contain

- environment model summary
- deployment flow summary
- runbook navigation
- incident and monitoring entry points

### Recommended sections

1. What this hub is for
2. Environments
3. Deployment flow
4. Runbooks
5. Monitoring and incidents

### Key repo docs

- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/database/environments.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/ops/OPERATIONS_DOMAIN.md
- https://github.com/Lekbanken/lekbanken-main/tree/main/docs/ops
- https://github.com/Lekbanken/lekbanken-main/blob/main/launch-readiness/launch-control.md

## Product Hub

### Purpose

Entry point for roadmap, planning, domain-level understanding, and product direction.

### Should contain

- roadmap and planning overview
- domain summaries
- key decisions and status pages
- links to canonical domain docs in repo

### Recommended sections

1. What this hub is for
2. Product overview
3. Domain map
4. Roadmap and planning
5. Decisions and status

### Example repo docs to link

- https://github.com/Lekbanken/lekbanken-main/blob/main/PROJECT_CONTEXT.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/platform/PLATFORM_DOMAIN.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/games/GAMES_DOMAIN.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/PLANNER_DOMAIN.md
- https://github.com/Lekbanken/lekbanken-main/blob/main/docs/journey/JOURNEY_DOMAIN.md

## Cross-hub rules

- Do not duplicate large technical specifications.
- Prefer short explanations followed by repo links.
- Make ownership and purpose obvious.
- Use Notion for browseability and orientation.
- Keep implementation truth in the repo.
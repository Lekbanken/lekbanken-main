# AI Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for AI feature-gating policy and AI-agent coding guardrails. Use this folder when you need the current AI scope, rollout constraints, or mandatory agent rules.

## Purpose

This folder contains the canonical AI-domain and AI-agent guidance for Lekbanken.

Use it to answer:

- what AI functionality is currently in scope and how it is gated
- which feature flags must remain off by default
- which coding guardrails AI agents must read before making changes

## Read order

1. `AI_CODING_GUIDELINES.md`
2. `AI_DOMAIN.md`
3. `../VS_CODE_WORKFLOW.md`
4. `.github/copilot-instructions.md` from repo root

## Status map

### Active

- `AI_CODING_GUIDELINES.md` — canonical AI-agent coding guardrail reference for repo-wide implementation work
- `AI_DOMAIN.md` — canonical AI feature-flag and scope reference for user-facing AI capabilities

## Working rule

If AI implementation guidance conflicts with repo workflow or domain-specific canonical docs, prefer `.github/copilot-instructions.md`, `../VS_CODE_WORKFLOW.md`, and the relevant domain cluster docs.
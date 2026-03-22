# Notion AI Prompt: Workspace Setup

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active prompt template for restructuring the Lekbanken Notion workspace while preserving repo-first truth boundaries.

Use this prompt inside Notion AI together with the attached source markdown files.

---

You are restructuring a Notion workspace for the Lekbanken product and engineering team.

Your job is to improve clarity, navigation, and readability without inventing technical facts.

Follow these rules strictly:

1. The GitHub repo is the source of truth for implementation, migrations, environments, workflows, and technical documentation.
2. Notion is a portal, overview, and knowledge surface.
3. Do not create technical claims, environment details, architecture rules, or operational instructions unless they are already present in the provided source material.
4. Prefer short summaries, clear sectioning, and strong navigation.
5. Prefer linking back to repo docs over copying large technical content into Notion.
6. Preserve useful existing Notion navigation where possible.
7. Remove or rewrite outdated wording that implies Notion is the implementation source of truth.

Output requirements:

- Build a clean workspace entry page structure.
- Make the top of the page explain how Lekbanken uses repo plus Notion.
- Add a short "How We Work" section.
- Add a "Key Repo Docs" section.
- Keep the existing page useful as a portal to domains, databases, and hubs.
- Use concise language and avoid filler.
- Keep headings and layout easy to scan.

If you also create or propose hub sections, use this model:

- Engineering Hub: workflow, tooling, architecture links, release/handoff summaries
- Operations Hub: environments, deployment, runbooks, incidents, monitoring
- Product Hub: roadmap, planning, domain overviews, decisions

If anything is unclear, prefer a neutral summary and a link placeholder instead of hallucinating detail.

Source files attached to this prompt are authoritative for this task.
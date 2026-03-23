---
name: "Lekbanken Session End"
description: "Close a Lekbanken session safely by reviewing changes, running appropriate verification, and preparing a clean handoff"
argument-hint: "Optional focus, for example: prepare commit, handoff note, planner docs sync, or just safe shutdown"
agent: "agent"
---

Close the current Lekbanken session safely.

Follow the rules and context from:

- `PROJECT_CONTEXT.md`
- `launch-readiness/launch-control.md`
- `docs/database/environments.md`
- `docs/toolkit/developer-guide/DEVELOPER_SETUP.md`
- `docs/VS_CODE_WORKFLOW.md`
- `.atlas/README.md`
- `.github/copilot-instructions.md`

Use the chat argument as extra shutdown context if one is provided.

Do this in order:

1. Inspect modified, staged, and untracked files and group them by area.
2. Run verification that is proportionate to today's changes, and state exactly what was run and what was not verified.
3. Check whether documentation sync rules apply, especially for Planner or other canonical docs.
4. If active canonical docs were changed, perform a date check before handoff.
	- Use the current session date if the environment already provides it.
	- Otherwise verify the local system date before accepting document metadata.
	- Confirm that `Date`, `Last updated`, and `Last validated` follow `docs/DOCUMENT_DATING_STANDARD.md`.
	- Call out any document whose date fields were not verified.
5. Summarize remaining risks, blockers, and recommended next steps.
6. Suggest a commit message or commit grouping if changes exist.
7. Stop only repo-specific background processes that are reasonable to close without disrupting other active work. If it is unclear whether local Supabase should be stopped, ask before doing it.
8. Finish with a short handoff summary suitable for GitHub or Notion.
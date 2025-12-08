# Planner Domain TODOs

## Database / Supabase
- Migration `20251208120000_planner_modernization.sql` is applied remote. Regenerate `types/supabase.ts` when DB changes (supabase gen types).
- Add RPC or trigger to keep `plans.total_time_minutes` updated server-side (currently computed in API).
- Consider stricter guards for public visibility directly in RLS (requires role claims strategy) if more publishers appear.
- Add indexes for `plan_blocks.block_type` once usage patterns settle.

## API
- Bulk block reorder endpoint implemented (`POST /api/plans/[planId]/blocks/reorder`) for drag/drop sorting.
- Add published/template state if plans will be shared publicly beyond visibility flag.
- Extend `/api/plans/[planId]/play` with caching headers once Play domain consumes it.
- Add tenant note retrieval/update endpoints with richer audit info if shared editing is expanded.
- Add validation for timer metadata when timer UX lands (block-level timer schema in metadata).

## UI/UX
- Implement visibility switcher (private/tenant/public) with guardrails for system admin creation of public plans.
- Surface tenant-level notes and collaborative indicators in PlannerPage (read + write per RLS guardrails).
- Drag-and-drop sorting for blocks added (optimistic reorder + bulk API); keep improving affordances.
- Improve game picker (filters, cover thumbnails, translations) and integrate game duration/materials in block cards.
- Connect Play domain to plan playback via `/api/plans/[planId]/play`; add “Start plan” entry point in Play UI.
- Add empty states and error handling for plan detail SSR page.
- Add optimistic state for blocks/notes and toast feedback on errors.

## Documentation / Notion
- Sync Planner domain page in Notion with new tables (`plan_notes_private`, `plan_notes_tenant`, `plan_play_progress`), enums, and API routes.
- Document translation/cover fallback for game blocks (sv → no → en) and duration calculation rules.
- Clarify ownership vs tenant editing rules and how they map to system_admin/admin roles.
- Add QA checklist: auth cookie present, tenant header, create/update plan, add/move/delete block, save private + tenant notes, change visibility, play endpoint returns data.

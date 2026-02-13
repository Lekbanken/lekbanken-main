-- v3.0: Add faction_id to user_progress for personalization
-- Factions are purely cosmetic; they change the Journey hub theme.
-- Valid values: 'forest', 'sea', 'sky', 'void', or NULL (neutral default).

alter table public.user_progress
  add column if not exists faction_id text null;

comment on column public.user_progress.faction_id is
  'Cosmetic faction choice – drives Journey hub theming. NULL = neutral/default.';

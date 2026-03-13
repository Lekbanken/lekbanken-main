-- Adds minimal UX support for locked achievements (hints + easter eggs)

alter table public.achievements
  add column if not exists is_easter_egg boolean not null default false;

alter table public.achievements
  add column if not exists hint_text text;

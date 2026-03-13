-- Add engagement/rating metrics for better browse sorting
alter table public.games
  add column if not exists popularity_score double precision default 0 not null,
  add column if not exists rating_average double precision,
  add column if not exists rating_count integer default 0 not null;

create index if not exists games_popularity_score_idx on public.games (popularity_score desc nulls last);
create index if not exists games_rating_idx on public.games (rating_average desc nulls last, rating_count desc nulls last);

-- Gamification/Play: fix seeded achievement condition type
-- The seed "thousand-points" describes total points, so use total_score.

begin;

update public.achievements
set condition_type = 'total_score'
where achievement_key = 'thousand-points'
  and condition_type = 'score_milestone';

commit;

drop function if exists public.admin_get_gamification_analytics_v1(uuid, integer);
drop function if exists public.admin_get_gamification_analytics_v2(uuid, integer);
drop function if exists public.admin_get_gamification_analytics_v3(uuid, integer);
drop function if exists public.admin_get_gamification_analytics_v4(uuid, integer);

drop function if exists public.record_usage(uuid, text, numeric, jsonb);
drop function if exists public.redeem_gift_code(text, uuid);
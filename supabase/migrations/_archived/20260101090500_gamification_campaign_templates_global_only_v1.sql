-- Gamification Campaign Templates v1.1
-- Start with global-only templates (system_admin curated).
-- Enforces tenant_id IS NULL.

begin;

alter table public.gamification_campaign_templates
  drop constraint if exists gamification_campaign_templates_global_only;

alter table public.gamification_campaign_templates
  add constraint gamification_campaign_templates_global_only check (tenant_id is null);

commit;

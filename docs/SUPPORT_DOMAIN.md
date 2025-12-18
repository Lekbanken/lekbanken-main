# Support Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Purpose

Support Domain ansvarar för att samla in och hantera användarfeedback, supportärenden och bug reports.

Domänen består av:
- Datamodell (Supabase tables + RLS)
- Client-side service-funktioner (Supabase client)
- Admin UI för hantering

## Key responsibilities

- Feedback från användare (t.ex. förbättringsförslag, bug, feature request)
- Support tickets med status/priority, assignment och konversation
- Bug reports med metadata (felmeddelande, steps to reproduce)
- Tenant-/admin-vy för att hantera inkomna ärenden

## Non-goals

- Incident management / ops-runbooks (Operations Domain)
- Notifikationsleverans (Notifications Domain)
- Produktprioritering/roadmap (Product process, ev Notion)

## Data model (Supabase)

Källan för schema är migrationen:
- `supabase/migrations/20251129000003_support_domain.sql`

Centrala tabeller:
- `feedback`
  - `type`: `bug | feature_request | improvement | other`
  - `status`: text (default `received`)
- `support_tickets`
  - `status`: `open | in_progress | waiting_for_user | resolved | closed`
  - `priority`: `low | medium | high | urgent`
  - `assigned_to_user_id`: valfritt
- `ticket_messages`
  - `ticket_id`, `user_id`, `message`, `is_internal`
- `support_reports` (aggregerad statistik per tenant)
- `bug_reports`

RLS (översikt):
- Användare kan se/posta sina egna items.
- Tenant-medlemmar kan se tenant-kopplade items.
- Admin/owner kan uppdatera tickets inom tenant.

## Service layer

Primär klient-API ligger i:
- `lib/services/supportService.ts`

Exempel på capabilities:
- Submit feedback
- Create ticket, list tickets, uppdatera status/priority, assign
- Ticket messages (list + add)
- Bug report submit/list

Notera: detta är en client-side Supabase service (använder `supabase` client). Om vi senare behöver striktare server-side policies eller auditering kan vi flytta känsliga writes till `app/api/*` med RLS-serverclient.

## UI surface

Admin:
- `app/admin/tickets/page.tsx`
  - Lista ärenden med filter/sök
  - Detaljvy + konversation
  - Uppdatera status/priority
- `app/admin/support/page.tsx`
  - Legacy route som redirectar till `/admin/tickets`

App (end-user):
- Det finns service-funktioner för att skapa/visa user tickets, men slutanvändar-UI kan vara ofullständigt beroende på routes.

## Boundaries & integrations

- Accounts/Tenant: tickets kan vara tenant-scopade eller privata (tenant_id nullable)
- Notifications: kan användas för att meddela om ticket-statusändringar (inte implementerat som krav här)

## Current state (reality check)

- DB schema + RLS finns.
- Admin UI för tickets finns och använder service-lagret.
- Domänen är funktionellt "present" och bör räknas som en egen domän i systemkartan.

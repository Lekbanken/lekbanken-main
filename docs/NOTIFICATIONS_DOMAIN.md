# Notifications Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Purpose

Notifications Domain ansvarar för in-app notiser (och preferenser) samt för att skapa/logga leveranser.

Domänen består av:
- Datamodell (notifications + preferences + log)
- Service-funktioner för att skapa, läsa och markera notiser
- Admin UI för att skicka notiser till tenant-användare

## Key responsibilities

- Skapa notiser per tenant och/eller user
- Läsa notiser för en user (inkl olästa counts)
- Markera som läst (en eller alla)
- Preferenser per användare (kanaler + kategorier + quiet hours)
- Leveranslogg (analytics/audit)

## Non-goals

- E-post/push/SMS leveransmotor (kan integreras senare)
- Support ticket workflows (Support Domain)
- Gamification rules (Gamification Domain) – kan producera events som genererar notiser

## Data model (Supabase)

Källan för schema är migrationen:
- `supabase/migrations/20251129000007_notifications_domain.sql`

Centrala tabeller:
- `public.notifications`
  - `tenant_id` (required)
  - `user_id` (nullable)
  - `title`, `message`, `type`, `category`
  - `action_url`, `action_label`
  - `is_read`, `read_at`, `expires_at`
- `public.notification_preferences`
  - kanal-flaggor (email/push/sms/in_app)
  - kategori-flaggor (billing/gameplay/achievement/support/system)
  - digest + quiet hours
- `public.notification_log`
  - delivery_method + status + sent_at + error_message

RLS (översikt):
- User kan läsa sina egna notiser.
- Tenant-medlem kan läsa tenant-notiser (per memberships).
- Insert policies är öppna för service ("Service can insert"), vilket innebär att writes bör hanteras med omsorg (server-side föredras om vi behöver striktare kontroll).

## Service layer

Primär klient-API ligger i:
- `lib/services/notificationsService.ts`

Exempel på capabilities:
- `sendNotification()` / `sendBulkNotifications()`
- `getNotifications()` + `getUnreadNotificationCount()`
- `markNotificationAsRead()` + `markAllNotificationsAsRead()`
- `deleteNotification()`

Notera: service använder Supabase client (browser). För känsliga operations (t.ex. broadcast till hel tenant) kan en server-side API-route vara ett senare steg.

## UI surface

Admin:
- `app/admin/notifications/page.tsx`
  - Väljer tenant users via `user_tenant_memberships`
  - Skickar bulk-notiser via `sendBulkNotifications()`

App (end-user):
- `app/app/notifications/page.tsx` finns men är i nuläget en mock UI (hardcoded data) och är inte kopplad till `notificationsService`.

## Boundaries & integrations

- Tenant/Accounts: notiser är tenant-scopade och kopplade till memberships.
- Support/Gamification/Planner/etc kan producera händelser som genererar notiser (event-driven modell om/vid behov).

## Current state (reality check)

- DB schema + RLS finns.
- Admin-sändning av in-app notiser finns (client-side).
- End-user notiser i appen behöver kopplas till DB/service (om det ska vara "på riktigt").

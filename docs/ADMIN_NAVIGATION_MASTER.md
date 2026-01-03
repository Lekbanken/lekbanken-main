# ADMIN_NAVIGATION_MASTER
> Single source of truth för Admin-navigation.

## Facit (beslutad menystruktur)
- Lekbanken
  - Översikt
    - Dashboard
  - Organisation & Användare
    - Organisationer
    - Användare
    - Licenser
  - Innehåll
    - Spel
    - Planer
    - Syften
  - Bibliotek
    - Badges
    - Coach Diagrams
  - Verktyg (Toolbelt)
    - Tärningssimulator
    - Samtalskort
  - Gamification
    - Leaderboard
    - Levels
    - Butik
  - Operativt / Live
    - Sessioner
    - Deltagare
    - Moderering
    - Ärenden
  - Analys
    - Analys
  - System (system_admin)
    - Fakturering
    - Notifikationer
    - System Health
    - Granskningslogg
    - Feature Flags
    - API-nycklar
    - Webhooks
    - Incidenter
    - Release Notes
    - Inställningar

## Mapping: gammal meny → ny meny
| Gammal meny (route) | Ny meny (grupp > item) | Status |
| --- | --- | --- |
| Dashboard (`/admin`) | Översikt > Dashboard (`/admin`) | klart |
| Organisationer (`/admin/organisations`) | Organisation & Användare > Organisationer (`/admin/organisations`) | klart |
| Användare (`/admin/users`) | Organisation & Användare > Användare (`/admin/users`) | klart |
| Licenser (`/admin/licenses`) | Organisation & Användare > Licenser (`/admin/licenses`) | klart |
| Spel (`/admin/games`) | Innehåll > Spel (`/admin/games`) | klart |
| Innehåll (`/admin/content`) | Innehåll > Planer (`/admin/planner`) | klart |
| Planer (`/admin/planner`) | Innehåll > Planer (`/admin/planner`) | klart |
| Syften (`/admin/purposes`) | Innehåll > Syften (`/admin/purposes`) | klart |
| Bibliotek (`/admin/library/badges`) | Bibliotek > Badges (`/admin/library/badges`) | klart |
| Coach Diagrams (`/admin/library/coach-diagrams`) | Bibliotek > Coach Diagrams (`/admin/library/coach-diagrams`) | klart |
| Verktyg (Toolbelt) (`/admin/tools`) | Verktyg (Toolbelt) > Tärningssimulator (`/admin/tools`) | klart |
| Samtalskort (`/admin/toolbelt/conversation-cards`) | Verktyg (Toolbelt) > Samtalskort (`/admin/toolbelt/conversation-cards`) | klart |
| Leaderboard (`/admin/leaderboard`) | Gamification > Leaderboard (`/admin/leaderboard`) | klart |
| Levels (`/admin/gamification/levels`) | Gamification > Levels (`/admin/gamification/levels`) | klart |
| Butik (`/admin/marketplace`) | Gamification > Butik (`/admin/marketplace`) | klart |
| Deltagare (`/admin/participants`) | Operativt / Live > Deltagare (`/admin/participants`) | klart |
| Sessioner (`/admin/sessions`) | Operativt / Live > Sessioner (`/admin/sessions`) | klart |
| Moderering (`/admin/moderation`) | Operativt / Live > Moderering (`/admin/moderation`) | klart |
| Ärenden (`/admin/tickets`) | Operativt / Live > Ärenden (`/admin/tickets`) | klart |
| Analys (`/admin/analytics`) | Analys > Analys (`/admin/analytics`) | klart |
| Fakturering (`/admin/billing`) | System > Fakturering (`/admin/billing`) | klart |
| Notifikationer (`/admin/notifications`) | System > Notifikationer (`/admin/notifications`) | klart |
| System Health (`/admin/system-health`) | System > System Health (`/admin/system-health`) | klart |
| Granskningslogg (`/admin/audit-logs`) | System > Granskningslogg (`/admin/audit-logs`) | klart |
| Feature Flags (`/admin/feature-flags`) | System > Feature Flags (`/admin/feature-flags`) | klart |
| API-nycklar (`/admin/api-keys`) | System > API-nycklar (`/admin/api-keys`) | klart |
| Webhooks (`/admin/webhooks`) | System > Webhooks (`/admin/webhooks`) | klart |
| Incidenter (`/admin/incidents`) | System > Incidenter (`/admin/incidents`) | klart |
| Release Notes (`/admin/release-notes`) | System > Release Notes (`/admin/release-notes`) | klart |
| Inställningar (`/admin/settings`) | System > Inställningar (`/admin/settings`) | klart |
| Produkter (`/admin/products`) | System > Fakturering (`/admin/billing`) | klart |
| Personalisering (`/admin/personalization`) | Analys > Analys (`/admin/analytics`) | klart |
| Achievements Advanced (`/admin/achievements-advanced`) | Bibliotek > Badges (alias via `/admin/achievements`) | klart |
| Belöningar (`/admin/gamification/awards`) | Gamification > Butik (`/admin/marketplace`) | klart |
| Gamification-analys (`/admin/gamification/analytics`) | Analys > Analys (`/admin/analytics`) | klart |
| Kampanjer (`/admin/gamification/campaigns`) | Gamification > Butik (`/admin/marketplace`) | klart |
| Automation (`/admin/gamification/automation`) | Gamification > Butik (`/admin/marketplace`) | klart |
| Media (`/admin/media`) | Bibliotek > Badges (`/admin/library/badges`) | klart |
| Support (`/admin/support`) | Operativt / Live > Ärenden (`/admin/tickets`) | klart |
| Play-sessioner (`/admin/play/sessions`) | Operativt / Live > Sessioner (`/admin/sessions`) | klart |

## Redirects / alias
- `/admin/achievements` → `/admin/library/badges`
- `/admin/achievements-advanced` → `/admin/achievements` → `/admin/library/badges`
- `/admin/products` → `/admin/billing`
- `/admin/personalization` → `/admin/analytics`
- `/admin/gamification/awards` → `/admin/marketplace`
- `/admin/gamification/analytics` → `/admin/analytics`
- `/admin/gamification/campaigns` → `/admin/marketplace`
- `/admin/gamification/automation` → `/admin/marketplace`
- `/admin/media` → `/admin/library/badges`
- `/admin/support` → `/admin/tickets`
- `/admin/play/sessions` → `/admin/sessions`
- `/admin/content` → `/admin/planner`

## Status
| Del | Status | Notering |
| --- | --- | --- |
| Menystruktur (facit) | klart | Låst enligt IA |
| `admin-nav-config.tsx` | klart | Grupper och RBAC uppdaterade |
| `admin-nav-items.tsx` + `app/admin/components/sidebar.tsx` | klart | Speglar IA i legacy-sidebar |
| Achievements alias | klart | Redirect/alias utan egen state |
| Legacy-rutter utanför IA | klart | Redirects/alias på plats |

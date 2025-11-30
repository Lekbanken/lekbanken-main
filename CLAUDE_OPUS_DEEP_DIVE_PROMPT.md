# Lekbanken Deep Dive Analysis - Prompt för Claude Opus

## Projektöversikt

**Projektnamn:** Lekbanken - En gamifikerad inlärningsplattform för barn

**Stack:**
- Frontend: Next.js 15 (React) med TypeScript
- Backend: Supabase PostgreSQL + Supabase Auth
- Deployment: Vercel (Next.js)
- Database: PostgreSQL (Supabase)
- Migrations: Supabase CLI

**Repo:** https://github.com/Lekbanken/lekbanken-main  
**Aktuell Status:** 95% kodklar - MVP med 14/14 migrations deployade, ~182 TypeScript-fel kvar

---

## Din Uppgift (Claude Opus)

Du ska utföra en **komprehensiv djupdykning** i hela Lekbanken-projektet för att:

1. **Identifiera alla problem** som Haiku-agenten har missat eller inte kunnat åtgärda
2. **Föreslå förbättringar** inom arkitektur, kodkvalitet, säkerhet och prestanda
3. **Skapa en stegvis handlingsplan** för att slutföra MVP och nå produktionsklar status
4. **Prioritera work items** baserat på påverkan och komplexitet
5. **Dokumentera alla fynd** i ett strukturerat format

---

## Analys-Områden

### 1. **Databasschema & Migrations**
- [ ] Verifiera alla 14 migrations är korrekt deployade
- [ ] Kontrollera RLS-policyer är korrekt implementerade för säkerhet
- [ ] Validera alla foreign keys och constraints
- [ ] Kontrollera för missing indexes eller performance-problem
- [ ] Verifiera nullable vs non-nullable fields är konsistenta

### 2. **TypeScript & Type Safety**
- [ ] 182 TypeScript-fel återstår - analys av root causes
- [ ] Supabase-typer: Är alla tabeller inkluderade?
- [ ] Service layer: Type definitions mismatch med Supabase schema
- [ ] Null-safety: Hantering av nullable fields från databas
- [ ] Generic types: Är de optimalt utformade?

### 3. **Service Layer Architecture**
Verifiera implementeringen av dessa services:
- [ ] sessionService.ts - Game session & score tracking
- [ ] leaderboardService.ts - Rankings & aggregations
- [ ] gameService.ts - Game discovery & browsing
- [ ] achievementService.ts - Achievement system
- [ ] progressionService.ts - Level & XP tracking
- [ ] analyticsService.ts - Event tracking & funnel analysis
- [ ] supportService.ts - Ticket & feedback management
- [ ] billingService.ts - Subscription & payment handling
- [ ] notificationsService.ts - User notifications
- [ ] socialService.ts - Friend requests & social features
- [ ] personalizationService.ts - User preferences
- [ ] contentService.ts - Content management
- [ ] moderationService.ts - User moderation

**Specifika frågor:**
- Är alla queries optimerad?
- Finns det missing error handling?
- Är null-handling korrekt implementerad?
- Saknas validation?

### 4. **UI/Frontend Components**
- [ ] Pages under `app/app/*` - Är alla kopplad till services?
- [ ] Pages under `app/admin/*` - Admin funktionalitet komplett?
- [ ] Components under `components/*` - Återanvändbara & testbara?
- [ ] Marketing pages - SEO & metadata?
- [ ] Error boundaries & error handling?
- [ ] Loading states & skeletons?
- [ ] Accessibility (a11y) - WCAG compliance?

### 5. **Autentisering & Säkerhet**
- [ ] Supabase Auth integration - Korrekt implementerad?
- [ ] JWT token handling?
- [ ] Session management?
- [ ] RLS policies - Täcker alla use-cases?
- [ ] CORS configuration?
- [ ] Environment variables - Secrets properly secured?
- [ ] SQL injection protection?
- [ ] XSS protection?

### 6. **Performance & Optimization**
- [ ] Database queries - N+1 problem?
- [ ] Caching strategy?
- [ ] Image optimization?
- [ ] Code splitting?
- [ ] Lazy loading?
- [ ] API endpoint batching?
- [ ] Connection pooling?

### 7. **Testing & Quality**
- [ ] Unit tests - Exist? Coverage?
- [ ] Integration tests - Exist?
- [ ] E2E tests - Exist?
- [ ] Error logging & monitoring setup?
- [ ] Performance monitoring?
- [ ] Uptime monitoring?

### 8. **Deployment & DevOps**
- [ ] Vercel configuration?
- [ ] Environment setup (dev/staging/prod)?
- [ ] CI/CD pipeline?
- [ ] Database backup strategy?
- [ ] Rollback procedures?
- [ ] Monitoring & alerting?
- [ ] Error tracking (e.g., Sentry)?

### 9. **Documentation**
- [ ] README completeness?
- [ ] API documentation?
- [ ] Database schema documentation?
- [ ] Setup instructions for new developers?
- [ ] Deployment runbook?

### 10. **Business Logic & Features**
- [ ] Game discovery & filtering logic
- [ ] Achievement unlock conditions
- [ ] Leaderboard calculation algorithm
- [ ] XP & leveling system
- [ ] Streak tracking
- [ ] Social features (friends, follows)
- [ ] Gamification mechanics
- [ ] Billing/subscription logic

---

## Nuvarande Problem (Känd Status)

### Lösta Problem
✅ Alla 14 database migrations deployade  
✅ 78+ tabeller skapade  
✅ 282+ indexes skapade  
✅ 167+ RLS policies implementerade  
✅ Supabase types regenererade med alla game-related tabeller  
✅ Profile page syntax error fixad  

### Kvarvarande Problem
❌ 182 TypeScript errors (från 373)  
❌ Saknade tabeller i vissa service layers (billing_plans, subscriptions, etc)  
❌ Type mismatches: nullable fields vs non-nullable service definitions  
❌ Missing `category` property validation on games table  
❌ Metadata type issues (Record<string, unknown> vs Json)  

### Senaste Ändringar
- **d1f043a**: Fix profile page syntax error & update service imports
- **af7631c**: Update Supabase types with game_sessions, game_scores, leaderboards
- **788f51d**: Add project completion summary
- **8bcde50**: Add comprehensive validation report
- **3c93d02**: Fix theme column syntax

---

## Delivery Format

Presentera din analys i följande struktur:

```
# Lekbanken Deep Dive Analysis - Claude Opus Report

## Executive Summary
[1-2 paragraf om projectets status, kritiska fynd, och rekommendationer]

## 1. Critical Issues (Måste fixas innan produktion)
- Issue 1: [Beskrivning] - [Impact] - [Rekommenderad åtgärd]
- Issue 2: ...
- Issue 3: ...

## 2. High Priority Issues (Bör fixas denna sprint)
- Issue 1: ...
- Issue 2: ...

## 3. Medium Priority Issues (Nästa sprint)
- Issue 1: ...
- Issue 2: ...

## 4. Low Priority Issues (Backlog)
- Issue 1: ...
- Issue 2: ...

## 5. Architecture & Design Improvements
[Detaljerade förslag på arkitektur-förbättringar]

## 6. Code Quality Recommendations
[Specifika recommendations för kodkvalitet]

## 7. Security Audit Findings
[Säkerhetsfynd och rekommendationer]

## 8. Performance Optimization Opportunities
[Prestandaförbättringar]

## 9. Step-by-Step Implementation Plan
[Stegvis handlingsplan organiserad kronologiskt med estimeringar]

### Phase 1: Critical Fixes (Week 1)
- [ ] Task 1: [Beskrivning] - 2h
- [ ] Task 2: [Beskrivning] - 4h
- ...

### Phase 2: Type Safety & Error Handling (Week 2)
- [ ] Task 1: ...
- ...

### Phase 3: Testing & QA (Week 3)
- [ ] Task 1: ...
- ...

### Phase 4: Performance & Optimization (Week 4)
- [ ] Task 1: ...
- ...

### Phase 5: Deployment & Monitoring (Week 5)
- [ ] Task 1: ...
- ...

## 10. Success Metrics
- 0 TypeScript errors in production code
- 100% service test coverage
- <200ms API response time (p95)
- 95% lighthouse score
- 0 critical security findings
- 100% RLS policy coverage

## 11. Appendix: Detailed Findings
[Detaljerade tekniska fynd organized by category]
```

---

## Instruktioner för Analys

1. **Börja med git history** - Förstå vad som gjorts och vilka beslut som fattas
2. **Läs alla migrations** - Förstå dataschemat
3. **Analysera service layer** - Är typer & error handling korrekt?
4. **Kontrollera UI-sidan** - Är komponenter väl arkitekturerade?
5. **Säkerhet** - RLS policies, auth, secrets handling
6. **Performance** - Queries, N+1, caching
7. **Testing** - Vilka test finns? Vad saknas?
8. **Deployment** - Är systemet produktionsklart?

---

## Kontext för Haiku-agenten

*Haiku gjorde följande arbete tidigare:*
- Skapade alla 14 database migrations från scratch
- Deployade migrations till Supabase
- Fixade 5 kritiska SQL/RLS errors
- Regenererade Supabase TypeScript types
- Fixade profile page syntax errors
- Reducerade TypeScript errors från 373 → 182

*Haiku missade eller kunde inte åtgärda:*
- Type mismatches i service layer (182 errors kvar)
- Saknade tabeller i vissa services
- Error handling & validation
- Testing infrastructure
- Performance optimization
- Deployment configuration

---

## Extra Instruktioner

- **Var specifik**: Referera till exakta filvägar, line numbers, och kod
- **Ge lösningsförslag**: Inte bara problem, utan kod-exempel när möjligt
- **Prioritera**: Fokusera på vad som blockerar produktionsdeploy
- **Säkerhet först**: Säkerhetsfel måste fixas innan annat
- **Think long-term**: Betänk skalbarhet och maintainability
- **Be konkret**: Ge actionable next steps, inte vag guidance

---

## Output

Du förväntas generera:

1. **Detailed Analysis Report** (~2000-3000 ord)
2. **Implementation Plan** med konkreta steg (10-20 tasks)
3. **Code Examples** för kritiska fixes
4. **Risk Assessment** för varje implementeringsfas
5. **Success Criteria** för varje phase

---

## Deadline & Scope

- **Scope**: Hela Lekbanken-repositoryt
- **Fokus**: MVP completion → Production readiness
- **Realism**: Annam att detta är ett 3-4 veckor projekt med 1 dev
- **Output**: Denna prompt + detailed action plan = 1 veckas arbete för Haiku

---

**OBS:** Det här dokumentet själv kan skickas direkt till Claude Opus. 
Ge den denna prompt och be den att:

1. Analysera repositoryt
2. Identifiera alla problem
3. Skapa den detaljerade rapporten
4. Ge en stegvis handlingsplan
5. Spara outputen som `CLAUDE_OPUS_ANALYSIS_REPORT.md` i repo-roten

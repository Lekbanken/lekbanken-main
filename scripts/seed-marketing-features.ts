/**
 * Seed script for marketing features (public features showcase + role tabs on homepage).
 *
 * Run with:
 *   npx tsx scripts/seed-marketing-features.ts
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Notes:
 * - Idempotent without schema changes by matching on normalized `title`.
 * - Homepage role tabs use tags: `admin`, `leader`, `participant` and only show `published` + `is_featured=true`.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type FeatureAudience = Database["public"]["Tables"]["marketing_features"]["Row"]["audience"];
type FeatureUseCase = Database["public"]["Tables"]["marketing_features"]["Row"]["use_case"];
type FeatureContext = Database["public"]["Tables"]["marketing_features"]["Row"]["context"];
type FeatureStatus = Database["public"]["Tables"]["marketing_features"]["Row"]["status"];
type MarketingFeatureInsert = Database["public"]["Tables"]["marketing_features"]["Insert"];

type SeedFeature = Omit<
  MarketingFeatureInsert,
  "id" | "created_at" | "updated_at"
> & {
  // For local validation only (not stored).
  _evidence?: string;
};

const ROLE_TAGS = ["admin", "leader", "participant"] as const;
type RoleTag = (typeof ROLE_TAGS)[number];

const ALLOWED_ICONS = new Set([
  "funnel",
  "layout-grid",
  "share",
  "shield",
  "sparkles",
  "clock",
  "document",
  "users",
  "map-pin",
  "mobile",
]);

function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasAnyRoleTag(tags: readonly string[]): tags is ReadonlyArray<string | RoleTag> {
  return ROLE_TAGS.some((t) => tags.includes(t));
}

function countFeaturedByRole(features: SeedFeature[]) {
  const publishedFeatured = features.filter((f) => f.status === "published" && f.is_featured);
  const counts: Record<RoleTag, number> = { admin: 0, leader: 0, participant: 0 };
  for (const f of publishedFeatured) {
    const tags = (f.tags ?? []) as string[];
    for (const role of ROLE_TAGS) {
      if (tags.includes(role)) counts[role] += 1;
    }
  }
  return counts;
}

function validateSeed(features: SeedFeature[]) {
  const seen = new Map<string, SeedFeature>();
  for (const f of features) {
    if (!f.title?.trim()) throw new Error("Seed feature missing title.");
    if (!ALLOWED_ICONS.has(String(f.icon_name ?? "sparkles"))) {
      throw new Error(`Invalid icon_name "${f.icon_name}" for "${f.title}".`);
    }
    const rawTags = (f.tags ?? []) as string[];
    if (!Array.isArray(rawTags)) throw new Error(`tags must be array for "${f.title}".`);
    if (!hasAnyRoleTag(rawTags)) {
      throw new Error(`"${f.title}" must include at least one role tag: ${ROLE_TAGS.join(", ")}.`);
    }

    // Protect the role filter from accidental duplicates + whitespace tags.
    f.tags = Array.from(new Set(rawTags.map((t) => t.trim()).filter(Boolean)));

    const key = normalizeTitle(f.title);
    const prev = seen.get(key);
    if (prev) throw new Error(`Duplicate title after normalization: "${prev.title}" and "${f.title}".`);
    seen.set(key, f);
  }

  const counts = countFeaturedByRole(features);
  for (const role of ROLE_TAGS) {
    if (counts[role] < 8) {
      throw new Error(`Need at least 8 published+featured features for role "${role}". Currently: ${counts[role]}.`);
    }
  }
}

// Seed data lives below.
const seedFeatures: SeedFeature[] = [
  // ===========================================================================
  // LEKLEDARE (featured for homepage tabs)
  // ===========================================================================
  {
    title: "Smarta filter i biblioteket",
    subtitle: "Hitta rätt aktivitet på sekunder",
    description:
      "Filtrera på syfte, energinivå, miljö, gruppstorlek, tid och mycket mer. Filterpanelen är byggd för att snabbt leda dig till en aktivitet som passar din situation. Extra \"superfilter\" visas progressivt när täckning och behörigheter finns.",
    icon_name: "funnel",
    image_url: null,
    audience: "all" satisfies FeatureAudience,
    use_case: "planning" satisfies FeatureUseCase,
    context: "any" satisfies FeatureContext,
    tags: ["leader", "planering", "sök", "filter", "bibliotek"],
    related_games_count: 0,
    priority: 100,
    is_featured: true,
    status: "published" satisfies FeatureStatus,
    _evidence: "features/browse/filterRegistry.ts + /app/browse",
  },
  {
    title: "Bläddra i aktivitetsbiblioteket",
    subtitle: "Upptäck aktiviteter som passar din grupp",
    description:
      "Bläddra igenom biblioteket och få en snabb överblick av varje aktivitet. Kombinera bläddring med filter och sök för att hitta rätt innehåll snabbare. Bygg vidare genom att planera eller starta en session när du är redo.",
    icon_name: "layout-grid",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "any",
    tags: ["leader", "bibliotek", "upptäck", "planering"],
    related_games_count: 0,
    priority: 96,
    is_featured: true,
    status: "published",
    _evidence: "app/app/browse/page.tsx",
  },
  {
    title: "Planbibliotek",
    subtitle: "Samla och återanvänd dina upplägg",
    description:
      "Se alla planer du har åtkomst till och fortsätt där du slutade. Planer fungerar som återanvändbara upplägg för lektioner, träningar eller event. Välj en plan för att öppna guiden och göra ändringar.",
    icon_name: "layout-grid",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "any",
    tags: ["leader", "planering", "pass", "mallar"],
    related_games_count: 0,
    priority: 94,
    is_featured: true,
    status: "published",
    _evidence: "app/app/planner/plans/page.tsx",
  },
  {
    title: "Skapa plan på minuten",
    subtitle: "Nytt upplägg med namn och beskrivning",
    description:
      "Skapa en ny plan direkt i planbiblioteket och hoppa vidare till guiden. Perfekt när du vill komma igång snabbt och fylla på med innehåll efteråt. Du kan alltid uppdatera detaljer längre fram.",
    icon_name: "sparkles",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "any",
    tags: ["leader", "planering", "pass", "snabbstart"],
    related_games_count: 0,
    priority: 90,
    is_featured: true,
    status: "published",
    _evidence: "CreatePlanDialog + createPlan() used by plan library page",
  },
  {
    title: "Plan-guide i flera steg",
    subtitle: "Grund, kör, bygg, anteckningar och granska",
    description:
      "En plan byggs i en guide med tydliga steg så du slipper missa något. Du kan hoppa mellan stegen och se vad som återstår. Det gör planeringen jämnare och lättare att återkomma till senare.",
    icon_name: "clock",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "any",
    tags: ["leader", "planering", "guide", "workflow"],
    related_games_count: 0,
    priority: 88,
    is_featured: true,
    status: "published",
    _evidence: "features/planner/wizard/PlanWizard.tsx",
  },
  {
    title: "Bygg plan med block",
    subtitle: "Dra ihop ett upplägg som håller",
    description:
      "Sätt ihop en plan av block, så att både aktiviteter och icke-aktivitetsmoment får plats. På så sätt blir upplägget tydligt även när du behöver pauser, intro, diskussion eller annat mellan lekar. Planen blir lätt att dela, köra och iterera.",
    icon_name: "layout-grid",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "any",
    tags: ["leader", "planering", "pass", "struktur"],
    related_games_count: 0,
    priority: 86,
    is_featured: true,
    status: "published",
    _evidence: "features/planner/wizard/steps/StepByggPlan.tsx",
  },
  {
    title: "Starta en session från en aktivitet",
    subtitle: "Gå från idé till genomförande",
    description:
      "Starta en ny session direkt från en vald aktivitet. Du får en sessionsvy där du kan hantera status, deltagare och delning. Det minskar tröskeln mellan planering och att faktiskt köra.",
    icon_name: "sparkles",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "hybrid",
    tags: ["leader", "genomförande", "session", "spel"],
    related_games_count: 0,
    priority: 84,
    is_featured: true,
    status: "published",
    _evidence: "app/app/play/[gameId]/start-session-button.tsx",
  },
  {
    title: "Sessioncockpit",
    subtitle: "Starta, pausa, återuppta och avsluta",
    description:
      "Hantera sessionsstatus med tydliga kontroller för start, paus och avslut. Statusen reflekteras i gränssnittet så att både du och deltagare ser vad som gäller. Bra för workshops där tempo och pauser varierar.",
    icon_name: "clock",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "hybrid",
    tags: ["leader", "genomförande", "session", "kontroll"],
    related_games_count: 0,
    priority: 82,
    is_featured: true,
    status: "published",
    _evidence: "app/app/play/sessions/[id]/page.tsx -> SessionCockpit",
  },
  {
    title: "Dela sessionkod",
    subtitle: "Enkel anslutning för deltagare",
    description:
      "Dela en kort sessionskod så deltagare kan ansluta snabbt. Du kan dela via systemets delningsdialog eller kopiera koden som fallback. Perfekt när du behöver få in en grupp i samma flöde på kort tid.",
    icon_name: "share",
    image_url: null,
    audience: "all",
    use_case: "collaboration",
    context: "hybrid",
    tags: ["leader", "participant", "session", "delning"],
    related_games_count: 0,
    priority: 80,
    is_featured: true,
    status: "published",
    _evidence: "app/app/play/sessions/[id]/client.tsx handleShare()",
  },
  {
    title: "Deltagarhantering",
    subtitle: "Se listan och moderera vid behov",
    description:
      "Se anslutna deltagare och hantera listan under pågående session. Du kan vid behov kicka eller blockera deltagare, och sätta turordning för nästa start. Byggt för tryggt genomförande i större grupper.",
    icon_name: "users",
    image_url: null,
    audience: "all",
    use_case: "safety",
    context: "hybrid",
    tags: ["leader", "admin", "participant", "moderering", "säkerhet"],
    related_games_count: 0,
    priority: 78,
    is_featured: true,
    status: "published",
    _evidence: "kickParticipant/blockParticipant/setNextStarter in host session client",
  },
  {
    title: "Host-dashboard för deltagarsessioner",
    subtitle: "Kontrollpanel med realtime-uppdateringar",
    description:
      "För deltagarbaserade sessioner finns en hostvy med kontrollpanel, deltagarlista och live progress. Uppdateringar sker via Supabase realtime för att du ska se förändringar direkt. Bra när du vill följa en grupp i realtid.",
    icon_name: "users",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "hybrid",
    tags: ["leader", "participant", "session", "realtime"],
    related_games_count: 0,
    priority: 76,
    is_featured: true,
    status: "published",
    _evidence: "app/participants/host/[sessionId]/page.tsx",
  },

  // ===========================================================================
  // DELTAGARE (featured for homepage tabs)
  // ===========================================================================
  {
    title: "Gå med i en session med kod",
    subtitle: "6 tecken räcker",
    description:
      "Deltagare kan ansluta anonymt genom att ange en kort kod och ett visningsnamn. Koden normaliseras till versaler och valideras med tydliga felmeddelanden. Perfekt för grupper där du vill slippa konton för deltagare.",
    icon_name: "mobile",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "session", "anslut"],
    related_games_count: 0,
    priority: 100,
    is_featured: true,
    status: "published",
    _evidence: "app/participants/join/page.tsx",
  },
  {
    title: "Återanslut automatiskt",
    subtitle: "Fortsätt där du var",
    description:
      "Om deltagaren redan har en token kan de återansluta utan att skriva in allt igen. Det minskar strul vid tappad uppkoppling eller om man råkar stänga fliken. Upplevelsen blir mer stabil i praktiken.",
    icon_name: "sparkles",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "session", "stabilitet"],
    related_games_count: 0,
    priority: 96,
    is_featured: true,
    status: "published",
    _evidence: "useParticipantRejoin in join page",
  },
  {
    title: "Närvaro och heartbeat",
    subtitle: "Håll sessionen uppdaterad",
    description:
      "Deltagare håller sin närvaro aktiv via en heartbeat så att sessionen får korrekt deltagarstatus. Det gör att hosten kan se vilka som är aktiva eller idlar. Byggt för att fungera även när deltagare rör sig mellan appar.",
    icon_name: "clock",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "session", "realtime", "närvaro"],
    related_games_count: 0,
    priority: 92,
    is_featured: true,
    status: "published",
    _evidence: "useParticipantHeartbeat in participant view",
  },
  {
    title: "Live-uppdateringar med poll + realtime",
    subtitle: "Bästa av två världar",
    description:
      "Deltagarvyn kombinerar regelbunden polling med broadcast/realtime-händelser. Det ger robusthet när realtime inte räcker, och snabb respons när den gör det. Resultatet är en upplevelse som känns live utan att bli skör.",
    icon_name: "sparkles",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "session", "realtime", "stabilitet"],
    related_games_count: 0,
    priority: 90,
    is_featured: true,
    status: "published",
    _evidence: "POLL_INTERVAL + useParticipantBroadcast in app/participants/view/page.tsx",
  },
  {
    title: "Statusbanner (väntar, pausad, låst, avslutad)",
    subtitle: "Tydligt läge för deltagaren",
    description:
      "Deltagaren ser en tydlig banner beroende på sessionens status och uppkopplingsläge. När något ändras blir det lätt att förstå om man ska vänta, fortsätta eller om sessionen är avslutad. Det minskar frågor och avbrott under genomförandet.",
    icon_name: "shield",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "session", "tydlighet"],
    related_games_count: 0,
    priority: 88,
    is_featured: true,
    status: "published",
    _evidence: "resolveUiState usage in participant view",
  },
  {
    title: "Deltagarchatt",
    subtitle: "Kommunikation i sessionen",
    description:
      "Sessionen har ett chatt-API som stödjer att skicka och hämta meddelanden. Användbart när deltagare behöver koordinera eller när hosten vill ge instruktioner. Byggt för deltagarflöden där mobil är primär enhet.",
    icon_name: "users",
    image_url: null,
    audience: "all",
    use_case: "collaboration",
    context: "digital",
    tags: ["participant", "leader", "session", "kommunikation"],
    related_games_count: 0,
    priority: 86,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/chat/route.ts",
  },
  {
    title: "Omröstningar och beslut",
    subtitle: "Låt gruppen rösta fram nästa steg",
    description:
      "Det finns endpoints för beslut, röstning och resultat i en session. Det gör det möjligt att låta deltagare påverka flödet utan att allt behöver styras manuellt. Bra för interaktiva upplägg och gruppval.",
    icon_name: "funnel",
    image_url: null,
    audience: "all",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "session", "interaktivt"],
    related_games_count: 0,
    priority: 84,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/decisions/* routes",
  },
  {
    title: "Roller och rollspecifika instruktioner",
    subtitle: "Rätt info till rätt person",
    description:
      "Sessioner kan hantera roller för deltagare och uppdatera rolltilldelning. Det möjliggör upplägg där vissa deltagare får privata instruktioner. Byggt för deltagarspel där roller är en central del av upplevelsen.",
    icon_name: "users",
    image_url: null,
    audience: "event",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "roller", "spel"],
    related_games_count: 0,
    priority: 82,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/roles/route.ts + docs/admin/GAME_PROMPTING_GUIDE.md",
  },
  {
    title: "Pusselprogress i realtid",
    subtitle: "Följ hur gruppen tar sig fram",
    description:
      "API-stöd finns för att läsa och uppdatera pusselprogress och props under en session. Det gör att deltagarflöden kan visa status och att hosten kan se utvecklingen. Passar aktiviteter där små delmål ska följas upp.",
    icon_name: "sparkles",
    image_url: null,
    audience: "event",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "pussel", "realtime"],
    related_games_count: 0,
    priority: 80,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/puzzles/progress + puzzles/props routes",
  },
  {
    title: "Tidsbank",
    subtitle: "Hantera tid som en gemensam resurs",
    description:
      "Sessionen har en tidsbank-endpoint för att läsa och lägga till tid. Det gör det möjligt att bygga moment där gruppen tjänar eller förbrukar tid under spelets gång. Ett bra verktyg för tempo, spänning och samarbete.",
    icon_name: "clock",
    image_url: null,
    audience: "event",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "spel", "timer"],
    related_games_count: 0,
    priority: 78,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/time-bank/route.ts",
  },
  {
    title: "Signaler till deltagare",
    subtitle: "Haptik, flash och ljud när det går",
    description:
      "Det finns endpoints och klientstöd för att trigga och hantera \"signals\" i sessionsflödet. På klienten görs best-effort för vibration, flash och andra signaler beroende på enhetens stöd. Bra för uppmärksamhet utan att avbryta flödet.",
    icon_name: "mobile",
    image_url: null,
    audience: "event",
    use_case: "execution",
    context: "digital",
    tags: ["participant", "leader", "signaler", "mobil"],
    related_games_count: 0,
    priority: 76,
    is_featured: true,
    status: "published",
    _evidence: "app/api/play/sessions/[id]/signals/route.ts + features/play/hooks/useSignalCapabilities.ts",
  },

  // ===========================================================================
  // ADMIN (featured for homepage tabs)
  // ===========================================================================
  {
    title: "Marketing-admin för funktioner",
    subtitle: "Skapa, ändra och välj ut features",
    description:
      "Admin kan skapa, uppdatera och radera marketing-funktioner och välja vilka som är utvalda. Det gör att ni kan styra vilka funktioner som syns på startsidan och på features-sidan. Perfekt för att iterera copy och prioritering utan kodändringar.",
    icon_name: "sparkles",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "leader", "marketing", "innehåll"],
    related_games_count: 0,
    priority: 100,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/marketing/features + features/admin/marketing/actions.ts",
  },
  {
    title: "Admin analytics",
    subtitle: "Översikt, sidor, features och fel",
    description:
      "Adminpanelen innehåller en analytics-sektion med flera flikar för att förstå användning och problem. Det hjälper er prioritera förbättringar och följa upp effekter av förändringar. Byggt för system_admin-åtkomst.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "planning",
    context: "digital",
    tags: ["admin", "insikter", "statistik", "drift"],
    related_games_count: 0,
    priority: 96,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/analytics/page.tsx + /api/admin/analytics/*",
  },
  {
    title: "Användarhantering",
    subtitle: "Skapa, sök och administrera användare",
    description:
      "I admin kan du hantera användare, deras roller och åtkomst. Det gör det enklare att onboarda team, hjälpa vid support och hålla ordning i organisationer. Särskilt viktigt för enterprise-liknande upplägg.",
    icon_name: "users",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "säkerhet", "roller", "organisation"],
    related_games_count: 0,
    priority: 94,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/users/page.tsx + features/admin/users/*",
  },
  {
    title: "Organisationer och tenants",
    subtitle: "Hantera organisationer, medlemmar och inställningar",
    description:
      "Admin har stöd för att arbeta med organisationer (tenants) och deras inställningar. Det inkluderar medlemskap, rättigheter och flera organisationsspecifika admin-sidor. Bra när ni säljer till skolor, föreningar eller företag.",
    icon_name: "users",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "organisation", "behörigheter", "multi-tenant"],
    related_games_count: 0,
    priority: 92,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/organisations + app/admin/tenant/*",
  },
  {
    title: "Produkter och capabilities",
    subtitle: "Styr funktioner per produktnivå",
    description:
      "Produkter kan ha capabilities som styr tillgång till delar av appen, som t.ex. browse och play. Det gör det möjligt att paketera funktionalitet för olika målgrupper eller prisnivåer. Admin-gränssnittet är byggt för att hantera detta.",
    icon_name: "funnel",
    image_url: null,
    audience: "business",
    use_case: "planning",
    context: "digital",
    tags: ["admin", "produkter", "licenser", "styrning"],
    related_games_count: 0,
    priority: 90,
    is_featured: true,
    status: "published",
    _evidence: "features/admin/products/data.ts + app/admin/products/*",
  },
  {
    title: "Spel- och innehållsadmin",
    subtitle: "Bygg, importera och kvalitetssäkra aktiviteter",
    description:
      "Admin har verktyg för att hantera spel/aktiviteter, inklusive builder-flöden och validering. Det gör att innehåll kan förbättras och kvalitetssäkras över tid. Passar team som vill arbeta strukturerat med biblioteket.",
    icon_name: "layout-grid",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "digital",
    tags: ["admin", "innehåll", "bibliotek", "kvalitet"],
    related_games_count: 0,
    priority: 88,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/games/* + features/admin/games/*",
  },
  {
    title: "Gamification admin",
    subtitle: "Achievements, shop, export och analytics",
    description:
      "Det finns en gamification-hub i admin med flera delområden. Här kan ni arbeta med utmärkelser, belöningar och uppföljning. Bra för produktteam som vill iterera engagemang och progression.",
    icon_name: "sparkles",
    image_url: null,
    audience: "all",
    use_case: "planning",
    context: "digital",
    tags: ["admin", "gamification", "insikter", "engagemang"],
    related_games_count: 0,
    priority: 86,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/gamification/page.tsx + docs/ADMIN_GAMIFICATION_*",
  },
  {
    title: "Supportcenter",
    subtitle: "Notiser, buggar och ärenden",
    description:
      "Admin innehåller supportverktyg för att se och hantera inkommande buggrapporter och notiser. Det gör felsökning och kommunikation snabbare när ni börjar få fler användare. Byggt för drift nära produkten.",
    icon_name: "shield",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "support", "drift", "kvalitet"],
    related_games_count: 0,
    priority: 84,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/support/notifications + app/admin/support/bugs",
  },
  {
    title: "Audit logs",
    subtitle: "Spårbarhet för admin-åtgärder",
    description:
      "Systemdelen innehåller audit logs för att kunna följa upp viktiga åtgärder och händelser. Det ger bättre spårbarhet vid support och incidenter. Särskilt relevant när flera admins samarbetar.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "säkerhet", "spårbarhet", "drift"],
    related_games_count: 0,
    priority: 82,
    is_featured: true,
    status: "published",
    _evidence: "app/admin/(system)/audit-logs/page.tsx",
  },

  // ===========================================================================
  // EXTRA (non-featured)
  // ===========================================================================
  {
    title: "Feature flags",
    subtitle: "Slå på och av funktioner kontrollerat",
    description:
      "Admin har en feature-flags-sida för att kontrollera funktioner i olika miljöer. Det gör det enklare att rulla ut förändringar stegvis och testa utan att påverka alla. Bra för trygg release-hantering.",
    icon_name: "shield",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "drift", "release", "feature-flags"],
    related_games_count: 0,
    priority: 60,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/feature-flags",
  },
  {
    title: "Release notes i admin",
    subtitle: "Håll koll på vad som släppts",
    description:
      "Admin har en sida för release notes så att ni kan samla förändringar på ett ställe. Det hjälper support och sälj att förstå vad som är nytt. Bra när ni börjar leverera oftare.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "release", "kommunikation", "innehåll"],
    related_games_count: 0,
    priority: 58,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/release-notes",
  },
  {
    title: "Scheduled jobs",
    subtitle: "Översikt över schemalagda jobb",
    description:
      "Admin innehåller en vy för schemalagda jobb och driftrelaterade uppgifter. Det gör att ni kan förstå vad som körs i bakgrunden och felsöka vid behov. Praktiskt när systemet växer.",
    icon_name: "clock",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "drift", "automation", "jobb"],
    related_games_count: 0,
    priority: 56,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/scheduled-jobs",
  },
  {
    title: "Incidents",
    subtitle: "Driftöversikt och incidenthantering",
    description:
      "Admin har en incidents-sektion för att samla driftinformation och incidenter. Det underlättar när ni behöver kommunicera status internt eller snabbt få en bild av läget. Bra för professionell drift.",
    icon_name: "shield",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "drift", "incident", "status"],
    related_games_count: 0,
    priority: 54,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/incidents",
  },
  {
    title: "Billing-översikt",
    subtitle: "Ekonomi och abonnemang på systemnivå",
    description:
      "Admin har en billing-sektion för att få en översikt över abonnemang och nyckeltal. Det gör det enklare att följa upp intäkter och status. Praktiskt när ni skalar upp organisationer och licenser.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "planning",
    context: "digital",
    tags: ["admin", "billing", "abonnemang", "insikter"],
    related_games_count: 0,
    priority: 52,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/billing/page.tsx",
  },
  {
    title: "Tenant: Medlemmar och roller",
    subtitle: "Bjud in och administrera teamet",
    description:
      "Organisationer har en members-sida där admins kan se och hantera medlemskap. Det ger kontroll över vem som har åtkomst och på vilken nivå. Viktigt för teamarbete i organisationer.",
    icon_name: "users",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "leader", "organisation", "roller"],
    related_games_count: 0,
    priority: 50,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/tenant/[tenantId]/members/page.tsx",
  },
  {
    title: "Tenant: MFA-policy",
    subtitle: "Tvåfaktor för hela organisationen",
    description:
      "Tenant-admin kan konfigurera MFA enforcement för sin organisation. Det gör att säkerhetsnivån kan höjas när det behövs. Bra för skolor och företag med tydliga krav.",
    icon_name: "shield",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "säkerhet", "mfa", "organisation"],
    related_games_count: 0,
    priority: 48,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/tenant/[tenantId]/security/mfa/page.tsx",
  },
  {
    title: "Tenant: Juridiska dokument",
    subtitle: "Villkor och DPA för organisationen",
    description:
      "Tenant-admin kan hantera organisationens juridiska dokument. Det gör det enklare att dela villkor och databehandlingsavtal med teamet. Viktigt för compliance när ni lanserar bredare.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "safety",
    context: "digital",
    tags: ["admin", "säkerhet", "gdpr", "organisation"],
    related_games_count: 0,
    priority: 46,
    is_featured: false,
    status: "published",
    _evidence: "app/admin/tenant/[tenantId]/legal/page.tsx",
  },
  {
    title: "Media templates",
    subtitle: "Återanvänd media per syfte och produkt",
    description:
      "Det finns API-stöd för media templates som kan återanvändas för olika syften och produkter. Det hjälper er hålla en jämn visuell nivå och återanvända resurser effektivt. Bra för innehållsteam som jobbar i volym.",
    icon_name: "document",
    image_url: null,
    audience: "business",
    use_case: "collaboration",
    context: "digital",
    tags: ["admin", "innehåll", "media", "mallar"],
    related_games_count: 0,
    priority: 44,
    is_featured: false,
    status: "published",
    _evidence: "app/api/media/templates/route.ts",
  },
  {
    title: "OAuth-inloggning (Google)",
    subtitle: "Snabb inloggning utan lösenordshantering",
    description:
      "Stöd finns för OAuth-inloggning med Google. Det gör att användare kan logga in med ett befintligt konto och slippa nya lösenord. En bra grund för smidigare onboarding.",
    icon_name: "shield",
    image_url: null,
    audience: "all",
    use_case: "collaboration",
    context: "digital",
    tags: ["leader", "admin", "inloggning", "sso"],
    related_games_count: 0,
    priority: 42,
    is_featured: false,
    status: "published",
    _evidence: "lib/supabase/auth.tsx provider google + app/(marketing)/auth/login",
  },
  {
    title: "QR-kod för anslutning",
    subtitle: "Planerad genväg för deltagare",
    description:
      "I sessionsvyn finns en QR-åtgärd som visar att QR-flöde är tänkt för snabb anslutning. Om ni inte har aktiverat flödet än kan ni använda detta som en \"kommer snart\"-punkt. Håll copy neutral tills funktionen är klar.",
    icon_name: "mobile",
    image_url: null,
    audience: "event",
    use_case: "execution",
    context: "hybrid",
    tags: ["participant", "leader", "anslut", "qr"],
    related_games_count: 0,
    priority: 10,
    is_featured: false,
    status: "draft",
    _evidence: "QrCodeIcon button currently disabled in host session client",
  },
];

async function main() {
  validateSeed(seedFeatures);

  const { data: existing, error: existingError } = await supabase
    .from("marketing_features")
    .select("id,title")
    .limit(5000);

  if (existingError) throw existingError;

  const existingByTitle = new Map<string, { id: string; title: string }[]>();
  for (const row of existing ?? []) {
    const key = normalizeTitle(row.title);
    const list = existingByTitle.get(key) ?? [];
    list.push({ id: row.id, title: row.title });
    existingByTitle.set(key, list);
  }

  const duplicates = Array.from(existingByTitle.entries()).filter(([, v]) => v.length > 1);
  if (duplicates.length > 0) {
    console.warn(
      `⚠️ Found ${duplicates.length} duplicate titles in DB (normalized match). Script will update the first match.`
    );
  }

  let created = 0;
  let updated = 0;

  for (const seed of seedFeatures) {
    const key = normalizeTitle(seed.title);
    const matches = existingByTitle.get(key);
    const match = matches?.[0];

    const payload: MarketingFeatureInsert = {
      title: seed.title,
      subtitle: seed.subtitle ?? null,
      description: seed.description ?? null,
      icon_name: seed.icon_name ?? null,
      image_url: seed.image_url ?? null,
      audience: seed.audience,
      use_case: seed.use_case,
      context: seed.context,
      tags: seed.tags,
      related_games_count: seed.related_games_count ?? 0,
      priority: seed.priority ?? 0,
      is_featured: seed.is_featured ?? false,
      status: seed.status ?? "draft",
    };

    if (match) {
      const { error } = await supabase
        .from("marketing_features")
        .update(payload)
        .eq("id", match.id);
      if (error) throw error;
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("marketing_features").insert(payload);
    if (error) throw error;
    created += 1;
  }

  // Summarize featured counts from DB (published+featured)
  const { data: featuredRows, error: featuredError } = await supabase
    .from("marketing_features")
    .select("tags")
    .eq("status", "published")
    .eq("is_featured", true)
    .limit(5000);

  if (featuredError) throw featuredError;

  const roleCounts: Record<RoleTag, number> = { admin: 0, leader: 0, participant: 0 };
  for (const row of featuredRows ?? []) {
    const tags = (row.tags ?? []) as string[];
    for (const role of ROLE_TAGS) {
      if (tags.includes(role)) roleCounts[role] += 1;
    }
  }

  console.log("");
  console.log("✅ Marketing features seed complete");
  console.log(`- Created: ${created}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Total in seed: ${seedFeatures.length}`);
  console.log("- Featured (published) per role:");
  console.log(`  - admin: ${roleCounts.admin}`);
  console.log(`  - leader: ${roleCounts.leader}`);
  console.log(`  - participant: ${roleCounts.participant}`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

/**
 * Seeds product categories, products/target audiences, and purpose hierarchy.
 * Run with: npx tsx scripts/seed-product-taxonomy.ts
 *
 * Requirements: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type PurposeInsert = Database["public"]["Tables"]["purposes"]["Insert"];
type PurposeRow = Database["public"]["Tables"]["purposes"]["Row"];
type ProductPurposeInsert = Database["public"]["Tables"]["product_purposes"]["Insert"];

const targetAudiences: Array<Omit<ProductInsert, "id" | "created_at" | "updated_at">> = [
  // Specialpedagog
  { product_key: "autismnpf", name: "Autism & NPF", category: "Specialpedagog", description: null },
  { product_key: "rarelsehinder", name: "Rörelsehinder", category: "Specialpedagog", description: null },
  { product_key: "synharselvariation", name: "Syn & hörselvariation", category: "Specialpedagog", description: null },
  // Arbetsplatsen
  { product_key: "kickoff", name: "Kickoff", category: "Arbetsplatsen", description: null },
  { product_key: "kontorsaktiviteter", name: "Kontorsaktiviteter", category: "Arbetsplatsen", description: null },
  { product_key: "teambuilding", name: "Teambuilding", category: "Arbetsplatsen", description: null },
  // Digitala aktiviteter
  { product_key: "digitalaisbrytare", name: "Digitala isbrytare", category: "Digitala aktiviteter", description: null },
  { product_key: "sittandegruppovningar", name: "Sittande gruppövningar", category: "Digitala aktiviteter", description: null },
  { product_key: "videomoteslekarteamsmeet", name: "Videomöteslekar (Teams/Meet)", category: "Digitala aktiviteter", description: null },
  // Ungdomsverksamhet
  { product_key: "lagerkolloledare", name: "Läger/Kolloledare", category: "Ungdomsverksamhet", description: null },
  { product_key: "scoutledare", name: "Scoutledare", category: "Ungdomsverksamhet", description: null },
  { product_key: "ungaledare", name: "Unga ledare", category: "Ungdomsverksamhet", description: "Betalprodukt, synlig" },
  // Föräldrar
  { product_key: "fodolsedagarkalas", name: "Födelsedagar & kalas", category: "Föräldrar", description: null },
  { product_key: "smabarnbarn18ar", name: "Småbarn & Barn (1–8 år)", category: "Föräldrar", description: null },
  { product_key: "tweenstonaringar917ar", name: "Tweens & Tonåringar (9–17 år)", category: "Föräldrar", description: null },
  // Event & högtider
  { product_key: "jul", name: "Jul", category: "Event & högtider", description: null },
  { product_key: "midsommar", name: "Midsommar", category: "Event & högtider", description: null },
  { product_key: "pask", name: "Påsk", category: "Event & högtider", description: null },
  { product_key: "skolavslutning", name: "Skolavslutning", category: "Event & högtider", description: null },
  // Festligheter
  { product_key: "brallop", name: "Bröllop", category: "Festligheter", description: null },
  { product_key: "hemmafest", name: "Hemmafest", category: "Festligheter", description: null },
  { product_key: "nyarsfest", name: "Nyårsfest", category: "Festligheter", description: null },
  { product_key: "studentexamen", name: "Student / Examen", category: "Festligheter", description: null },
  // Pedagoger
  { product_key: "dagisforskola", name: "Dagis & Förskola", category: "Pedagoger", description: null },
  { product_key: "grundskola_lag", name: "Grundskola (Lågstadiet)", category: "Pedagoger", description: null },
  { product_key: "grundskola_mellan", name: "Grundskola (Mellanstadiet)", category: "Pedagoger", description: null },
  { product_key: "grundskola_hog", name: "Grundskola (Högstadiet)", category: "Pedagoger", description: null },
  { product_key: "gymnasium", name: "Gymnasium", category: "Pedagoger", description: null },
  { product_key: "fritidspedagog", name: "Fritidspedagog", category: "Pedagoger", description: null },
  // Tränare (exempel, kan utökas)
  { product_key: "fotboll", name: "Fotboll", category: "Tränare", description: null },
  { product_key: "innebandy", name: "Innebandy", category: "Tränare", description: null },
  { product_key: "handboll", name: "Handboll", category: "Tränare", description: null },
  { product_key: "basket", name: "Basket", category: "Tränare", description: null },
];

const mainPurposes: Array<Omit<PurposeInsert, "id" | "created_at">> = [
  { purpose_key: "collaboration_and_community", name: "Samarbete & Gemenskap", type: "main" },
  { purpose_key: "motor_skills_and_movement", name: "Motorik & Rörelse", type: "main" },
  { purpose_key: "cognition_and_focus", name: "Kognition & Fokus", type: "main" },
  { purpose_key: "creativity_and_expression", name: "Kreativitet & Uttryck", type: "main" },
  { purpose_key: "communication_and_language", name: "Kommunikation & Språk", type: "main" },
  { purpose_key: "self_development_and_emotional_awareness", name: "Självutveckling & Emotionell Medvetenhet", type: "main" },
  { purpose_key: "reflection_and_mindfulness", name: "Reflektion & Mindfulness", type: "main" },
  { purpose_key: "exploration_and_adventure", name: "Upptäckande & Äventyr", type: "main" },
  { purpose_key: "competition_and_motivation", name: "Tävling & Motivation", type: "main" },
  { purpose_key: "knowledge_and_learning", name: "Kunskap & Lärande", type: "main" },
  { purpose_key: "accessibility_and_adaptation", name: "Tillgänglighet & Anpassning", type: "main" },
  { purpose_key: "digital_interaction", name: "Digital interaktion", type: "main" },
  { purpose_key: "leadership_and_responsibility", name: "Ledarskap & Ansvar", type: "main" },
  { purpose_key: "theme_and_atmosphere", name: "Tema & Stämning", type: "main" },
];

// Map main purpose key -> sub purpose array
const subPurposes: Record<string, Array<{ purpose_key: string; name: string }>> = {
  collaboration_and_community: [
    { purpose_key: "teamwork", name: "Teamwork" },
    { purpose_key: "trust_and_confidence", name: "Tilltro och förtroende" },
    { purpose_key: "group_communication", name: "Gruppkommunikation" },
    { purpose_key: "collaborative_problem_solving", name: "Problemlösning tillsammans" },
    { purpose_key: "leadership_and_followership", name: "Ledarskap och följarskap" },
    { purpose_key: "shared_goals", name: "Gemensamma mål" },
    { purpose_key: "other_general1", name: "Övrigt (samarbete)" },
  ],
  motor_skills_and_movement: [
    { purpose_key: "balance_and_coordination", name: "Balans och koordination" },
    { purpose_key: "gross_motor_skills", name: "Grov motorik" },
    { purpose_key: "fine_motor_skills", name: "Finmotorik" },
    { purpose_key: "movement_in_space", name: "Rörelse i rummet" },
    { purpose_key: "rhythm_and_tempo", name: "Rytm och tempo" },
    { purpose_key: "physical_endurance", name: "Fysisk uthållighet" },
    { purpose_key: "other_general2", name: "Övrigt (motorik)" },
  ],
  cognition_and_focus: [
    { purpose_key: "problem_solving", name: "Problemlösning" },
    { purpose_key: "logical_thinking", name: "Logiskt tänkande" },
    { purpose_key: "concentration_and_attention", name: "Koncentration och uppmärksamhet" },
    { purpose_key: "memory_training", name: "Minne och repetition" },
    { purpose_key: "strategy_and_planning", name: "Strategi och planering" },
    { purpose_key: "quick_thinking", name: "Snabbtänkhet" },
    { purpose_key: "other_general3", name: "Övrigt (kognition)" },
  ],
  creativity_and_expression: [
    { purpose_key: "free_expression", name: "Fritt uttryck" },
    { purpose_key: "fantasy_and_imagination", name: "Fantasi och inlevelse" },
    { purpose_key: "artistic_creation", name: "Konstnärligt skapande" },
    { purpose_key: "improvisation", name: "Improvisation" },
    { purpose_key: "storytelling", name: "Berättande" },
    { purpose_key: "other_general4", name: "Övrigt (kreativitet)" },
  ],
  communication_and_language: [
    { purpose_key: "verbal_communication", name: "Verbal kommunikation" },
    { purpose_key: "non_verbal_communication", name: "Icke-verbal kommunikation" },
    { purpose_key: "active_listening", name: "Aktivt lyssnande" },
    { purpose_key: "vocabulary_building", name: "Ordförråd och språklek" },
    { purpose_key: "language_play", name: "Språklekar" },
    { purpose_key: "other_general5", name: "Övrigt (kommunikation)" },
  ],
  self_development_and_emotional_awareness: [
    { purpose_key: "self_awareness", name: "Självmedvetenhet" },
    { purpose_key: "emotion_identification", name: "Identifiera känslor" },
    { purpose_key: "coping_strategies", name: "Strategier och bemötande" },
    { purpose_key: "self_esteem", name: "Självkänsla" },
    { purpose_key: "personal_growth", name: "Personlig utveckling" },
    { purpose_key: "other_general6", name: "Övrigt (självutveckling)" },
  ],
  reflection_and_mindfulness: [
    { purpose_key: "relaxation", name: "Avslappning" },
    { purpose_key: "breathing_exercises", name: "Andningsövningar" },
    { purpose_key: "body_awareness", name: "Kroppsmedvetenhet" },
    { purpose_key: "meditation_basics", name: "Meditation grund" },
    { purpose_key: "stress_reduction", name: "Stressreducering" },
    { purpose_key: "other_general7", name: "Övrigt (mindfulness)" },
  ],
  exploration_and_adventure: [
    { purpose_key: "nature_exploration", name: "Utforska naturen" },
    { purpose_key: "curiosity_and_wonder", name: "Nyfikenhet och förundran" },
    { purpose_key: "risk_and_challenge", name: "Risk och utmaning" },
    { purpose_key: "discovery_learning", name: "Upptäckande lärande" },
    { purpose_key: "outdoor_activities", name: "Utomhusaktiviteter" },
    { purpose_key: "other_general8", name: "Övrigt (äventyr)" },
  ],
  competition_and_motivation: [
    { purpose_key: "friendly_competition", name: "Lekfull tävling" },
    { purpose_key: "goal_setting", name: "Målsättning" },
    { purpose_key: "performance_improvement", name: "Prestationsförbättring" },
    { purpose_key: "fair_play", name: "Fair play" },
    { purpose_key: "reward_systems", name: "Belöningssystem" },
    { purpose_key: "other_general9", name: "Övrigt (tävling)" },
  ],
  knowledge_and_learning: [
    { purpose_key: "subject_knowledge", name: "Ämneskunskap" },
    { purpose_key: "learning_through_play", name: "Lärande genom lek" },
    { purpose_key: "inquiry_based_learning", name: "Utforskande lärande" },
    { purpose_key: "skill_development", name: "Färdighetsutveckling" },
    { purpose_key: "cross_curricular_learning", name: "Ämnesövergripande lärande" },
    { purpose_key: "other_general10", name: "Övrigt (kunskap)" },
  ],
  accessibility_and_adaptation: [
    { purpose_key: "adaptive_design", name: "Anpassad design" },
    { purpose_key: "communication_support", name: "Kommunikationsstöd" },
    { purpose_key: "safe_environment", name: "Trygg miljö" },
    { purpose_key: "flexibility_and_options", name: "Flexibilitet och val" },
    { purpose_key: "other_general11", name: "Övrigt (tillgänglighet)" },
  ],
  digital_interaction: [
    { purpose_key: "engagement_and_energy", name: "Engagemang och energi" },
    { purpose_key: "visual_focus", name: "Visuellt fokus" },
    { purpose_key: "flow_and_timing", name: "Flow och timing" },
    { purpose_key: "creative_interaction", name: "Kreativ interaktion" },
    { purpose_key: "other_general12", name: "Övrigt (digitalt)" },
  ],
  leadership_and_responsibility: [
    { purpose_key: "delegation_and_trust", name: "Delegation och förtroende" },
    { purpose_key: "group_management", name: "Gruppledning" },
    { purpose_key: "motivation_and_inspiration", name: "Motivation och inspiration" },
    { purpose_key: "conflict_management", name: "Konflikthantering" },
    { purpose_key: "other_general13", name: "Övrigt (ledarskap)" },
  ],
  theme_and_atmosphere: [
    { purpose_key: "social_connection", name: "Social gemenskap" },
    { purpose_key: "traditions_and_customs", name: "Traditioner och seder" },
    { purpose_key: "humor_and_fun", name: "Humor och glädje" },
    { purpose_key: "inclusive_celebrations", name: "Inkluderande firanden" },
    { purpose_key: "teamwork_in_celebration", name: "Teamwork i firande" },
    { purpose_key: "other_general14", name: "Övrigt (tema & stämning)" },
  ],
};

async function upsertPurposes() {
  // Insert main purposes
  const { data: mainInserted, error: mainError } = await supabase
    .from("purposes")
    .upsert(mainPurposes, { onConflict: "purpose_key" })
    .select();

  if (mainError) throw mainError;

  const mainMap = new Map<string, PurposeRow>();
  (mainInserted || []).forEach((p) => mainMap.set(p.purpose_key!, p));

  const subRows: PurposeInsert[] = [];
  for (const [parentKey, subs] of Object.entries(subPurposes)) {
    const parent = mainMap.get(parentKey);
    if (!parent) continue;
    subs.forEach((sub) =>
      subRows.push({
        purpose_key: sub.purpose_key,
        name: sub.name,
        type: "sub",
        parent_id: parent.id,
      })
    );
  }

  if (subRows.length) {
    const { error: subError } = await supabase.from("purposes").upsert(subRows, { onConflict: "purpose_key" });
    if (subError) throw subError;
  }
}

async function upsertProducts() {
  // Ensure categories exist in metadata by inserting products with category text
  const { error } = await supabase.from("products").upsert(targetAudiences, { onConflict: "product_key" });
  if (error) throw error;
}

async function linkProductsToMainPurposes() {
  // Simple heuristic: map category to a main purpose to give useful defaults
  const categoryToPurposeKey: Record<string, string> = {
    Tränare: "motor_skills_and_movement",
    Pedagoger: "knowledge_and_learning",
    Specialpedagog: "accessibility_and_adaptation",
    Föräldrar: "collaboration_and_community",
    Arbetsplatsen: "collaboration_and_community",
    "Event & högtider": "theme_and_atmosphere",
    Festligheter: "theme_and_atmosphere",
    "Digitala aktiviteter": "digital_interaction",
    Ungdomsverksamhet: "collaboration_and_community",
  };

  const { data: mainPurposesRows, error: mainErr } = await supabase
    .from("purposes")
    .select("id,purpose_key")
    .eq("type", "main");
  if (mainErr) throw mainErr;
  const mainMap = new Map<string, string>();
  (mainPurposesRows || []).forEach((p) => mainMap.set(p.purpose_key!, p.id));

  const { data: products, error: productsErr } = await supabase.from("products").select("id,category");
  if (productsErr) throw productsErr;

  const mappings: ProductPurposeInsert[] = [];
  (products || []).forEach((p) => {
    const matchKey = p.category ? categoryToPurposeKey[p.category] : undefined;
    const purposeId = matchKey ? mainMap.get(matchKey) : undefined;
    if (p.id && purposeId) {
      mappings.push({ product_id: p.id, purpose_id: purposeId });
    }
  });

  if (mappings.length) {
    const { error } = await supabase.from("product_purposes").upsert(mappings);
    if (error) throw error;
  }
}

async function main() {
  console.log("Seeding purposes...");
  await upsertPurposes();
  console.log("Seeding products/target audiences...");
  await upsertProducts();
  console.log("Linking products to purposes...");
  await linkProductsToMainPurposes();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

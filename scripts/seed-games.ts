/**
 * Seed script for 25 real children's games
 * Run with: npx tsx scripts/seed-games.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

// Load environment variables from .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lekbanken tenant ID from seed-lekbanken.ts
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
type GameTranslationInsert = Database["public"]["Tables"]["game_translations"]["Insert"];
type MediaInsert = Database["public"]["Tables"]["media"]["Insert"];
type GameMediaInsert = Database["public"]["Tables"]["game_media"]["Insert"];

const shortify = (text?: string | null, max = 160) => {
  if (!text) return "Kort beskrivning saknas.";
  const firstSentence = text.split(/[\n\.]/)[0]?.trim() || text.trim();
  return firstSentence.slice(0, max);
};

const toSteps = (instructions?: string | null) => {
  if (!instructions) return [];
  const parts = instructions.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p, idx) => ({
    title: `Steg ${idx + 1}`,
    description: p,
  }));
};

// 25 klassiska och populÃ¤ra barnlekar
const GAMES: GameInsert[] = [
  // === UTELEKER (Outdoor) ===
  {
    game_key: "sista-pansen",
    name: "Sista pansen",
    description: "En klassisk tagglek dÃ¤r en person Ã¤r 'den' och ska ta fast de andra. Den som blir tagen blir nÃ¤sta 'den'.",
    instructions: `1. VÃ¤lj vem som ska vara "den" (kan slumpa med rÃ¤kneramsa)
2. "Den" rÃ¤knar till 10 medan de andra springer ivÃ¤g
3. "Den" springer efter och fÃ¶rsÃ¶ker ta fast nÃ¥gon genom att nudda dem
4. Den som blir tagen ropar "Sista pansen!" och blir nya "den"
5. Leken fortsÃ¤tter tills ni bestÃ¤mmer att sluta

Tips: Markera ett omrÃ¥de som Ã¤r "sÃ¤kert" dÃ¤r man inte kan bli tagen.`,
    category: "Utelekar",
    min_players: 3,
    max_players: 20,
    age_min: 4,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "outdoor",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "kurragomma",
    name: "KurragÃ¶mma",
    description: "Den klassiska gÃ¶mlek dÃ¤r en person sÃ¶ker medan de andra gÃ¶mmer sig.",
    instructions: `1. VÃ¤lj en person som ska sÃ¶ka ("den")
2. "Den" blundar och rÃ¤knar hÃ¶gt till ett bestÃ¤mt tal (t.ex. 50)
3. Medan "den" rÃ¤knar gÃ¶mmer sig alla andra
4. "Den" ropar "FÃ¤rdig eller inte, hÃ¤r kommer jag!" och bÃ¶rjar leta
5. NÃ¤r "den" hittar nÃ¥gon ropar hen "Jag ser [namn]!"
6. FÃ¶rsta som hittas blir "den" nÃ¤sta omgÃ¥ng

Variant: Burken - den som hittas kan "fritas" om en annan deltagare sparkar pÃ¥ burken.`,
    category: "Utelekar",
    min_players: 3,
    max_players: 15,
    age_min: 4,
    age_max: 14,
    time_estimate_min: 20,
    energy_level: "medium",
    location_type: "outdoor",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "hoppa-hage",
    name: "Hoppa hage",
    description: "Klassisk lek dÃ¤r man hoppar pÃ¥ ett fot genom rutor ritade pÃ¥ marken.",
    instructions: `1. Rita en hage pÃ¥ marken med krita (traditionellt 8-10 rutor)
2. FÃ¶rsta spelaren kastar en sten pÃ¥ ruta 1
3. Hoppa pÃ¥ ett ben genom alla rutor (hoppa Ã¶ver rutan med stenen)
4. PÃ¥ dubbelrutor fÃ¥r man landa med bÃ¥da fÃ¶tterna
5. VÃ¤nd om i slutet och hoppa tillbaka
6. Plocka upp stenen pÃ¥ vÃ¤gen tillbaka
7. Lyckas du? Kasta stenen pÃ¥ ruta 2 nÃ¤sta gÃ¥ng
8. Trampar du pÃ¥ linjen eller tappar balansen fÃ¥r nÃ¤sta spelare fÃ¶rsÃ¶ka`,
    category: "Utelekar",
    min_players: 1,
    max_players: 6,
    age_min: 5,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "medium",
    location_type: "outdoor",
    materials: "Krita, liten sten",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "roda-ljuset",
    name: "RÃ¶da ljuset, grÃ¶na ljuset",
    description: "Signallek dÃ¤r barnen rÃ¶r sig framÃ¥t pÃ¥ 'grÃ¶nt ljus' och mÃ¥ste stanna helt pÃ¥ 'rÃ¶tt ljus'.",
    instructions: `1. En person Ã¤r "trafikljuset" och stÃ¥r med ryggen mot de andra
2. Ã–vriga stÃ¥r pÃ¥ en startlinje ca 15-20 meter bort
3. "Trafikljuset" ropar "GrÃ¶nt ljus!" - dÃ¥ fÃ¥r alla springa framÃ¥t
4. "Trafikljuset" ropar "RÃ¶tt ljus!" och vÃ¤nder sig snabbt om
5. Alla mÃ¥ste stanna helt stilla - den som rÃ¶r sig fÃ¥r bÃ¶rja om
6. FÃ¶rsta som nuddar "trafikljuset" vinner och blir nya trafikljuset`,
    category: "Utelekar",
    min_players: 4,
    max_players: 20,
    age_min: 4,
    age_max: 10,
    time_estimate_min: 10,
    energy_level: "high",
    location_type: "outdoor",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "dansen-pa-rosor",
    name: "Dansen pÃ¥ rosor",
    description: "Ringlek dÃ¤r barnen dansar runt och en person i mitten vÃ¤ljer vem som ska bli nÃ¤sta i mitten.",
    instructions: `1. Alla stÃ¥r i en ring och hÃ¥ller varandra i hÃ¤nderna
2. En person stÃ¥r i mitten
3. Alla sjunger "Dansen pÃ¥ rosor" och gÃ¥r runt i ringen
4. Vid slutet av versen pekar personen i mitten pÃ¥ nÃ¥gon
5. Den utpekade byter plats med personen i mitten
6. Upprepa med ny vers och ny person i mitten`,
    category: "Ringlekar",
    min_players: 6,
    max_players: 25,
    age_min: 3,
    age_max: 8,
    time_estimate_min: 10,
    energy_level: "low",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "stolleken",
    name: "Stolleken",
    description: "Musiklek dÃ¤r barnen gÃ¥r runt stolar och sÃ¤tter sig nÃ¤r musiken stannar. En stol fÃ¶r fÃ¥!",
    instructions: `1. StÃ¤ll upp stolar i en rad (en fÃ¤rre Ã¤n antalet deltagare)
2. SÃ¤tt pÃ¥ musik och lÃ¥t barnen gÃ¥/dansa runt stolarna
3. Stoppa musiken plÃ¶tsligt
4. Alla ska fÃ¶rsÃ¶ka sÃ¤tta sig pÃ¥ en stol
5. Den som blir utan stol Ã¤r ute
6. Ta bort en stol och fortsÃ¤tt
7. Vinnaren Ã¤r den sista kvar!

Tips: LÃ¥t de som Ã¤r ute vara domare eller skÃ¶ta musiken.`,
    category: "Partylek",
    min_players: 5,
    max_players: 20,
    age_min: 4,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "medium",
    location_type: "indoor",
    materials: "Stolar, musik",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "blindbock",
    name: "Blindbock",
    description: "En person Ã¤r Ã¶gonbunden och ska fÃ¶rsÃ¶ka fÃ¥nga de andra som smyger omkring.",
    instructions: `1. Bind fÃ¶r Ã¶gonen pÃ¥ en person med en sjal eller Ã¶gonbindel
2. Snurra personen fÃ¶rsiktigt 3 varv
3. De andra rÃ¶r sig tyst omkring i rummet
4. "Blindbocken" fÃ¶rsÃ¶ker fÃ¥nga nÃ¥gon
5. NÃ¤r nÃ¥gon blir fÃ¥ngad ska blindbocken gissa vem det Ã¤r genom att kÃ¤nna pÃ¥ ansiktet
6. Gissar hen rÃ¤tt blir den fÃ¥ngade ny blindbock`,
    category: "Partylek",
    min_players: 5,
    max_players: 12,
    age_min: 5,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "medium",
    location_type: "indoor",
    materials: "Ã–gonbindel/sjal",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "kom-alla-mina-kycklingar",
    name: "Kom alla mina kycklingar",
    description: "Klassisk fÃ¥ngstlek dÃ¤r kycklingarna ska ta sig fÃ¶rbi rÃ¤ven till mamman.",
    instructions: `1. En vuxen Ã¤r "mamma hÃ¶na" pÃ¥ ena sidan av planen
2. En person Ã¤r "rÃ¤ven" i mitten
3. Alla barn (kycklingar) stÃ¥r pÃ¥ motsatt sida
4. Mamma hÃ¶na ropar: "Kom alla mina kycklingar!"
5. Kycklingarna svarar: "Vi tÃ¶rs inte, rÃ¤ven Ã¤r ute!"
6. Mamma hÃ¶na: "RÃ¤ven sover!" (rÃ¤ven lÃ¤gger sig ner)
7. Kycklingarna springer - rÃ¤ven vaknar och fÃ¶rsÃ¶ker ta dem
8. Tagna kycklingar blir ocksÃ¥ rÃ¤var
9. Sista kycklingen vinner!`,
    category: "Utelekar",
    min_players: 6,
    max_players: 30,
    age_min: 3,
    age_max: 8,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "outdoor",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "simon-sager",
    name: "Simon sÃ¤ger",
    description: "Instruktionslek dÃ¤r man bara fÃ¥r fÃ¶lja kommandon som bÃ¶rjar med 'Simon sÃ¤ger'.",
    instructions: `1. En person Ã¤r "Simon" och ger instruktioner
2. Om Simon sÃ¤ger "Simon sÃ¤ger hoppa!" ska alla hoppa
3. Om Simon bara sÃ¤ger "Hoppa!" utan "Simon sÃ¤ger" fÃ¶rst - ska man INTE gÃ¶ra det
4. Den som gÃ¶r fel Ã¤r ute (eller fÃ¥r en poÃ¤ng emot sig)
5. Simon kan variera tempo och fÃ¶rsÃ¶ka lura deltagarna
6. Sista kvar vinner och kan bli nya Simon

Exempel pÃ¥ kommandon:
- Simon sÃ¤ger: Ta pÃ¥ nÃ¤san
- Simon sÃ¤ger: Snurra runt
- Sitt ner! (fÃ¤lla - fÃ¶lj inte!)`,
    category: "Partylek",
    min_players: 3,
    max_players: 30,
    age_min: 4,
    age_max: 12,
    time_estimate_min: 10,
    energy_level: "medium",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "pantomim",
    name: "Pantomim",
    description: "Gissningslek dÃ¤r en person agerar ut ett ord eller mening utan att prata.",
    instructions: `1. Dela in i tvÃ¥ lag
2. FÃ¶rbered lappar med ord/meningar (djur, yrken, filmer, etc.)
3. En person frÃ¥n ett lag drar en lapp och agerar ut utan ljud
4. Laget har begrÃ¤nsad tid att gissa (t.ex. 1 minut)
5. RÃ¤tt svar = 1 poÃ¤ng
6. Turas om mellan lagen
7. Laget med flest poÃ¤ng vinner!

SvÃ¥righetsgrad:
- LÃ¤tt: Djur, sport
- Medium: Yrken, kÃ¤nslor
- SvÃ¥r: Filmtitlar, ordsprÃ¥k`,
    category: "Partylek",
    min_players: 4,
    max_players: 20,
    age_min: 6,
    age_max: 99,
    time_estimate_min: 20,
    energy_level: "low",
    location_type: "indoor",
    materials: "Papper, penna, timer",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "fia-med-knuff",
    name: "Fia med knuff",
    description: "Klassiskt brÃ¤dspel dÃ¤r man tÃ¤vlar om att fÃ¥ alla sina pjÃ¤ser runt banan fÃ¶rst.",
    instructions: `1. Varje spelare vÃ¤ljer en fÃ¤rg och har 4 pjÃ¤ser i sitt bo
2. SlÃ¥ en 6:a fÃ¶r att fÃ¥ ut en pjÃ¤s pÃ¥ banan
3. Flytta pjÃ¤sen lika mÃ¥nga steg som tÃ¤rningen visar
4. Landar du pÃ¥ en motstÃ¥ndares pjÃ¤s - knuffa tillbaka den till boet
5. Ta dig runt banan och in i mÃ¥l
6. FÃ¶rsta spelare med alla 4 pjÃ¤ser i mÃ¥l vinner!

Special: SlÃ¥r du 6 fÃ¥r du slÃ¥ igen.`,
    category: "BrÃ¤dspel",
    min_players: 2,
    max_players: 4,
    age_min: 5,
    age_max: 99,
    time_estimate_min: 30,
    energy_level: "low",
    location_type: "indoor",
    materials: "Fia-brÃ¤de, tÃ¤rning, pjÃ¤ser",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "memory",
    name: "Memory",
    description: "Minnesspel dÃ¤r man vÃ¤nder kort tvÃ¥ och tvÃ¥ fÃ¶r att hitta matchande par.",
    instructions: `1. Blanda korten och lÃ¤gg dem med baksidan upp i rader
2. FÃ¶rsta spelaren vÃ¤nder upp tvÃ¥ kort
3. Ã„r de lika? BehÃ¥ll paret och vÃ¤nd tvÃ¥ till
4. Ã„r de olika? VÃ¤nd tillbaka dem och nÃ¤sta spelare provar
5. FÃ¶rsÃ¶k komma ihÃ¥g var korten ligger!
6. Den med flest par nÃ¤r alla kort Ã¤r tagna vinner`,
    category: "BrÃ¤dspel",
    min_players: 2,
    max_players: 6,
    age_min: 3,
    age_max: 99,
    time_estimate_min: 15,
    energy_level: "low",
    location_type: "indoor",
    materials: "Memory-kort",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "dojan",
    name: "Dojan (GÃ¶mma nycklar)",
    description: "SÃ¶klek dÃ¤r ett fÃ¶remÃ¥l gÃ¶ms och alla letar. Varmare/kallare ger ledtrÃ¥dar.",
    instructions: `1. En person gÃ¶mmer ett litet fÃ¶remÃ¥l (nyckelknippa, mjukdjur etc.)
2. De andra blundar eller gÃ¥r ut ur rummet
3. NÃ¤r fÃ¶remÃ¥let Ã¤r gÃ¶mt fÃ¥r alla bÃ¶rja leta
4. Den som gÃ¶mt sÃ¤ger "varmare" nÃ¤r nÃ¥gon kommer nÃ¤ra
5. "Kallare" nÃ¤r de gÃ¥r Ã¥t fel hÃ¥ll
6. Den som hittar fÃ¶remÃ¥let fÃ¥r gÃ¶mma nÃ¤sta gÃ¥ng`,
    category: "Partylek",
    min_players: 3,
    max_players: 10,
    age_min: 4,
    age_max: 10,
    time_estimate_min: 15,
    energy_level: "low",
    location_type: "indoor",
    materials: "Litet fÃ¶remÃ¥l att gÃ¶mma",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "ringlek-bjornen-sover",
    name: "BjÃ¶rnen sover",
    description: "Klassisk ringlek dÃ¤r barnen sjunger och smyger runt en sovande bjÃ¶rn.",
    instructions: `1. En person Ã¤r bjÃ¶rnen och ligger i mitten och "sover"
2. Alla andra gÃ¥r runt och sjunger:
   "BjÃ¶rnen sover, bjÃ¶rnen sover i sitt lugna bo
   Han Ã¤r inte farlig, bara man Ã¤r varlig
   Men man kan dock, men man kan dock honom aldrig tro!"
3. PÃ¥ sista ordet vaknar bjÃ¶rnen och jagar de andra!
4. Den som fÃ¥ngas blir nÃ¤sta bjÃ¶rn`,
    category: "Ringlekar",
    min_players: 5,
    max_players: 20,
    age_min: 3,
    age_max: 8,
    time_estimate_min: 10,
    energy_level: "medium",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "potatisloppet",
    name: "Potatisloppet",
    description: "Stafett dÃ¤r man balanserar en potatis pÃ¥ en sked utan att tappa den.",
    instructions: `1. Dela in i lag med lika mÃ¥nga deltagare
2. Markera en bana med start, vÃ¤ndpunkt och mÃ¥l
3. Varje deltagare ska balansera en potatis pÃ¥ en sked
4. Spring till vÃ¤ndpunkten och tillbaka
5. LÃ¤mna Ã¶ver till nÃ¤sta i laget
6. Tappar du potatisen - stanna och lÃ¤gg tillbaka den
7. FÃ¶rsta lag dÃ¤r alla gÃ¥tt i mÃ¥l vinner!`,
    category: "Stafettlekar",
    min_players: 6,
    max_players: 30,
    age_min: 5,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "both",
    materials: "Skedar, potatisar (eller bollar)",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "fallskarm",
    name: "FallskÃ¤rm",
    description: "Samarbetslek med en stor fÃ¤rgglad fallskÃ¤rm som alla hÃ¥ller i tillsammans.",
    instructions: `1. Alla stÃ¥r i en ring och hÃ¥ller i fallskÃ¤rmens kant
2. GrundÃ¶vning: Lyfta och sÃ¤nka tillsammans
3. "Svampen": Alla lyfter, springer in och sÃ¤tter sig pÃ¥ kanten
4. "Kattleken": En person kryper under, en annan jagar
5. "Byta plats": Ledaren ropar en fÃ¤rg, de vid den fÃ¤rgen springer under
6. "Popcorn": LÃ¤gg bollar pÃ¥ duken, skaka sÃ¥ de hoppar

Fantastisk fÃ¶r samarbete och gemenskap!`,
    category: "Samarbetslek",
    min_players: 8,
    max_players: 30,
    age_min: 3,
    age_max: 12,
    time_estimate_min: 20,
    energy_level: "medium",
    location_type: "both",
    materials: "Stor fallskÃ¤rm/duk",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "stenstocken",
    name: "Sten, sax, pÃ¥se",
    description: "Snabb handlek fÃ¶r att avgÃ¶ra saker eller bara fÃ¶r skojs skull.",
    instructions: `1. TvÃ¥ personer stÃ¥r mitt emot varandra
2. SÃ¤g tillsammans "Sten, sax, pÃ¥se!" och visa ett handtecken:
   - Sten = knuten nÃ¤ve
   - Sax = tvÃ¥ fingrar (pek + lÃ¥ng)
   - PÃ¥se = Ã¶ppen hand
3. Vem vinner?
   - Sten krossar sax
   - Sax klipper pÃ¥se
   - PÃ¥se fÃ¥ngar sten
4. Samma tecken = oavgjort, gÃ¶r om!

BÃ¤st av 3 eller 5 fÃ¶r att avgÃ¶ra en vinnare.`,
    category: "Snabblek",
    min_players: 2,
    max_players: 2,
    age_min: 4,
    age_max: 99,
    time_estimate_min: 1,
    energy_level: "low",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "tunneln",
    name: "Tunneln",
    description: "LagtÃ¤vling dÃ¤r bollen ska skickas genom lagets ben snabbast mÃ¶jligt.",
    instructions: `1. Dela in i lag med 5-10 personer per lag
2. StÃ¥ pÃ¥ rad med benen isÃ¤r sÃ¥ de bildar en tunnel
3. FÃ¶rsta personen rullar bollen genom tunneln
4. Sista personen fÃ¥ngar bollen, springer lÃ¤ngst fram och rullar igen
5. FortsÃ¤tt tills alla har rullat
6. FÃ¶rsta lag dÃ¤r startpersonen Ã¤r tillbaka lÃ¤ngst fram vinner!

Variant: Skicka bollen Ã¶ver huvudet istÃ¤llet.`,
    category: "Stafettlekar",
    min_players: 10,
    max_players: 40,
    age_min: 5,
    age_max: 12,
    time_estimate_min: 10,
    energy_level: "high",
    location_type: "both",
    materials: "Bollar (en per lag)",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "dragon-tail",
    name: "Draksvansen",
    description: "Laglek dÃ¤r varje lag Ã¤r en drake som fÃ¶rsÃ¶ker stjÃ¤la de andra drakarnas svansar.",
    instructions: `1. Dela in i lag om 4-6 personer
2. Varje lag stÃ¤ller sig pÃ¥ rad och hÃ¥ller i varandra (midjan)
3. Sista personen har en "svans" (sjal/band) instoppad i byxorna
4. FÃ¶rsta personen Ã¤r drakens huvud och ska stjÃ¤la andras svansar
5. Lagen fÃ¥r inte slÃ¤ppa taget om varandra!
6. FÃ¶rlorar ni svansen Ã¤r ni ute
7. Sista draken med svans kvar vinner!`,
    category: "Laglek",
    min_players: 8,
    max_players: 30,
    age_min: 6,
    age_max: 14,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "outdoor",
    materials: "Sjalar/band som svansar",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "20-fragor",
    name: "20 frÃ¥gor",
    description: "Gissningslek dÃ¤r man stÃ¤ller ja/nej-frÃ¥gor fÃ¶r att lista ut ett hemligt ord.",
    instructions: `1. En person tÃ¤nker pÃ¥ nÃ¥got (djur, fÃ¶remÃ¥l, person)
2. De andra fÃ¥r stÃ¤lla max 20 ja/nej-frÃ¥gor
3. Bra startfrÃ¥gor:
   - Ã„r det levande?
   - Ã„r det stÃ¶rre Ã¤n en katt?
   - Finns det inomhus?
4. Efter varje svar fÃ¥r man gissa
5. Gissar nÃ¥gon rÃ¤tt innan 20 frÃ¥gor - de vinner!
6. Annars vinner den som tÃ¤nkte

Tips: BÃ¶rja brett och smalna av!`,
    category: "Gissningslek",
    min_players: 2,
    max_players: 10,
    age_min: 6,
    age_max: 99,
    time_estimate_min: 10,
    energy_level: "low",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "sardiner",
    name: "Sardiner",
    description: "OmvÃ¤nd kurragÃ¶mma - en person gÃ¶mmer sig och alla andra letar. Hittar du gÃ¶mslet, kryp in du ocksÃ¥!",
    instructions: `1. En person gÃ¶mmer sig medan alla andra blundar
2. NÃ¤r tiden Ã¤r ute bÃ¶rjar alla leta - var fÃ¶r sig
3. NÃ¤r du hittar personen - smyg in i gÃ¶mslet ocksÃ¥!
4. Snart ligger ni tÃ¤tt som sardiner i en burk
5. Sista person som hittar gÃ¶mslet "fÃ¶rlorar"
6. FÃ¶rsta som hittade fÃ¥r gÃ¶mma sig nÃ¤sta gÃ¥ng

Perfekt fÃ¶r mÃ¶rker eller stora ytor!`,
    category: "GÃ¶mlek",
    min_players: 4,
    max_players: 15,
    age_min: 5,
    age_max: 14,
    time_estimate_min: 20,
    energy_level: "medium",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "kapten-stansen",
    name: "Kapten Stansen",
    description: "Alla mÃ¥ste lyda kaptenen och gÃ¶ra olika rÃ¶relser pÃ¥ kommando - en korsning mellan Simon sÃ¤ger och gymnastik.",
    instructions: `1. En vuxen eller barn Ã¤r "Kapten Stansen"
2. Kaptenen ger kommandon som alla mÃ¥ste fÃ¶lja:
   - "DÃ¤ck!" - lÃ¤gg dig platt pÃ¥ magen
   - "Kapten pÃ¥ dÃ¤ck!" - stÃ¥ i givakt och hÃ¤lsa
   - "Swabba dÃ¤ck!" - gÃ¶r som att du moppar
   - "KlÃ¤ttra i master!" - lÃ¥tsas klÃ¤ttra uppÃ¥t
   - "Styrbord!" - spring Ã¥t hÃ¶ger
   - "Babord!" - spring Ã¥t vÃ¤nster
3. Den som Ã¤r sist eller gÃ¶r fel Ã¤r ute
4. Sista sjÃ¶man kvar blir ny kapten!`,
    category: "RÃ¶relselek",
    min_players: 5,
    max_players: 30,
    age_min: 4,
    age_max: 12,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "both",
    materials: null,
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "fruktsallad",
    name: "Fruktsallad",
    description: "Stol-bytarlek dÃ¤r man byter plats nÃ¤r ens frukt ropas upp - eller 'fruktsallad' fÃ¶r totalt kaos!",
    instructions: `1. StÃ¤ll stolar i en ring (en fÃ¤rre Ã¤n antalet deltagare)
2. Alla sitter, utom en som stÃ¥r i mitten
3. Ge varje person en frukt: Ã¤pple, banan, apelsin (fÃ¶rdela jÃ¤mnt)
4. Personen i mitten ropar en frukt, t.ex. "Banan!"
5. Alla bananer mÃ¥ste byta plats - inkl. den i mitten som fÃ¶rsÃ¶ker ta en stol
6. Den utan stol blir nya mittenpersonen
7. "Fruktsallad!" = alla byter plats!`,
    category: "Partylek",
    min_players: 8,
    max_players: 25,
    age_min: 5,
    age_max: 14,
    time_estimate_min: 15,
    energy_level: "high",
    location_type: "indoor",
    materials: "Stolar",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "sandslott",
    name: "Sandslottsbygge",
    description: "Kreativ utomhusaktivitet dÃ¤r barnen bygger slott och figurer i sandlÃ¥dan.",
    instructions: `1. Samla material: hinkar, spadar, formar, vattenflaska
2. BlÃ¶t sanden lite fÃ¶r bÃ¤ttre konsistens
3. Bygg-tips:
   - BÃ¶rja med en stor baspyramid
   - AnvÃ¤nd hinkar fÃ¶r torn
   - Dekorera med snÃ¤ckor, pinnar, lÃ¶v
   - GrÃ¤v vallgravar runt slottet
4. GÃ¶r det till en tÃ¤vling eller samarbete
5. Ta foton av mÃ¤sterverket!

Bonus: Vem kan bygga hÃ¶gst utan att det rasar?`,
    category: "Kreativ lek",
    min_players: 1,
    max_players: 6,
    age_min: 2,
    age_max: 10,
    time_estimate_min: 30,
    energy_level: "low",
    location_type: "outdoor",
    materials: "Hink, spade, sandformar, vatten",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
  {
    game_key: "sten-studsar",
    name: "Kasta smÃ¶rgÃ¥sar",
    description: "Klassisk utomhuslek vid vatten dÃ¤r man fÃ¶rsÃ¶ker fÃ¥ stenar att studsa pÃ¥ vattenytan.",
    instructions: `1. Hitta platta, runda stenar (smÃ¶rgÃ¥sstenar)
2. StÃ¥ vid vattenbrynet
3. HÃ¥ll stenen horisontellt mellan tumme och pekfinger
4. Kasta med sidledskast, lÃ¥gt mot vattnet
5. RÃ¤kna hur mÃ¥nga studsar du fÃ¥r!
6. TÃ¤vla: Vem fÃ¥r flest studsar?

Tips: Ju plattare sten och lÃ¤gre kastvinkel, desto fler studsar!
VÃ¤rldsrekord: 88 studsar!`,
    category: "Utelekar",
    min_players: 1,
    max_players: 6,
    age_min: 6,
    age_max: 99,
    time_estimate_min: 20,
    energy_level: "low",
    location_type: "outdoor",
    materials: "Platta stenar, tillgÃ¥ng till vatten",
    status: "published",
    owner_tenant_id: TENANT_ID,
  },
];

async function seedGames() {
  console.log("ðŸŽ® Starting game seed...\n");

  // Check if tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", TENANT_ID)
    .single();

  if (tenantError || !tenant) {
    console.error("âŒ Tenant not found! Run seed-lekbanken.ts first.");
    console.error("   npx tsx scripts/seed-lekbanken.ts");
    process.exit(1);
  }

  console.log(`âœ… Found tenant: ${tenant.name}\n`);

    // Insert games
  let inserted = 0;
  let errors = 0;

  for (const game of GAMES) {
    const baseGame = {
      ...game,
      short_description: shortify(game.description),
    };

    const { data: upserted, error } = await supabase
      .from("games")
      .upsert(baseGame, { onConflict: "game_key" })
      .select("id, name, owner_tenant_id, product_id, main_purpose_id, description")
      .single();

    if (error) {
      console.error(`Error with "${game.name}":`, (error as any).message || error);
      errors++;
      continue;
    }

    console.log(`✓ ${game.name}`);
    inserted++;

    const gameId = upserted.id;

    const translation = {
      game_id: gameId,
      locale: "sv",
      title: game.name,
      short_description: shortify(upserted.description),
      instructions: toSteps(game.instructions),
      materials: Array.isArray(game.materials) ? (game.materials as string[]) : null,
    } as GameTranslationInsert;
    await supabase
      .from("game_translations")
      .upsert(translation, { onConflict: "game_id,locale" });

    const { data: existingCover } = await supabase
      .from("game_media")
      .select("id")
      .eq("game_id", gameId)
      .eq("kind", "cover")
      .limit(1);

    if (!existingCover || existingCover.length === 0) {
      const mediaPayload = {
        name: `${game.name} cover`,
        type: "image",
        game_id: gameId,
        url: `https://picsum.photos/seed/${game.game_key || game.name}/1200/800`,
        alt_text: game.name,
        product_id: upserted.product_id || null,
        purpose_id: upserted.main_purpose_id || null,
      } as MediaInsert;
      const { data: mediaRow, error: mediaError } = await supabase
        .from("media")
        .insert(mediaPayload)
        .select("id")
        .single();
      if (!mediaError && mediaRow) {
        const gameMediaPayload = {
          game_id: gameId,
          media_id: mediaRow.id,
          tenant_id: upserted.owner_tenant_id ?? null,
          kind: "cover",
          position: 0,
          alt_text: game.name,
        } as GameMediaInsert;
        await supabase.from("game_media").insert(gameMediaPayload);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Seed completed!`);
  console.log(`   ${inserted} games inserted/updated`);
  if (errors > 0) console.log(`   ${errors} errors`);
  console.log("=".repeat(50));
}

seedGames().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});


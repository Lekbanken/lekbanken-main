/**
 * Mock Games for Sandbox
 *
 * 3 testspel i GameDetailData format för sandbox-miljön.
 * Konverterade från det ursprungliga GameExample-formatet.
 */

import type {
  GameDetailData,
  PlayMode,
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameDecision,
  GameMaterial,
  GameBoardWidget,
} from '@/lib/game-display';

// =============================================================================
// STYLING CONFIG (behålls för sandbox-specifik styling)
// =============================================================================

export const playModeConfig: Record<PlayMode, { label: string; border: string; badge: string; hero: string }> = {
  basic: {
    label: 'Enkel lek',
    border: 'border-border',
    badge: 'bg-muted text-muted-foreground ring-1 ring-border',
    hero: 'from-muted/70 via-muted/30 to-card',
  },
  facilitated: {
    label: 'Ledd aktivitet',
    border: 'border-primary/50',
    badge: 'bg-primary/10 text-primary ring-1 ring-primary/30',
    hero: 'from-primary/30 via-primary/10 to-card',
  },
  participants: {
    label: 'Deltagarlek',
    border: 'border-yellow/60',
    badge: 'bg-yellow/20 text-foreground ring-1 ring-yellow/40',
    hero: 'from-yellow/30 via-yellow/10 to-card',
  },
};

// =============================================================================
// BASIC EXAMPLE: Skattjakt Mini
// =============================================================================

const basicSteps: GameStep[] = [
  {
    title: 'Kickoff och regler',
    body: 'Presentera uppdraget och gör en snabb genomgång av området.',
    duration: '5 min',
    leaderScript: 'Samla lagen, visa kartan och peka ut startpunkten.',
    displayMode: 'instant',
  },
  {
    title: 'Första ledtråden',
    body: 'Varje lag får ett kort som leder till nästa station.',
    duration: '4 min',
    participantPrompt: 'Hitta platsen på kartan och spring tillsammans.',
    displayMode: 'typewriter',
  },
  {
    title: 'Stationer och poäng',
    body: 'Varje station ger en bokstav och ett kort uppdrag.',
    duration: '8 min',
    leaderScript: 'Belöna lag som samarbetar och följer reglerna.',
    boardText: 'Ledtrådar samlas för att bygga slutordet.',
  },
  {
    title: 'Finalen',
    body: 'Lagen samlar bokstäverna och löser slutordet.',
    duration: '5 min',
    leaderScript: 'Håll energin uppe och ge små hintar vid behov.',
    displayMode: 'dramatic',
  },
  {
    title: 'Uppsamling',
    body: 'Fira vinnare och lyft bra samarbete.',
    duration: '3 min',
    leaderScript: 'Ställ två reflektionsfrågor och tacka alla.',
  },
];

const basicMaterials: GameMaterial[] = [
  { label: 'Ledtrådskort', detail: '8 st, laminerade' },
  { label: 'Skattpåse', detail: '1 st, målstation' },
  { label: 'Kartblad', detail: '1 per lag' },
  { label: 'Poängmarkörer', detail: 'Enkla klisterlappar' },
];

export const basicExample: GameDetailData = {
  id: 'basic-sandbox',
  title: 'Skattjakt Mini',
  subtitle: 'Snabbstart för energifylld uppdragslek',
  shortDescription: 'En snabb skattjakt med tydliga steg. Perfekt när du vill komma igång direkt utan extra rekvisita.',
  description: 'Leken är byggd för att ge mycket upplevelse med minimal setup. Den fungerar både inne och ute och kan skalas upp eller ner.',
  playMode: 'basic',
  coverUrl: '/avatars/greenmoss.png',
  gallery: ['/avatars/greenmoss.png', '/avatars/greygravel.png', '/avatars/redmagma.png'],
  tags: ['Snabbstart', 'Skattjakt', 'Uppdrag', 'Utomhus', 'Samarbete'],
  highlights: ['Steg för steg', 'Kort förberedelse', 'Låg tröskel', 'Passar i alla miljöer'],
  
  // Metadata
  durationMin: 20,
  durationMax: 30,
  minPlayers: 4,
  maxPlayers: 12,
  ageMin: 6,
  ageMax: 12,
  energyLevel: 'medium',
  environment: 'both',
  difficulty: 'easy',
  status: 'published',
  
  // Content
  steps: basicSteps,
  materials: basicMaterials,
  preparation: ['Skriv ut kartor och ledtrådar', 'Placera ledtrådskort på 4-6 stationer', 'Testa tidsramen med ett provlag'],
  safety: ['Markera gränser för området', 'Undvik trånga passager', 'Ha en vuxen på varje station vid behov'],
  accessibility: ['Kan spelas i sittande format', 'Alternativa uppdrag utan spring', 'Tydliga ikoner på ledtrådskort'],
  outcomes: ['Samarbete under tidspress', 'Problemlösning och logik', 'Rörelse och orientering'],
  requirements: ['Papper och pennor', '4-6 stationer i rummet', 'Klocka eller timer'],
  downloads: ['Ledtrådskort A4', 'Karta och stationsskyltar', 'Snabbguide för ledare'],
  variants: ['Kort version: ta bort en station och kapa till 15 min', 'Inomhus: byt stationer till bord med uppdrag', 'Stor grupp: kör stafett och räkna totalpoäng'],
  reflections: ['Vad gjorde laget mest effektivt?', 'När samarbetade ni som bäst?', 'Vad skulle ni förbättra nästa gång?'],
  
  meta: {
    gameKey: 'skattjakt-mini',
    version: 'v1.3',
    updatedAt: '2025-01-10',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
};

// =============================================================================
// FACILITATED EXAMPLE: Workshop Samarbetslabbet
// =============================================================================

const facilitatedSteps: GameStep[] = [
  {
    title: 'Introduktion och målbild',
    body: 'Sätt ramarna och visa dagens utmaning på tavlan.',
    duration: '7 min',
    leaderScript: 'Fokusera på vad som ska vara klart efter varje fas.',
    displayMode: 'instant',
  },
  {
    title: 'Fas 1 kickoff',
    body: 'Lagen skapar första prototypen och dokumenterar insikter.',
    duration: '12 min',
    leaderScript: 'Cirkulera och ge mikro-feedback var tredje minut.',
    boardText: 'Checkpoint 1: prototyp klar.',
  },
  {
    title: 'Fas 2 iteration',
    body: 'Snabbt test och iteration baserat på feedback.',
    duration: '12 min',
    leaderScript: 'Avsluta med en 2-minuters pitch från varje lag.',
    displayMode: 'typewriter',
  },
  {
    title: 'Demorunda',
    body: 'Varje lag visar sin lösning på 90 sekunder.',
    duration: '8 min',
    leaderScript: 'Använd tavlan för att markera insikter.',
  },
  {
    title: 'Reflektion',
    body: 'Guidade frågor och sammanfattning av lärdomar.',
    duration: '10 min',
    leaderScript: 'Knyt tillbaka till målbilden och välj en next step.',
    displayMode: 'dramatic',
  },
];

const facilitatedPhases: GamePhase[] = [
  {
    title: 'Start och målbild',
    duration: '10 min',
    goal: 'Skapa gemensam bild av utmaningen.',
    facilitator: 'Visa agenda, förtydliga roller och tid.',
    outputs: ['Målbild synlig', 'Lag indelade'],
    board: 'Agenda + tid kvar',
  },
  {
    title: 'Bygga prototyp',
    duration: '15 min',
    goal: 'Skapa första lösning att testa.',
    facilitator: 'Ställ frågor som driver fram beslut.',
    outputs: ['Prototyp klar', 'Två antaganden noterade'],
    board: 'Checkpoint 1 markerad',
  },
  {
    title: 'Testa och iterera',
    duration: '15 min',
    goal: 'Förbättra baserat på feedback.',
    facilitator: 'Samla feedback på tavlan och prioritera.',
    outputs: ['Iteration genomförd', 'Lärdomar listade'],
    board: 'Feedbackmatris',
  },
  {
    title: 'Reflektion och beslut',
    duration: '10 min',
    goal: 'Säkra lärdomar och nästa steg.',
    facilitator: 'Led en snabb retrospektiv och fördelning.',
    outputs: ['Next step vald', 'Gemensam summering'],
    board: 'Slutinsikt + action',
  },
];

const facilitatedMaterials: GameMaterial[] = [
  { label: 'Post-it', detail: '3 färger, 1 block per lag' },
  { label: 'Timer', detail: 'Digital nedräkning per fas' },
  { label: 'Byggmaterial', detail: 'Sugrör, tejp, sax' },
  { label: 'Reflektionskort', detail: '10 st, blandade teman' },
];

const facilitatedBoardWidgets: GameBoardWidget[] = [
  { title: 'Teamstatus', detail: 'Liveindikator för varje lag' },
  { title: 'Tid kvar', detail: 'Nedräkning per fas' },
  { title: 'Målbild', detail: 'Vad ska levereras?' },
  { title: 'Checkpoints', detail: 'Markerade milstolpar' },
];

export const facilitatedExample: GameDetailData = {
  id: 'facilitated-sandbox',
  title: 'Workshop: Samarbetslabbet',
  subtitle: 'Ledd aktivitet med faser, timer och gemensam reflektion',
  shortDescription: 'Ledd aktivitet med faser och tidtagning. Bygg teamkänsla med tydliga instruktioner och checkpoints.',
  description: 'Workshopen är framtagen för ledare som vill ha en styrd process. Varje fas har ett tydligt mål, en tidsram och ett reflektionsblock.',
  playMode: 'facilitated',
  coverUrl: '/avatars/turqwave.png',
  gallery: ['/avatars/turqwave.png', '/avatars/rainbowheaven.png', '/avatars/greygravel.png'],
  tags: ['Workshop', 'Faser', 'Ledare', 'Teamwork', 'Reflektion'],
  highlights: ['Fasplan', 'Ledarmanus', 'Digital timer', 'Publik tavla', 'Checkpoints'],
  
  // Metadata
  durationMin: 45,
  durationMax: 60,
  minPlayers: 6,
  maxPlayers: 24,
  ageMin: 8,
  ageMax: 16,
  energyLevel: 'medium',
  environment: 'indoor',
  difficulty: 'medium',
  status: 'published',
  
  // Content
  steps: facilitatedSteps,
  phases: facilitatedPhases,
  materials: facilitatedMaterials,
  boardWidgets: facilitatedBoardWidgets,
  checkpoints: ['Alla grupper har en plan', 'Minst en prototyp klar', 'Reflektionsrunda avslutad'],
  preparation: ['Ladda ner fasplanen', 'Sätt upp tre stationer i rummet', 'Testa timern och checkpointerna'],
  safety: ['Tydlig gruppindelning', 'Säker stopp-signal', 'Lugn zon vid behov'],
  accessibility: ['Faser kan kortas ner', 'Stöd för tyst deltagande', 'Skrivna instruktioner + visuellt stöd'],
  outcomes: ['Samarbete och rollfördelning', 'Kommunikation och feedback', 'Iterativt lärande'],
  requirements: ['Whiteboard eller stor skärm', 'Post-it och pennor', 'Timer i appen', 'Fritt golvutrymme'],
  downloads: ['Fasplan PDF', 'Ledarmanus', 'Tavla-mallar', 'Utvärderingsformulär'],
  variants: ['Förkorta till 30 min genom att kapa fas 2', 'Utomhusvariant med flyttbara stationer', 'Större grupp: lägg till en parallelldemo'],
  reflections: ['Vad fungerade bäst i samarbetet?', 'Vilket beslut gav mest effekt?', 'Vad skulle ni göra annorlunda nästa gång?'],
  facilitatorTools: ['Live timer', 'Fasbyte-knapp', 'Snabbmeddelanden', 'Tyst läge'],
  hostActions: ['Förläng fas', 'Lås upp nästa steg', 'Markera checkpoint'],
  
  meta: {
    gameKey: 'samarbetslabbet',
    version: 'v2.0',
    updatedAt: '2025-01-12',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
};

// =============================================================================
// PARTICIPANTS EXAMPLE: Mysterie Försvunnen Kod
// =============================================================================

const participantsSteps: GameStep[] = [
  {
    title: 'Rollutdelning',
    body: 'Deltagarna läser sina privata instruktioner och första uppdrag.',
    duration: '8 min',
    leaderScript: 'Säkerställ att alla förstår sin roll innan start.',
    participantPrompt: 'Din roll har ett hemligt mål. Håll det för dig själv.',
  },
  {
    title: 'Runda 1: Insamling',
    body: 'Gruppen samlar ledtrådar och loggar observationer på tavlan.',
    duration: '15 min',
    boardText: 'Ledtrådar registreras i tidslinjen.',
    displayMode: 'typewriter',
  },
  {
    title: 'Röstning 1',
    body: 'Snabb omröstning om vem som verkar misstänkt.',
    duration: '4 min',
    participantPrompt: 'Rösta anonymt i mobilen.',
    boardText: 'Resultat visas på tavlan i realtid.',
  },
  {
    title: 'Runda 2: Avslöja mönster',
    body: 'Deltagarna kopplar kodfragment till misstänkta.',
    duration: '15 min',
    leaderScript: 'Ge en extra ledtråd om gruppen fastnar.',
  },
  {
    title: 'Final: Kodpanelen',
    body: 'Gruppen löser koden tillsammans och avslöjar sanningen.',
    duration: '10 min',
    boardText: 'Kodpanelen låses upp med rätt svar.',
    displayMode: 'dramatic',
  },
  {
    title: 'Debrief',
    body: 'Avsluta med reflektionsfrågor och rollavslut.',
    duration: '8 min',
    leaderScript: 'Separera roll och person, lyft insikter.',
  },
];

const participantsPhases: GamePhase[] = [
  {
    title: 'Introduktion',
    duration: '10 min',
    goal: 'Sätt rollkänsla och säkerhet.',
    facilitator: 'Förklara regler, tidsram och trygghetsord.',
    outputs: ['Roller utdelade', 'Spelregler klara'],
    board: 'Regler + tidslinje start',
  },
  {
    title: 'Undersökning',
    duration: '35 min',
    goal: 'Samla ledtrådar och skapa misstankekarta.',
    facilitator: 'Släpp triggers och artefakter enligt plan.',
    outputs: ['Tidslinje uppdaterad', 'Misstankekarta fylld'],
    board: 'Misstankekarta + kodfragment',
  },
  {
    title: 'Avslöjande',
    duration: '20 min',
    goal: 'Fatta beslut och avslöja koden.',
    facilitator: 'Led finalen och aktivera avslut.',
    outputs: ['Rätt kod vald', 'Debrief klar'],
    board: 'Finalresultat + röstning',
  },
];

const participantsRoles: GameRole[] = [
  {
    name: 'Arkivarien',
    count: '1',
    publicNote: 'Känner till gamla protokoll.',
    privateNote: 'Har en hemlig anteckning i fickan.',
    secrets: ['Vet om falsk ledtråd', 'Skyddar ett namn'],
  },
  {
    name: 'Analytikern',
    count: '2',
    publicNote: 'Samlar fakta och sammanställer koder.',
    privateNote: 'Måste avslöja två ledtrådar innan finalen.',
    secrets: ['Har tillgång till kodfragment'],
  },
  {
    name: 'Sabotören',
    count: '1',
    publicNote: 'Ger energi och driver på gruppen.',
    privateNote: 'Ska förvirra minst en röstning.',
    secrets: ['Kan byta en ledtråd'],
  },
  {
    name: 'Förhandlaren',
    count: '1',
    publicNote: 'Håller ihop samtal och tar beslut.',
    privateNote: 'Får bonusinfo vid röstningar.',
    secrets: ['Har en extra röst'],
  },
  {
    name: 'Spanaren',
    count: '2-4',
    publicNote: 'Rör sig mellan stationer och hittar artefakter.',
    privateNote: 'Måste dokumentera varje fynd.',
    secrets: ['Har karta till artefakt'],
  },
];

const participantsArtifacts: GameArtifact[] = [
  { title: 'Kodfragment A', type: 'Fysisk', use: 'Kopplas till tidslinjen', access: 'Runda 1' },
  { title: 'Privat kortlek', type: 'Digital', use: 'Skickas till varje roll', access: 'Vid start' },
  { title: 'Låst kuvert', type: 'Fysisk', use: 'Öppnas efter röstning 1', access: 'Trigger' },
  { title: 'Publik ledtråd', type: 'Board', use: 'Visas för alla efter 20 min', access: 'Automatisk' },
];

const participantsTriggers: GameTrigger[] = [
  {
    title: 'Tidsvarning',
    condition: '10 min kvar av undersökning',
    effect: 'Släpp en extra ledtråd på tavlan',
  },
  {
    title: 'Falsk ledtråd',
    condition: 'Sabotör aktiverar kort',
    effect: 'Ersätter en kod i tidslinjen',
  },
  {
    title: 'Finalstart',
    condition: 'Koden har tre rätt delar',
    effect: 'Lås upp kodpanelen för slutval',
  },
];

const participantsDecisions: GameDecision[] = [
  {
    title: 'Vem litar vi på?',
    prompt: 'Välj två deltagare som får sista ledtråden.',
    options: ['Arkivarien', 'Analytikern', 'Förhandlaren', 'Spanaren'],
    resolution: 'Två högsta röster får tillgång.',
  },
  {
    title: 'Slutkod',
    prompt: 'Vilken kod låser upp systemet?',
    options: ['A-17', 'C-42', 'B-09'],
    resolution: 'Rätt svar avslöjar sanningen.',
  },
];

const participantsMaterials: GameMaterial[] = [
  { label: 'Rollkort', detail: '1 per deltagare' },
  { label: 'Hemliga kuvert', detail: '6 st, artefakter' },
  { label: 'Kodfragment', detail: '3 st fysiska ledtrådar' },
  { label: 'Publik tavla', detail: 'Digital projektion' },
];

const participantsBoardWidgets: GameBoardWidget[] = [
  { title: 'Misstankekarta', detail: 'Publik karta med ledtrådar och roller' },
  { title: 'Tidslinje', detail: 'Händelser i realtid' },
  { title: 'Kodpanel', detail: 'Samlade kodfragment och gissningar' },
  { title: 'Röstningar', detail: 'Resultat från deltagarval' },
];

export const participantsExample: GameDetailData = {
  id: 'participants-sandbox',
  title: 'Mysterie: Försvunnen kod',
  subtitle: 'Deltagarlek med roller, privata instruktioner och publik tavla',
  shortDescription: 'Deltagarlek med hemliga uppdrag, publik tavla och live-omröstningar. Perfekt för roller och spänning.',
  description: 'Mysterie som körs i tre rundor. Varje deltagare får en roll med privata instruktioner och hemliga kort som påverkar gruppens val.',
  playMode: 'participants',
  coverUrl: '/avatars/pinksky.png',
  gallery: ['/avatars/pinksky.png', '/avatars/deepspace.png', '/avatars/redmagma.png'],
  tags: ['Mysterium', 'Roller', 'Publik tavla', 'Live', 'Digital', 'Förtroende'],
  highlights: ['Roller och hemliga kort', 'Publik tavla', 'Live-omröstningar', 'Artefakter', 'Triggers'],
  
  // Metadata
  durationMin: 60,
  durationMax: 90,
  minPlayers: 8,
  maxPlayers: 20,
  ageMin: 12,
  ageMax: 18,
  energyLevel: 'high',
  environment: 'indoor',
  difficulty: 'hard',
  status: 'published',
  
  // Content
  steps: participantsSteps,
  phases: participantsPhases,
  roles: participantsRoles,
  artifacts: participantsArtifacts,
  triggers: participantsTriggers,
  decisions: participantsDecisions,
  materials: participantsMaterials,
  boardWidgets: participantsBoardWidgets,
  checkpoints: undefined,
  preparation: ['Dela ut roller och hemliga kort', 'Testa uppkoppling och live-omröstningar', 'Placera artefakter i rummet', 'Sätt upp publik tavla'],
  safety: ['Samtycke till rollspel', 'Avsluta roll med säkerhetsord', 'Debrief obligatorisk'],
  accessibility: ['Flera svårighetsnivåer', 'Text + ikon i alla promptar', 'Möjlighet till tyst roll'],
  outcomes: ['Rollspel och empati', 'Beslutsfattande under osäkerhet', 'Gemensam problemlösning'],
  requirements: ['Mobil per deltagare', 'Stor skärm', 'Stabilt internet', 'Ljudsignal', 'Kortlek eller tokens'],
  downloads: ['Rollkort PDF', 'Publik tavla mall', 'Mysteriepaket', 'Ledarmanus'],
  variants: ['Kortare version: hoppa över runda 2', 'Fler roller med sidouppdrag', 'Analog variant utan mobil (röstning via kort)'],
  reflections: ['Vem litade ni på och varför?', 'Vilken ledtråd var avgörande?', 'Hur kändes det att ha hemlig info?'],
  facilitatorTools: ['Rollpanel', 'Triggerkontroller', 'Live-omröstning', 'Privata meddelanden', 'Debrief-kort'],
  hostActions: ['Starta röstning', 'Lås upp artefakt', 'Skicka hemlig ledtråd'],
  
  meta: {
    gameKey: 'mysterie-forsvunnen-kod',
    version: 'v3.1',
    updatedAt: '2025-01-15',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export const mockGames: Record<string, GameDetailData> = {
  basic: basicExample,
  facilitated: facilitatedExample,
  participants: participantsExample,
};

export const mockGamesList: GameDetailData[] = [basicExample, facilitatedExample, participantsExample];

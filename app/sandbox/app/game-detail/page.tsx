'use client'

import Image from 'next/image'
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent, Switch } from '@/components/ui'
import {
  BellAlertIcon,
  BeakerIcon,
  BoltIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  FlagIcon,
  InformationCircleIcon,
  LightBulbIcon,
  ListBulletIcon,
  MapPinIcon,
  MegaphoneIcon,
  PlayIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  StarIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type PlayMode = 'basic' | 'facilitated' | 'participants'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

type Fact = {
  label: string
  value: string
  icon: IconType
}

type Step = {
  title: string
  body: string
  duration: string
  leaderScript?: string
  participantPrompt?: string
  boardText?: string
  display?: 'instant' | 'typewriter' | 'dramatic'
  optional?: boolean
}

type Phase = {
  title: string
  duration: string
  goal: string
  facilitator: string
  outputs: string[]
  board?: string
}

type Role = {
  name: string
  count: string
  publicNote: string
  privateNote: string
  secrets: string[]
}

type Artifact = {
  title: string
  type: string
  use: string
  access: string
}

type Trigger = {
  title: string
  condition: string
  effect: string
}

type Decision = {
  title: string
  prompt: string
  options: string[]
  resolution: string
}

type BoardWidget = {
  title: string
  detail: string
}

type GameExample = {
  id: string
  playMode: PlayMode
  title: string
  subtitle: string
  shortDescription: string
  description: string
  coverImage: string
  gallery: string[]
  tags: string[]
  status: string[]
  highlights: string[]
  quickFacts: Fact[]
  requirements: string[]
  outcomes: string[]
  accessibility: string[]
  safety: string[]
  materials: { label: string; detail: string }[]
  preparation: string[]
  downloads: string[]
  steps: Step[]
  variants: string[]
  reflections: string[]
  phases?: Phase[]
  boardWidgets?: BoardWidget[]
  checkpoints?: string[]
  roles?: Role[]
  artifacts?: Artifact[]
  triggers?: Trigger[]
  decisions?: Decision[]
  facilitatorTools?: string[]
  hostActions?: string[]
  meta: {
    gameKey: string
    version: string
    updatedAt: string
    owner: string
    locale: string
  }
}

type SectionId =
  | 'intro'
  | 'tags'
  | 'cover'
  | 'about'
  | 'experience'
  | 'gallery'
  | 'materials'
  | 'preparation'
  | 'phases'
  | 'steps'
  | 'board'
  | 'checkpoints'
  | 'roles'
  | 'artifacts'
  | 'triggers'
  | 'decisions'
  | 'facilitatorTools'
  | 'participantMock'
  | 'safety'
  | 'accessibility'
  | 'variants'
  | 'reflection'
  | 'cta'
  | 'quickFacts'
  | 'requirements'
  | 'downloads'
  | 'hostActions'
  | 'metadata'

type SectionDefinition = {
  id: SectionId
  label: string
  group: 'Intro' | 'Innehåll' | 'Flöde' | 'Deltagare' | 'Sidebar'
  available?: (game: GameExample) => boolean
}

const sectionDefinitions: SectionDefinition[] = [
  { id: 'intro', label: 'Titel och ingress', group: 'Intro' },
  { id: 'tags', label: 'Taggar och highlights', group: 'Intro' },
  { id: 'cover', label: 'Omslagsblock', group: 'Intro' },
  { id: 'about', label: 'Om leken', group: 'Innehåll' },
  { id: 'experience', label: 'Spelupplevelse', group: 'Innehåll' },
  { id: 'gallery', label: 'Bildgalleri', group: 'Innehåll' },
  { id: 'materials', label: 'Material', group: 'Innehåll' },
  { id: 'preparation', label: 'Förberedelser', group: 'Innehåll' },
  { id: 'safety', label: 'Säkerhet', group: 'Innehåll' },
  { id: 'accessibility', label: 'Tillgänglighet', group: 'Innehåll' },
  { id: 'variants', label: 'Varianter', group: 'Innehåll' },
  { id: 'reflection', label: 'Reflektion', group: 'Innehåll' },
  { id: 'phases', label: 'Fasplan', group: 'Flöde', available: (game) => Boolean(game.phases?.length) },
  { id: 'steps', label: 'Steg för steg', group: 'Flöde' },
  { id: 'board', label: 'Publik tavla', group: 'Flöde', available: (game) => Boolean(game.boardWidgets?.length) },
  { id: 'checkpoints', label: 'Checkpoints', group: 'Flöde', available: (game) => Boolean(game.checkpoints?.length) },
  { id: 'roles', label: 'Roller', group: 'Deltagare', available: (game) => Boolean(game.roles?.length) },
  { id: 'artifacts', label: 'Artefakter', group: 'Deltagare', available: (game) => Boolean(game.artifacts?.length) },
  { id: 'triggers', label: 'Triggers', group: 'Deltagare', available: (game) => Boolean(game.triggers?.length) },
  {
    id: 'decisions',
    label: 'Omröstningar och beslut',
    group: 'Deltagare',
    available: (game) => Boolean(game.decisions?.length),
  },
  {
    id: 'facilitatorTools',
    label: 'Facilitatorverktyg',
    group: 'Deltagare',
    available: (game) => Boolean(game.facilitatorTools?.length),
  },
  {
    id: 'participantMock',
    label: 'Deltagarvy (mock)',
    group: 'Deltagare',
    available: (game) => game.playMode === 'participants',
  },
  { id: 'cta', label: 'CTA-knappar', group: 'Sidebar' },
  { id: 'quickFacts', label: 'Snabbfakta', group: 'Sidebar' },
  { id: 'requirements', label: 'Krav för spel', group: 'Sidebar' },
  { id: 'downloads', label: 'Nerladdningar', group: 'Sidebar' },
  { id: 'hostActions', label: 'Host actions', group: 'Sidebar', available: (game) => Boolean(game.hostActions?.length) },
  { id: 'metadata', label: 'Metadata', group: 'Sidebar' },
]

const sectionGroups = sectionDefinitions.reduce(
  (acc, section) => {
    acc[section.group] ??= []
    acc[section.group].push(section)
    return acc
  },
  {} as Record<SectionDefinition['group'], SectionDefinition[]>
)

const defaultVisibility = sectionDefinitions.reduce(
  (acc, section) => {
    acc[section.id] = true
    return acc
  },
  {} as Record<SectionId, boolean>
)

const sectionGroupOrder: SectionDefinition['group'][] = ['Intro', 'Innehåll', 'Flöde', 'Deltagare', 'Sidebar']

const STORAGE_KEY_VISIBILITY = 'sandbox-game-detail:visibility'
const STORAGE_KEY_SELECTED = 'sandbox-game-detail:selected'

const playModeConfig: Record<PlayMode, { label: string; border: string; badge: string; hero: string }> = {
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
}

const displayModeLabels = {
  instant: 'Direkt',
  typewriter: 'Skrivmaskin',
  dramatic: 'Dramatik',
} as const

const basicExample: GameExample = {
  id: 'basic',
  playMode: 'basic',
  title: 'Skattjakt Mini',
  subtitle: 'Snabbstart för energifylld uppdragslek',
  shortDescription:
    'En snabb skattjakt med tydliga steg. Perfekt när du vill komma igång direkt utan extra rekvisita.',
  description:
    'Leken är byggd för att ge mycket upplevelse med minimal setup. Den fungerar både inne och ute och kan skalas upp eller ner.',
  coverImage: '/avatars/greenmoss.png',
  gallery: ['/avatars/greenmoss.png', '/avatars/greygravel.png', '/avatars/redmagma.png'],
  tags: ['Snabbstart', 'Skattjakt', 'Uppdrag', 'Utomhus', 'Samarbete'],
  status: ['Publicerad', 'Klar att spela'],
  highlights: ['Steg för steg', 'Kort förberedelse', 'Låg tröskel', 'Passar i alla miljöer'],
  quickFacts: [
    { label: 'Tid', value: '20-30 min', icon: ClockIcon },
    { label: 'Deltagare', value: '4-12', icon: UsersIcon },
    { label: 'Ålder', value: '6-12 år', icon: UserIcon },
    { label: 'Energi', value: 'Medel', icon: BoltIcon },
    { label: 'Plats', value: 'Inne/ute', icon: MapPinIcon },
    { label: 'Svårighet', value: 'Lätt', icon: SparklesIcon },
  ],
  requirements: ['Papper och pennor', '4-6 stationer i rummet', 'Klocka eller timer'],
  outcomes: ['Samarbete under tidspress', 'Problemlösning och logik', 'Rörelse och orientering'],
  accessibility: ['Kan spelas i sittande format', 'Alternativa uppdrag utan spring', 'Tydliga ikoner på ledtrådskort'],
  safety: ['Markera gränser för området', 'Undvik trånga passager', 'Ha en vuxen på varje station vid behov'],
  materials: [
    { label: 'Ledtrådskort', detail: '8 st, laminerade' },
    { label: 'Skattpåse', detail: '1 st, målstation' },
    { label: 'Kartblad', detail: '1 per lag' },
    { label: 'Poängmarkörer', detail: 'Enkla klisterlappar' },
  ],
  preparation: ['Skriv ut kartor och ledtrådar', 'Placera ledtrådskort på 4-6 stationer', 'Testa tidsramen med ett provlag'],
  downloads: ['Ledtrådskort A4', 'Karta och stationsskyltar', 'Snabbguide för ledare'],
  steps: [
    {
      title: 'Kickoff och regler',
      body: 'Presentera uppdraget och gör en snabb genomgång av området.',
      duration: '5 min',
      leaderScript: 'Samla lagen, visa kartan och peka ut startpunkten.',
      display: 'instant',
    },
    {
      title: 'Första ledtråden',
      body: 'Varje lag får ett kort som leder till nästa station.',
      duration: '4 min',
      participantPrompt: 'Hitta platsen på kartan och spring tillsammans.',
      display: 'typewriter',
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
      display: 'dramatic',
    },
    {
      title: 'Uppsamling',
      body: 'Fira vinnare och lyft bra samarbete.',
      duration: '3 min',
      leaderScript: 'Ställ två reflektionsfrågor och tacka alla.',
    },
  ],
  variants: ['Kort version: ta bort en station och kapa till 15 min', 'Inomhus: byt stationer till bord med uppdrag', 'Stor grupp: kör stafett och räkna totalpoäng'],
  reflections: ['Vad gjorde laget mest effektivt?', 'När samarbetade ni som bäst?', 'Vad skulle ni förbättra nästa gång?'],
  meta: {
    gameKey: 'skattjakt-mini',
    version: 'v1.3',
    updatedAt: '2025-01-10',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
}

const facilitatedExample: GameExample = {
  id: 'facilitated',
  playMode: 'facilitated',
  title: 'Workshop: Samarbetslabbet',
  subtitle: 'Ledd aktivitet med faser, timer och gemensam reflektion',
  shortDescription:
    'Ledd aktivitet med faser och tidtagning. Bygg teamkänsla med tydliga instruktioner och checkpoints.',
  description:
    'Workshopen är framtagen för ledare som vill ha en styrd process. Varje fas har ett tydligt mål, en tidsram och ett reflektionsblock.',
  coverImage: '/avatars/turqwave.png',
  gallery: ['/avatars/turqwave.png', '/avatars/rainbowheaven.png', '/avatars/greygravel.png'],
  tags: ['Workshop', 'Faser', 'Ledare', 'Teamwork', 'Reflektion'],
  status: ['Publicerad', 'Testad i 3 skolor', 'Facilitator v2'],
  highlights: ['Fasplan', 'Ledarmanus', 'Digital timer', 'Publik tavla', 'Checkpoints'],
  quickFacts: [
    { label: 'Tid', value: '45-60 min', icon: ClockIcon },
    { label: 'Deltagare', value: '6-24', icon: UsersIcon },
    { label: 'Ålder', value: '8-16 år', icon: UserIcon },
    { label: 'Energi', value: 'Mellan-hög', icon: BoltIcon },
    { label: 'Miljö', value: 'Inne', icon: MapPinIcon },
    { label: 'Svårighet', value: 'Medel', icon: SparklesIcon },
  ],
  requirements: ['Whiteboard eller stor skärm', 'Post-it och pennor', 'Timer i appen', 'Fritt golvutrymme'],
  outcomes: ['Samarbete och rollfördelning', 'Kommunikation och feedback', 'Iterativt lärande'],
  accessibility: ['Faser kan kortas ner', 'Stöd för tyst deltagande', 'Skrivna instruktioner + visuellt stöd'],
  safety: ['Tydlig gruppindelning', 'Säker stopp-signal', 'Lugn zon vid behov'],
  materials: [
    { label: 'Post-it', detail: '3 färger, 1 block per lag' },
    { label: 'Timer', detail: 'Digital nedräkning per fas' },
    { label: 'Byggmaterial', detail: 'Sugrör, tejp, sax' },
    { label: 'Reflektionskort', detail: '10 st, blandade teman' },
  ],
  preparation: ['Ladda ner fasplanen', 'Sätt upp tre stationer i rummet', 'Testa timern och checkpointerna'],
  downloads: ['Fasplan PDF', 'Ledarmanus', 'Tavla-mallar', 'Utvärderingsformulär'],
  steps: [
    {
      title: 'Introduktion och målbild',
      body: 'Sätt ramarna och visa dagens utmaning på tavlan.',
      duration: '7 min',
      leaderScript: 'Fokusera på vad som ska vara klart efter varje fas.',
      display: 'instant',
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
      display: 'typewriter',
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
      display: 'dramatic',
    },
  ],
  variants: ['Förkorta till 30 min genom att kapa fas 2', 'Utomhusvariant med flyttbara stationer', 'Större grupp: lägg till en parallelldemo'],
  reflections: ['Vad fungerade bäst i samarbetet?', 'Vilket beslut gav mest effekt?', 'Vad skulle ni göra annorlunda nästa gång?'],
  phases: [
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
  ],
  boardWidgets: [
    { title: 'Teamstatus', detail: 'Liveindikator för varje lag' },
    { title: 'Tid kvar', detail: 'Nedräkning per fas' },
    { title: 'Målbild', detail: 'Vad ska levereras?' },
    { title: 'Checkpoints', detail: 'Markerade milstolpar' },
  ],
  checkpoints: ['Alla grupper har en plan', 'Minst en prototyp klar', 'Reflektionsrunda avslutad'],
  facilitatorTools: ['Live timer', 'Fasbyte-knapp', 'Snabbmeddelanden', 'Tyst läge'],
  hostActions: ['Förläng fas', 'Lås upp nästa steg', 'Markera checkpoint'],
  meta: {
    gameKey: 'samarbetslabbet',
    version: 'v2.0',
    updatedAt: '2025-01-12',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
}

const participantsExample: GameExample = {
  id: 'participants',
  playMode: 'participants',
  title: 'Mysterie: Försvunnen kod',
  subtitle: 'Deltagarlek med roller, privata instruktioner och publik tavla',
  shortDescription:
    'Deltagarlek med hemliga uppdrag, publik tavla och live-omröstningar. Perfekt för roller och spänning.',
  description:
    'Mysterie som körs i tre rundor. Varje deltagare får en roll med privata instruktioner och hemliga kort som påverkar gruppens val.',
  coverImage: '/avatars/pinksky.png',
  gallery: ['/avatars/pinksky.png', '/avatars/deepspace.png', '/avatars/redmagma.png'],
  tags: ['Mysterium', 'Roller', 'Publik tavla', 'Live', 'Digital', 'Förtroende'],
  status: ['Publicerad', 'Scenariotest', 'Version 3.1'],
  highlights: ['Roller och hemliga kort', 'Publik tavla', 'Live-omröstningar', 'Artefakter', 'Triggers'],
  quickFacts: [
    { label: 'Tid', value: '60-90 min', icon: ClockIcon },
    { label: 'Deltagare', value: '8-20', icon: UsersIcon },
    { label: 'Ålder', value: '12-18 år', icon: UserIcon },
    { label: 'Energi', value: 'Hög', icon: BoltIcon },
    { label: 'Plats', value: 'Inne', icon: MapPinIcon },
    { label: 'Svårighet', value: 'Hög', icon: SparklesIcon },
  ],
  requirements: ['Mobil per deltagare', 'Stor skärm', 'Stabilt internet', 'Ljudsignal', 'Kortlek eller tokens'],
  outcomes: ['Rollspel och empati', 'Beslutsfattande under osäkerhet', 'Gemensam problemlösning'],
  accessibility: ['Flera svårighetsnivåer', 'Text + ikon i alla promptar', 'Möjlighet till tyst roll'],
  safety: ['Samtycke till rollspel', 'Avsluta roll med säkerhetsord', 'Debrief obligatorisk'],
  materials: [
    { label: 'Rollkort', detail: '1 per deltagare' },
    { label: 'Hemliga kuvert', detail: '6 st, artefakter' },
    { label: 'Kodfragment', detail: '3 st fysiska ledtrådar' },
    { label: 'Publik tavla', detail: 'Digital projektion' },
  ],
  preparation: ['Dela ut roller och hemliga kort', 'Testa uppkoppling och live-omröstningar', 'Placera artefakter i rummet', 'Sätt upp publik tavla'],
  downloads: ['Rollkort PDF', 'Publik tavla mall', 'Mysteriepaket', 'Ledarmanus'],
  steps: [
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
      display: 'typewriter',
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
      display: 'dramatic',
    },
    {
      title: 'Debrief',
      body: 'Avsluta med reflektionsfrågor och rollavslut.',
      duration: '8 min',
      leaderScript: 'Separera roll och person, lyft insikter.',
    },
  ],
  variants: ['Kortare version: hoppa över runda 2', 'Fler roller med sidouppdrag', 'Analog variant utan mobil (röstning via kort)'],
  reflections: ['Vem litade ni på och varför?', 'Vilken ledtråd var avgörande?', 'Hur kändes det att ha hemlig info?'],
  phases: [
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
  ],
  boardWidgets: [
    { title: 'Misstankekarta', detail: 'Publik karta med ledtrådar och roller' },
    { title: 'Tidslinje', detail: 'Händelser i realtid' },
    { title: 'Kodpanel', detail: 'Samlade kodfragment och gissningar' },
    { title: 'Röstningar', detail: 'Resultat från deltagarval' },
  ],
  roles: [
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
  ],
  artifacts: [
    { title: 'Kodfragment A', type: 'Fysisk', use: 'Kopplas till tidslinjen', access: 'Runda 1' },
    { title: 'Privat kortlek', type: 'Digital', use: 'Skickas till varje roll', access: 'Vid start' },
    { title: 'Låst kuvert', type: 'Fysisk', use: 'Öppnas efter röstning 1', access: 'Trigger' },
    { title: 'Publik ledtråd', type: 'Board', use: 'Visas för alla efter 20 min', access: 'Automatisk' },
  ],
  triggers: [
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
  ],
  decisions: [
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
  ],
  facilitatorTools: ['Rollpanel', 'Triggerkontroller', 'Live-omröstning', 'Privata meddelanden', 'Debrief-kort'],
  hostActions: ['Starta röstning', 'Lås upp artefakt', 'Skicka hemlig ledtråd'],
  meta: {
    gameKey: 'mysterie-forsvunnen-kod',
    version: 'v3.1',
    updatedAt: '2025-01-15',
    owner: 'Lekbanken',
    locale: 'sv-SE',
  },
}

const gameExamples = [basicExample, facilitatedExample, participantsExample]

type SectionCardProps = {
  title: string
  icon?: IconType
  description?: string
  children?: ReactNode
  className?: string
}

function SectionCard({ title, icon: Icon, description, children, className }: SectionCardProps) {
  return (
    <section className={cn('rounded-2xl border border-border/60 bg-background p-4 sm:p-5', className)}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function PillList({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} size="sm" className={cn('border-0 bg-muted/60 text-muted-foreground', className)}>
          {item}
        </Badge>
      ))}
    </div>
  )
}

function FactList({ facts }: { facts: Fact[] }) {
  return (
    <div className="space-y-2">
      {facts.map((fact) => {
        const Icon = fact.icon
        return (
          <div key={fact.label} className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
            <Icon className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {fact.label}
              </p>
              <p className="text-sm font-semibold text-foreground">{fact.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KeyValueList({ items }: { items: { label: string; detail: string }[] }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
          <span className="font-semibold text-foreground">{item.label}</span>
          <span className="text-right">{item.detail}</span>
        </div>
      ))}
    </div>
  )
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const displayLabel = step.display ? displayModeLabels[step.display] : null
        return (
          <div key={`${step.title}-${index}`} className="rounded-xl border border-border/60 bg-muted/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.duration}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayLabel ? (
                  <Badge size="sm" className="border-0 bg-primary/10 text-primary">
                    {displayLabel}
                  </Badge>
                ) : null}
                {step.optional ? (
                  <Badge size="sm" className="border-0 bg-muted/60 text-muted-foreground">
                    Valfri
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            {step.leaderScript ? (
              <div className="mt-2 flex gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                <MegaphoneIcon className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">Ledarmanus:</span> {step.leaderScript}
                </span>
              </div>
            ) : null}
            {step.participantPrompt ? (
              <div className="mt-2 flex gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                <ChatBubbleLeftRightIcon className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">Deltagarprompt:</span> {step.participantPrompt}
                </span>
              </div>
            ) : null}
            {step.boardText ? (
              <div className="mt-2 flex gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                <Squares2X2Icon className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  <span className="font-semibold text-foreground">Publik tavla:</span> {step.boardText}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function PhaseList({ phases }: { phases: Phase[] }) {
  return (
    <div className="space-y-3">
      {phases.map((phase, index) => (
        <div key={`${phase.title}-${index}`} className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {index + 1}. {phase.title}
              </p>
              <p className="text-xs text-muted-foreground">{phase.goal}</p>
            </div>
            <Badge size="sm" className="border-0 bg-muted/60 text-muted-foreground">
              {phase.duration}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Facilitator:</span> {phase.facilitator}
          </div>
          {phase.board ? (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Publik tavla:</span> {phase.board}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {phase.outputs.map((output) => (
              <Badge key={output} size="sm" className="border-0 bg-primary/10 text-primary">
                {output}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BoardPreview({ items }: { items: BoardWidget[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/70 via-muted/30 to-background p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border border-border/60 bg-background/90 p-3">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleGrid({ roles }: { roles: Role[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roles.map((role) => (
        <div key={role.name} className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{role.name}</p>
            <Badge size="sm" className="border-0 bg-primary/10 text-primary">
              {role.count} st
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Offentligt:</span> {role.publicNote}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Privat:</span> {role.privateNote}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {role.secrets.map((secret) => (
              <Badge key={secret} size="sm" className="border-0 bg-muted/60 text-muted-foreground">
                {secret}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ArtifactGrid({ artifacts }: { artifacts: Artifact[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {artifacts.map((artifact) => (
        <div key={artifact.title} className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{artifact.title}</p>
            <Badge size="sm" className="border-0 bg-primary/10 text-primary">
              {artifact.type}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{artifact.use}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tillgäng:</span> {artifact.access}
          </p>
        </div>
      ))}
    </div>
  )
}

function TriggerList({ triggers }: { triggers: Trigger[] }) {
  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <div key={trigger.title} className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">{trigger.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Villkor:</span> {trigger.condition}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Effekt:</span> {trigger.effect}
          </p>
        </div>
      ))}
    </div>
  )
}

function DecisionList({ decisions }: { decisions: Decision[] }) {
  return (
    <div className="space-y-3">
      {decisions.map((decision) => (
        <div key={decision.title} className="rounded-xl border border-border/60 bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">{decision.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{decision.prompt}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {decision.options.map((option) => (
              <Badge key={option} size="sm" className="border-0 bg-muted/60 text-muted-foreground">
                {option}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Resultat:</span> {decision.resolution}
          </p>
        </div>
      ))}
    </div>
  )
}

function MetadataList({ meta }: { meta: GameExample['meta'] }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>Spel-ID</span>
        <span className="font-semibold text-foreground">{meta.gameKey}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Version</span>
        <span className="font-semibold text-foreground">{meta.version}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Uppdaterad</span>
        <span className="font-semibold text-foreground">{meta.updatedAt}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Owner</span>
        <span className="font-semibold text-foreground">{meta.owner}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Locale</span>
        <span className="font-semibold text-foreground">{meta.locale}</span>
      </div>
    </div>
  )
}

export default function GameDetailSandbox() {
  const [visibilityByExample, setVisibilityByExample] = useState<Record<string, Record<SectionId, boolean>>>(() => {
    const initial: Record<string, Record<SectionId, boolean>> = {}
    gameExamples.forEach((game) => {
      initial[game.id] = { ...defaultVisibility }
    })
    return initial
  })
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [savedAtByExample, setSavedAtByExample] = useState<Record<string, string>>({})

  useEffect(() => {
    const storedVisibility = window.localStorage.getItem(STORAGE_KEY_VISIBILITY)
    if (storedVisibility) {
      try {
        const parsed = JSON.parse(storedVisibility) as Record<string, Partial<Record<SectionId, boolean>>>
        setVisibilityByExample(() => {
          const merged: Record<string, Record<SectionId, boolean>> = {}
          gameExamples.forEach((game) => {
            merged[game.id] = { ...defaultVisibility, ...(parsed[game.id] ?? {}) }
          })
          return merged
        })
      } catch {
        // Ignore malformed local storage.
      }
    }

    const storedSelected = window.localStorage.getItem(STORAGE_KEY_SELECTED)
    if (storedSelected) {
      setSelectedExampleId(storedSelected)
    }
  }, [])

  const handleToggle = (exampleId: string, sectionId: SectionId) => {
    setVisibilityByExample((prev) => ({
      ...prev,
      [exampleId]: {
        ...(prev[exampleId] ?? defaultVisibility),
        [sectionId]: !(prev[exampleId] ?? defaultVisibility)[sectionId],
      },
    }))
  }

  const handleSaveExample = (exampleId: string) => {
    const timestamp = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    setSelectedExampleId(exampleId)
    setSavedAtByExample((prev) => ({ ...prev, [exampleId]: timestamp }))
    window.localStorage.setItem(STORAGE_KEY_SELECTED, exampleId)
    window.localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(visibilityByExample))
  }

  return (
    <SandboxShell
      moduleId="app-game-detail"
      title="Game Detail / Lek"
      description="Detaljvy för lek, fullspeckad för tre spellägen i sandboxen."
    >
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">App Sandbox</p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Lekdetalj för tre spellägen</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Fullspeckade exempel för att välja vilka element som ska följa med till produktion.
          </p>
        </header>

        <div className="space-y-8">
          {gameExamples.map((game) => {
            const meta = playModeConfig[game.playMode]
            const visibility = visibilityByExample[game.id] ?? defaultVisibility
            const isSelected = selectedExampleId === game.id
            const savedAt = savedAtByExample[game.id]

            return (
              <div key={game.id} className="space-y-4">
                <Card className="border border-dashed border-border/70 bg-muted/30 shadow-sm">
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Panel</p>
                        <h3 className="text-lg font-semibold text-foreground">Visa/Dölj sektioner</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Slå på eller av delar för att forma ditt favoritexempel.
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <Button size="sm" onClick={() => handleSaveExample(game.id)}>
                          Spara exempel
                        </Button>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {isSelected ? (
                            <Badge size="sm" className="border-0 bg-primary/10 text-primary">
                              Valt exempel
                            </Badge>
                          ) : null}
                          {savedAt ? <span>Senast sparad {savedAt}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {sectionGroupOrder.map((group) => (
                        <div key={group} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {group}
                          </p>
                          <div className="space-y-2">
                            {sectionGroups[group].map((section) => {
                              const isAvailable = section.available ? section.available(game) : true
                              const isVisible = visibility[section.id]

                              return (
                                <div
                                  key={section.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{section.label}</p>
                                    {!isAvailable ? (
                                      <p className="text-xs text-muted-foreground">Saknas i exemplet</p>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {isVisible ? 'Visa' : 'Dölj'}
                                    </span>
                                    <Switch
                                      checked={isAvailable ? isVisible : false}
                                      onCheckedChange={() => handleToggle(game.id, section.id)}
                                      disabled={!isAvailable}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn('border-2 bg-card shadow-sm', meta.border)}>
                  <CardContent className="space-y-6 p-4 sm:p-6 lg:p-8">
                    {visibility.intro ? (
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Lek</p>
                          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{game.title}</h2>
                          <p className="mt-2 text-sm text-muted-foreground">{game.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge size="sm" className={cn('border-0', meta.badge)}>
                            {meta.label}
                          </Badge>
                          {game.status.map((item) => (
                            <Badge key={item} size="sm" className="border-0 bg-muted/60 text-muted-foreground">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {visibility.tags ? (
                      <div className="flex flex-wrap gap-2">
                        {game.tags.map((tag) => (
                          <Badge key={tag} size="sm" className="border-0 bg-muted/60 text-muted-foreground">
                            {tag}
                          </Badge>
                        ))}
                        {game.highlights.map((highlight) => (
                          <Badge key={highlight} size="sm" className="border-0 bg-primary/10 text-primary">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {visibility.cover ? (
                      <div className="relative overflow-hidden rounded-2xl border border-border/60">
                        <Image
                          src={game.coverImage}
                          alt={`${game.title} cover`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 70vw"
                          priority
                        />
                        <div className={cn('absolute inset-0 bg-gradient-to-br', meta.hero)} />
                        <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground">
                              Omslagsbild
                            </div>
                            <Badge size="sm" className="border-0 bg-background/80 text-muted-foreground">
                              Cover
                            </Badge>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-background/90 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Kort sammanfattning
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">{game.shortDescription}</p>
                            </div>
                            <div className="rounded-2xl bg-background/90 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Nyckelupplevelse
                              </p>
                              <BulletList items={game.outcomes} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-6">
                        {visibility.about ? (
                          <SectionCard title="Om leken" icon={BookOpenIcon}>
                            <p className="text-sm text-muted-foreground leading-relaxed">{game.description}</p>
                          </SectionCard>
                        ) : null}

                        {visibility.experience ? (
                          <SectionCard title="Spelupplevelse" icon={SparklesIcon}>
                            <PillList items={game.highlights} className="bg-primary/10 text-primary" />
                          </SectionCard>
                        ) : null}

                        {visibility.gallery ? (
                          <SectionCard title="Bildgalleri" icon={EyeIcon}>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {game.gallery.map((image, index) => (
                                <div
                                  key={`${image}-${index}`}
                                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60"
                                >
                                  <Image
                                    src={image}
                                    alt={`${game.title} gallery ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                  />
                                </div>
                              ))}
                            </div>
                          </SectionCard>
                        ) : null}

                        {visibility.materials ? (
                          <SectionCard title="Material" icon={WrenchScrewdriverIcon}>
                            <KeyValueList items={game.materials} />
                          </SectionCard>
                        ) : null}

                        {visibility.preparation ? (
                          <SectionCard title="Förberedelser" icon={ClipboardDocumentListIcon}>
                            <BulletList items={game.preparation} />
                          </SectionCard>
                        ) : null}

                        {visibility.phases && game.phases ? (
                          <SectionCard title="Fasplan" icon={ListBulletIcon}>
                            <PhaseList phases={game.phases} />
                          </SectionCard>
                        ) : null}

                        {visibility.steps ? (
                          <SectionCard title="Steg för steg" icon={PlayIcon}>
                            <StepList steps={game.steps} />
                          </SectionCard>
                        ) : null}

                        {visibility.board && game.boardWidgets ? (
                          <SectionCard title="Publik tavla" icon={Squares2X2Icon}>
                            <BoardPreview items={game.boardWidgets} />
                          </SectionCard>
                        ) : null}

                        {visibility.checkpoints && game.checkpoints ? (
                          <SectionCard title="Checkpoints" icon={FlagIcon}>
                            <BulletList items={game.checkpoints} />
                          </SectionCard>
                        ) : null}

                        {visibility.roles && game.roles ? (
                          <SectionCard title="Roller" icon={UserGroupIcon}>
                            <RoleGrid roles={game.roles} />
                          </SectionCard>
                        ) : null}

                        {visibility.artifacts && game.artifacts ? (
                          <SectionCard title="Artefakter" icon={PuzzlePieceIcon}>
                            <ArtifactGrid artifacts={game.artifacts} />
                          </SectionCard>
                        ) : null}

                        {visibility.triggers && game.triggers ? (
                          <SectionCard title="Triggers" icon={BellAlertIcon}>
                            <TriggerList triggers={game.triggers} />
                          </SectionCard>
                        ) : null}

                        {visibility.decisions && game.decisions ? (
                          <SectionCard title="Omröstningar och beslut" icon={ChatBubbleLeftRightIcon}>
                            <DecisionList decisions={game.decisions} />
                          </SectionCard>
                        ) : null}

                        {visibility.facilitatorTools && game.facilitatorTools ? (
                          <SectionCard title="Facilitatorverktyg" icon={MegaphoneIcon}>
                            <PillList items={game.facilitatorTools} className="bg-muted/80 text-muted-foreground" />
                          </SectionCard>
                        ) : null}

                        {visibility.participantMock && game.playMode === 'participants' ? (
                          <SectionCard title="Deltagarvy (mock)" icon={EyeIcon}>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Privat uppdrag
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Skydda kodfragmentet och styr gruppen mot rätt slutval.
                                </p>
                                <Badge size="sm" className="mt-2 border-0 bg-primary/10 text-primary">
                                  Hemligt
                                </Badge>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Live omröstning
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Välj två spelare du litar på innan finalen.
                                </p>
                                <Badge size="sm" className="mt-2 border-0 bg-muted/60 text-muted-foreground">
                                  30 sek
                                </Badge>
                              </div>
                            </div>
                          </SectionCard>
                        ) : null}

                        {visibility.safety ? (
                          <SectionCard title="Säkerhet och inkludering" icon={ShieldCheckIcon}>
                            <BulletList items={game.safety} />
                          </SectionCard>
                        ) : null}

                        {visibility.accessibility ? (
                          <SectionCard title="Tillgänglighet" icon={LightBulbIcon}>
                            <BulletList items={game.accessibility} />
                          </SectionCard>
                        ) : null}

                        {visibility.variants ? (
                          <SectionCard title="Varianter" icon={BeakerIcon}>
                            <BulletList items={game.variants} />
                          </SectionCard>
                        ) : null}

                        {visibility.reflection ? (
                          <SectionCard title="Reflektion" icon={StarIcon}>
                            <BulletList items={game.reflections} />
                          </SectionCard>
                        ) : null}
                      </div>

                      <aside className="space-y-4">
                        {visibility.cta ? (
                          <div className="grid gap-2">
                            <Button className="h-11 w-full text-base font-semibold">Starta leken</Button>
                            <Button variant="outline" className="h-10 w-full">
                              Lägg till i plan
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" className="h-10">
                                Spara
                              </Button>
                              <Button variant="outline" className="h-10">
                                Dela
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {visibility.quickFacts ? (
                          <SectionCard title="Snabbfakta" icon={InformationCircleIcon}>
                            <FactList facts={game.quickFacts} />
                          </SectionCard>
                        ) : null}

                        {visibility.requirements ? (
                          <SectionCard title="Krav för spel" icon={WrenchScrewdriverIcon}>
                            <BulletList items={game.requirements} />
                          </SectionCard>
                        ) : null}

                        {visibility.downloads ? (
                          <SectionCard title="Nerladdningar" icon={DocumentArrowDownIcon}>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {game.downloads.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2"
                                >
                                  <span>{item}</span>
                                  <DocumentArrowDownIcon className="h-4 w-4 text-primary" />
                                </li>
                              ))}
                            </ul>
                          </SectionCard>
                        ) : null}

                        {visibility.hostActions && game.hostActions ? (
                          <SectionCard title="Host actions" icon={MegaphoneIcon}>
                            <PillList items={game.hostActions} className="bg-muted/80 text-muted-foreground" />
                          </SectionCard>
                        ) : null}

                        {visibility.metadata ? (
                          <SectionCard title="Metadata" icon={InformationCircleIcon}>
                            <MetadataList meta={game.meta} />
                          </SectionCard>
                        ) : null}
                      </aside>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </SandboxShell>
  )
}


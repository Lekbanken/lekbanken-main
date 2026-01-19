/**
 * Mock Data for Play Sandbox
 *
 * Provides realistic mock data for testing play mode components.
 * Used across all play sandbox pages.
 */

import type { GameSnapshotData, SnapshotStep, SnapshotPhase, SnapshotRole, SnapshotArtifact, SnapshotTrigger, SnapshotBoardConfig } from '@/types/game-snapshot';
import type { PlaySessionData, StepInfo, PhaseInfo } from '@/features/play/api/session-api';
import type { SessionRole } from '@/types/play-runtime';
import type { SessionTrigger } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Snapshot Data (for capabilities detection)
// =============================================================================

const MOCK_STEPS: SnapshotStep[] = [
  {
    step_order: 0,
    title: 'Välkommen till äventyret',
    body: 'Samla alla deltagare i en ring. Förklara att ni ska ge er ut på ett mysterium som kräver samarbete och kreativt tänkande.',
    duration_seconds: 180,
    leader_script: 'Hälsa alla välkomna. Kontrollera att alla kan se och höra dig. Fråga om någon har frågor innan vi börjar.',
    participant_prompt: 'Lyssna noga på instruktionerna.',
    board_text: '🎭 Välkommen till Mysteriet',
    optional: false,
  },
  {
    step_order: 1,
    title: 'Rollfördelning',
    body: 'Dela ut rollkort till varje deltagare. Ge dem 2 minuter att läsa sina hemliga instruktioner.',
    duration_seconds: 120,
    leader_script: 'Dela ut korten med framsidan nedåt. Påminn om att inte visa sina kort för varandra.',
    participant_prompt: 'Läs ditt rollkort noggrant. Memorera din hemliga uppgift.',
    board_text: '🎴 Rollkorten delas ut...',
    optional: false,
  },
  {
    step_order: 2,
    title: 'Första ledtråden',
    body: 'Presentera den första ledtråden för gruppen. Det är en gåta som leder till nästa plats.',
    duration_seconds: 300,
    leader_script: 'Läs gåtan högt och långsamt. Ge gruppen tid att diskutera.',
    participant_prompt: 'Lös gåtan tillsammans med ditt team.',
    board_text: '🔍 "I mörkret finns ljus, i tystnaden finns svar..."',
    optional: false,
  },
  {
    step_order: 3,
    title: 'Kodlåset',
    body: 'Gruppen måste knäcka en fyrsiffrig kod för att öppna lådan med nästa ledtråd.',
    duration_seconds: 240,
    leader_script: 'Visa kodlåset. Påminn om att ledtrådarna de hittat innehåller siffrorna.',
    participant_prompt: 'Använd ledtrådarna för att hitta koden!',
    board_text: '🔐 Knäck koden: _ _ _ _',
    optional: false,
  },
  {
    step_order: 4,
    title: 'Den stora avslöjanden',
    body: 'Samla gruppen för den stora avslutningen. Avslöja mysteriet och diskutera lösningen.',
    duration_seconds: 300,
    leader_script: 'Bygg upp spänningen innan avslöjandet. Låt deltagarna gissa först.',
    participant_prompt: 'Vem tror du är skyldig?',
    board_text: '✨ Sanningen avslöjas...',
    optional: false,
  },
];

const MOCK_PHASES: SnapshotPhase[] = [
  {
    phase_order: 0,
    name: 'Introduktion',
    phase_type: 'intro',
    duration_seconds: 300,
    timer_visible: true,
    timer_style: 'countdown',
    description: 'Välkomna deltagarna och förklara reglerna',
    board_message: '🎬 Förbered er för äventyret!',
    auto_advance: false,
  },
  {
    phase_order: 1,
    name: 'Utforskning',
    phase_type: 'activity',
    duration_seconds: 900,
    timer_visible: true,
    timer_style: 'countdown',
    description: 'Sök efter ledtrådar och lös gåtor',
    board_message: '🔍 Sök efter ledtrådar!',
    auto_advance: false,
  },
  {
    phase_order: 2,
    name: 'Slutspurt',
    phase_type: 'climax',
    duration_seconds: 600,
    timer_visible: true,
    timer_style: 'urgent',
    description: 'Samla alla ledtrådar och lös mysteriet',
    board_message: '⏰ Tiden rinner ut!',
    auto_advance: false,
  },
  {
    phase_order: 3,
    name: 'Avslutning',
    phase_type: 'outro',
    duration_seconds: 300,
    timer_visible: false,
    timer_style: 'hidden',
    description: 'Avslöja lösningen och reflektera',
    board_message: '🎉 Mysteriet är löst!',
    auto_advance: false,
  },
];

const MOCK_ROLES: SnapshotRole[] = [
  {
    role_order: 0,
    name: 'Detektiven',
    icon: '🔍',
    color: 'blue',
    public_description: 'Leder utredningen och ställer frågor',
    private_instructions: 'Du har tillgång till polisens hemliga rapport. Dela inte innehållet förrän du är säker på vem som är skyldig.',
    private_hints: 'Titta noga på tidpunkterna i rapporten.',
    min_count: 1,
    max_count: 1,
    assignment_strategy: 'manual',
    scaling_rules: null,
    conflicts_with: [],
  },
  {
    role_order: 1,
    name: 'Den misstänkte',
    icon: '🕵️',
    color: 'red',
    public_description: 'Har hemligheter att dölja',
    private_instructions: 'Du var på platsen vid brottet, men du är oskyldig. Försök bevisa din oskuld utan att avslöja vad du egentligen gjorde där.',
    private_hints: 'Du har ett alibi - din syster kan bekräfta.',
    min_count: 1,
    max_count: 2,
    assignment_strategy: 'manual',
    scaling_rules: null,
    conflicts_with: ['detective'],
  },
  {
    role_order: 2,
    name: 'Vittnet',
    icon: '👁️',
    color: 'green',
    public_description: 'Såg något viktigt',
    private_instructions: 'Du såg en skugga fly från platsen. Du är inte säker på vem det var, men du tror att personen bar något blått.',
    private_hints: 'Beskriv vad du såg i detalj om någon frågar.',
    min_count: 1,
    max_count: 3,
    assignment_strategy: 'random',
    scaling_rules: null,
    conflicts_with: [],
  },
  {
    role_order: 3,
    name: 'Journalisten',
    icon: '📰',
    color: 'purple',
    public_description: 'Söker sanningen för en artikel',
    private_instructions: 'Du har tillgång till gamla tidningsklipp som kan vara relevanta. Dela dem strategiskt.',
    private_hints: 'Klippet från 1985 är nyckeln.',
    min_count: 0,
    max_count: 1,
    assignment_strategy: 'opt-in',
    scaling_rules: null,
    conflicts_with: [],
  },
];

const MOCK_ARTIFACTS: SnapshotArtifact[] = [
  {
    artifact_order: 0,
    title: 'Den hemliga boken',
    description: 'En gammal bok med kodade meddelanden',
    artifact_type: 'document',
    locale: 'sv',
    tags: ['clue', 'important'],
    metadata: { pages: 12, condition: 'worn' },
  },
  {
    artifact_order: 1,
    title: 'Kodlåset',
    description: 'Ett fyrsiffrigt kombinationslås',
    artifact_type: 'keypad',
    locale: 'sv',
    tags: ['puzzle', 'interactive'],
    metadata: { code: '1847', maxAttempts: 5 },
  },
  {
    artifact_order: 2,
    title: 'Gåtan',
    description: 'En kryptisk gåta som leder till nästa ledtråd',
    artifact_type: 'riddle',
    locale: 'sv',
    tags: ['puzzle'],
    metadata: { answer: 'biblioteket', hints: ['böcker', 'tystnad'] },
  },
  {
    artifact_order: 3,
    title: 'Kartan',
    description: 'En karta över området med hemliga markeringar',
    artifact_type: 'image',
    locale: 'sv',
    tags: ['clue', 'visual'],
    metadata: { hotspots: 3 },
  },
  {
    artifact_order: 4,
    title: 'Ljud från platsen',
    description: 'En inspelning från brottsplatsen',
    artifact_type: 'audio',
    locale: 'sv',
    tags: ['clue', 'audio'],
    metadata: { duration: 45 },
  },
  {
    artifact_order: 5,
    title: 'Chiffret',
    description: 'Ett kodat meddelande som måste dechiffreras',
    artifact_type: 'cipher',
    locale: 'sv',
    tags: ['puzzle', 'advanced'],
    metadata: { type: 'caesar', shift: 3 },
  },
  {
    artifact_order: 6,
    title: 'Föremål att bekräfta',
    description: 'Fysiskt föremål som ledaren måste bekräfta',
    artifact_type: 'prop',
    locale: 'sv',
    tags: ['physical'],
    metadata: { requiresConfirmation: true },
  },
];

const MOCK_TRIGGERS: SnapshotTrigger[] = [
  {
    sort_order: 0,
    name: 'Välkomstmeddelande',
    description: 'Skickar ett dramatiskt välkomstmeddelande när sessionen startar',
    enabled: true,
    condition_type: 'session_started',
    condition_config: {},
    actions: [
      { type: 'send_message', message: 'Välkommen till Mysteriet!', style: 'dramatic' },
      { type: 'show_countdown', duration: 5, message: 'Äventyret börjar om...' },
    ],
    execute_once: true,
    delay_seconds: 0,
  },
  {
    sort_order: 1,
    name: 'Kodlås löst',
    description: 'Avslöjar nästa ledtråd när kodlåset öppnas',
    enabled: true,
    condition_type: 'keypad_correct',
    condition_config: { keypadId: 'main-lock' },
    actions: [
      { type: 'reveal_artifact', artifactId: 'secret-map' },
      { type: 'send_message', message: 'Utmärkt! Kartan avslöjas...', style: 'success' },
    ],
    execute_once: true,
    delay_seconds: 0,
  },
  {
    sort_order: 2,
    name: 'Fas 2 intro',
    description: 'Spelar upp intro för fas 2',
    enabled: true,
    condition_type: 'phase_started',
    condition_config: { phaseId: 'exploration' },
    actions: [
      { type: 'play_sound', soundId: 'suspense' },
      { type: 'show_story', text: 'Mörkret sänker sig över platsen...' },
    ],
    execute_once: false,
    delay_seconds: 2,
  },
  {
    sort_order: 3,
    name: 'Manuell trigger',
    description: 'Host kan manuellt trigga en händelse',
    enabled: false,
    condition_type: 'manual',
    condition_config: {},
    actions: [{ type: 'advance_step' }],
    execute_once: false,
    delay_seconds: 0,
  },
];

const MOCK_BOARD_CONFIG: SnapshotBoardConfig = {
  show_game_name: true,
  show_current_phase: true,
  show_timer: true,
  show_participants: true,
  show_public_roles: true,
  show_leaderboard: false,
  show_qr_code: true,
  welcome_message: 'Välkommen till Mysteriet på Herrgården!',
  theme: 'dark',
  background_color: '#1a1a2e',
  layout_variant: 'centered',
};

// =============================================================================
// Snapshot Presets (for different play modes)
// =============================================================================

export const BASIC_SNAPSHOT: GameSnapshotData = {
  game: {
    id: 'game-basic-001',
    game_key: 'basic-game',
    name: 'Enkel Grupplek',
    short_description: 'En enkel lek utan faser eller roller',
    description: 'Perfekt för snabba gruppaktiviteter',
    play_mode: 'basic',
    status: 'published',
    locale: 'sv',
    energy_level: 'medium',
    location_type: 'indoor',
    time_estimate_min: 15,
    duration_max: 30,
    min_players: 4,
    max_players: 20,
    players_recommended: 10,
    age_min: 8,
    age_max: null,
    difficulty: 'easy',
    accessibility_notes: null,
    space_requirements: 'Ett rum där alla kan stå i en ring',
    leader_tips: 'Håll energin uppe!',
    main_purpose_id: null,
    product_id: null,
    owner_tenant_id: null,
    cover_media_id: null,
  },
  steps: MOCK_STEPS.slice(0, 3),
  phases: [],
  roles: [],
  artifacts: MOCK_ARTIFACTS.slice(0, 2),
  triggers: [],
  board_config: null,
  snapshot_meta: {
    created_at: new Date().toISOString(),
    game_id: 'game-basic-001',
    version: 1,
  },
};

export const FACILITATED_SNAPSHOT: GameSnapshotData = {
  game: {
    id: 'game-facilitated-001',
    game_key: 'mystery-manor',
    name: 'Mysteriet på Herrgården',
    short_description: 'Ett spännande mysterium för grupper',
    description: 'Lös mysteriet innan tiden rinner ut! Med faser, triggers och dramatiska övergångar.',
    play_mode: 'facilitated',
    status: 'published',
    locale: 'sv',
    energy_level: 'high',
    location_type: 'indoor',
    time_estimate_min: 45,
    duration_max: 90,
    min_players: 6,
    max_players: 30,
    players_recommended: 15,
    age_min: 12,
    age_max: null,
    difficulty: 'medium',
    accessibility_notes: 'Kan anpassas för rullstolsburna',
    space_requirements: 'Flera rum rekommenderas',
    leader_tips: 'Förbered alla material i förväg. Testa triggers innan sessionen.',
    main_purpose_id: null,
    product_id: null,
    owner_tenant_id: null,
    cover_media_id: null,
  },
  steps: MOCK_STEPS,
  phases: MOCK_PHASES,
  roles: [],
  artifacts: MOCK_ARTIFACTS,
  triggers: MOCK_TRIGGERS,
  board_config: MOCK_BOARD_CONFIG,
  snapshot_meta: {
    created_at: new Date().toISOString(),
    game_id: 'game-facilitated-001',
    version: 1,
  },
};

export const PARTICIPANTS_SNAPSHOT: GameSnapshotData = {
  game: {
    id: 'game-participants-001',
    game_key: 'murder-mystery',
    name: 'Mord på Maskeraden',
    short_description: 'Rollspelsmysterium med hemliga roller',
    description: 'Varje deltagare får en unik roll med hemliga mål. Vem är mördaren?',
    play_mode: 'participants',
    status: 'published',
    locale: 'sv',
    energy_level: 'high',
    location_type: 'indoor',
    time_estimate_min: 60,
    duration_max: 120,
    min_players: 8,
    max_players: 20,
    players_recommended: 12,
    age_min: 15,
    age_max: null,
    difficulty: 'hard',
    accessibility_notes: null,
    space_requirements: 'Stort rum eller flera mindre rum',
    leader_tips: 'Låt deltagarna förbereda sig med sina roller innan start.',
    main_purpose_id: null,
    product_id: null,
    owner_tenant_id: null,
    cover_media_id: null,
  },
  steps: MOCK_STEPS,
  phases: MOCK_PHASES,
  roles: MOCK_ROLES,
  artifacts: MOCK_ARTIFACTS,
  triggers: MOCK_TRIGGERS,
  board_config: MOCK_BOARD_CONFIG,
  snapshot_meta: {
    created_at: new Date().toISOString(),
    game_id: 'game-participants-001',
    version: 1,
  },
};

// =============================================================================
// PlaySessionData Builders
// =============================================================================

function snapshotStepToStepInfo(step: SnapshotStep, index: number): StepInfo {
  return {
    id: `step-${index}`,
    index,
    title: step.title,
    description: step.body,
    content: step.body,
    durationMinutes: step.duration_seconds ? Math.ceil(step.duration_seconds / 60) : undefined,
    duration: step.duration_seconds,
    display_mode: 'typewriter',
    leaderScript: step.leader_script ?? undefined,
    materials: [],
    safety: undefined,
    tag: undefined,
    note: undefined,
  };
}

function snapshotPhaseToPhaseInfo(phase: SnapshotPhase, index: number): PhaseInfo {
  return {
    id: `phase-${index}`,
    index,
    name: phase.name,
    description: phase.description ?? undefined,
    duration: phase.duration_seconds,
  };
}

function snapshotRoleToSessionRole(role: SnapshotRole, index: number): SessionRole {
  return {
    id: `role-${index}`,
    session_id: 'mock-session',
    source_role_id: null,
    name: role.name,
    icon: role.icon,
    color: role.color,
    role_order: role.role_order,
    public_description: role.public_description,
    private_instructions: role.private_instructions,
    private_hints: role.private_hints,
    min_count: role.min_count,
    max_count: role.max_count,
    assignment_strategy: role.assignment_strategy as SessionRole['assignment_strategy'],
    scaling_rules: role.scaling_rules as Record<string, number> | null,
    conflicts_with: role.conflicts_with,
    assigned_count: 0,
    created_at: new Date().toISOString(),
  };
}

function snapshotTriggerToSessionTrigger(trigger: SnapshotTrigger, index: number, gameId: string): SessionTrigger {
  // Build a TriggerCondition from snapshot data
  const condition = {
    type: trigger.condition_type,
    ...trigger.condition_config,
  } as TriggerCondition;

  return {
    id: `trigger-${index}`,
    game_id: gameId,
    session_id: 'mock-session',
    source_trigger_id: null,
    name: trigger.name,
    description: trigger.description,
    sort_order: trigger.sort_order,
    enabled: trigger.enabled,
    condition,
    actions: trigger.actions as unknown as TriggerAction[],
    execute_once: trigger.execute_once,
    delay_seconds: trigger.delay_seconds,
    status: trigger.enabled ? 'armed' : 'disabled',
    fired_count: 0,
    fired_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function createMockPlaySessionData(snapshot: GameSnapshotData): PlaySessionData {
  return {
    sessionId: `session-${snapshot.game.id}`,
    gameId: snapshot.game.id,
    gameTitle: snapshot.game.name,
    playMode: snapshot.game.play_mode,
    steps: snapshot.steps.map(snapshotStepToStepInfo),
    phases: snapshot.phases.map(snapshotPhaseToPhaseInfo),
    sessionRoles: snapshot.roles.map(snapshotRoleToSessionRole),
    runtimeState: {
      current_step_index: 0,
      current_phase_index: 0,
      status: 'active',
    },
    boardTheme: snapshot.board_config?.theme as PlaySessionData['boardTheme'],
    tools: [
      { tool_key: 'conversation-cards', enabled: true, scope: 'all' },
      { tool_key: 'timer', enabled: true, scope: 'host' },
      { tool_key: 'dice', enabled: true, scope: 'all' },
    ],
    participantCount: 12,
    snapshotData: snapshot,
  };
}

export function createMockTriggers(snapshot: GameSnapshotData): SessionTrigger[] {
  return snapshot.triggers.map((t, i) => snapshotTriggerToSessionTrigger(t, i, snapshot.game.id));
}

// =============================================================================
// Pre-built Session Data
// =============================================================================

export const BASIC_SESSION = createMockPlaySessionData(BASIC_SNAPSHOT);
export const FACILITATED_SESSION = createMockPlaySessionData(FACILITATED_SNAPSHOT);
export const PARTICIPANTS_SESSION = createMockPlaySessionData(PARTICIPANTS_SNAPSHOT);

export const FACILITATED_TRIGGERS = createMockTriggers(FACILITATED_SNAPSHOT);
export const PARTICIPANTS_TRIGGERS = createMockTriggers(PARTICIPANTS_SNAPSHOT);

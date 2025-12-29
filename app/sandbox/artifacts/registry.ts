import type { ArtifactType } from '@/types/games';
import { z } from 'zod';
import {
  audioArtifactConfigSchema,
  cipherConfigSchema,
  counterConfigSchema,
  hintConfigSchema,
  hotspotConfigSchema,
  imageRevealArtifactConfigSchema,
  keypadArtifactConfigSchema,
  locationCheckConfigSchema,
  logicGridConfigSchema,
  tilePuzzleConfigSchema,
  multiAnswerConfigSchema,
  propConfirmationConfigSchema,
  replayMarkerConfigSchema,
  riddleConfigSchema,
  scanGateConfigSchema,
  textContentArtifactConfigSchema,
  type ArtifactRole,
} from './schemas';

export type SandboxArtifactScenarioId =
  | 'keypad-4-digits'
  | 'keypad-attempt-limit'
  | 'riddle-text'
  | 'cipher-caesar'
  | 'hotspot-clickable-image'
  | 'tile-puzzle-3x3'
  | 'logic-grid'
  | 'counter-hint'
  | 'hint-container'
  | 'qr-gate-checkpoint'
  | 'location-checkpoint'
  | 'hint-single'
  | 'secret-document'
  | 'reveal-card'
  | 'role-secret'
  | 'audio-clue'
  | 'audio-activation'
  | 'prop-check'
  | 'quiz-numeric-answer'
  | 'text-question'
  | 'checklist'
  | 'learn-card'
  | 'reveal-image'
  | 'replay-marker'
  | 'empty-artifact';

export type SandboxArtifactScenario<TConfig = unknown> = {
  id: SandboxArtifactScenarioId;
  artifactType: ArtifactType;
  label: string;
  description: string;
  roles: ArtifactRole[];
  configSchema: z.ZodType<TConfig>;
  defaultConfig: TConfig;
};

export const sandboxArtifactScenarios: SandboxArtifactScenario[] = [
  {
    id: 'keypad-4-digits',
    artifactType: 'keypad',
    label: 'Keypad (4 siffror)',
    description: 'Standard PIN-inmatning med 4 siffror.',
    roles: ['admin', 'host', 'participant'],
    configSchema: keypadArtifactConfigSchema,
    defaultConfig: {
      correctCode: '1234',
      codeLength: 4,
      title: 'Ange koden',
      showAttempts: true,
      size: 'md',
      autoSubmit: true,
    },
  },
  {
    id: 'keypad-attempt-limit',
    artifactType: 'keypad',
    label: 'Keypad (försöksbegränsning)',
    description: 'PIN-inmatning med max antal försök (utlåst vid fel).',
    roles: ['admin', 'host', 'participant'],
    configSchema: keypadArtifactConfigSchema,
    defaultConfig: {
      correctCode: '4711',
      codeLength: 4,
      maxAttempts: 3,
      title: 'Ange koden',
      showAttempts: true,
      size: 'md',
      autoSubmit: true,
    },
  },
  {
    id: 'riddle-text',
    artifactType: 'riddle',
    label: 'Gåta / Fråga (text)',
    description: 'Textfråga med fuzzy matching, valfri hint efter X fel.',
    roles: ['admin', 'host', 'participant'],
    configSchema: riddleConfigSchema,
    defaultConfig: {
      promptText: 'Vad heter Sveriges huvudstad?',
      acceptedAnswers: ['Stockholm'],
      normalizeMode: 'fuzzy',
      maxAttempts: 3,
      showHintAfterAttempts: 2,
      hintText: 'Det börjar på S…',
    },
  },
  {
    id: 'cipher-caesar',
    artifactType: 'cipher',
    label: 'Caesar-chiffer',
    description: 'Avkoda ett meddelande, med valfri avkodarhjälp.',
    roles: ['admin', 'host', 'participant'],
    configSchema: cipherConfigSchema,
    defaultConfig: {
      cipherType: 'caesar',
      encodedMessage: 'KHOOR ZRUOG',
      caesarShift: 3,
      expectedPlaintext: 'HELLO WORLD',
      normalizeMode: 'fuzzy',
      showDecoderUI: true,
    },
  },
  {
    id: 'hotspot-clickable-image',
    artifactType: 'hotspot',
    label: 'Klickbar bild',
    description: 'Hitta hotspot(s) i en bild.',
    roles: ['admin', 'host', 'participant'],
    configSchema: hotspotConfigSchema,
    defaultConfig: {
      imageArtifactId: 'sandbox-image',
      imageUrl: '/sandbox/hotspot-test.svg',
      hotspots: [
        { id: 'h1', x: 30, y: 40, radius: 8, label: 'Nyckeln' },
        { id: 'h2', x: 70, y: 60, radius: 8, label: 'Låset' },
      ],
      requireAll: true,
      showProgress: true,
      allowZoom: true,
      hapticFeedback: false,
    },
  },
  {
    id: 'tile-puzzle-3x3',
    artifactType: 'tile_puzzle',
    label: 'Pusselspel (3x3)',
    description: 'Drag-and-drop tile puzzle i 3x3.',
    roles: ['admin', 'host', 'participant'],
    configSchema: tilePuzzleConfigSchema,
    defaultConfig: {
      imageArtifactId: 'sandbox-image',
      imageUrl:
        'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1200&q=80',
      gridSize: '3x3',
      snapToGrid: true,
      shuffleOnStart: true,
      showPreview: true,
    },
  },
  {
    id: 'logic-grid',
    artifactType: 'logic_grid',
    label: 'Logikrutnät',
    description: 'Einstein-style logikpussel med ledtrådar och grid.',
    roles: ['admin', 'host', 'participant'],
    configSchema: logicGridConfigSchema,
    defaultConfig: {
      title: 'Vem har vilket husdjur?',
      categories: [
        { id: 'person', name: 'Person', items: ['Anna', 'Erik', 'Maria'] },
        { id: 'pet', name: 'Husdjur', items: ['Hund', 'Katt', 'Fisk'] },
        { id: 'color', name: 'Färg', items: ['Röd', 'Blå', 'Grön'] },
      ],
      clues: [
        { id: 'c1', text: 'Anna har inte katt.' },
        { id: 'c2', text: 'Den som har fisk bor inte i det röda huset.' },
      ],
      // Minimal "solution" (used by isLogicGridSolved): mark one yes-cell.
      solution: [
        {
          rowCategoryId: 'person',
          rowItemIndex: 0,
          colCategoryId: 'pet',
          colItemIndex: 0,
          value: 'yes',
        },
      ],
      progressiveClues: false,
    },
  },
  {
    id: 'counter-hint',
    artifactType: 'counter',
    label: 'Ledtrådsräknare',
    description: 'Räknare som kan ökas/minskas av host/admin.',
    roles: ['admin', 'host', 'participant'],
    configSchema: counterConfigSchema,
    defaultConfig: {
      key: 'hints_used',
      target: 3,
      initialValue: 0,
      label: 'Ledtrådar',
      allowDecrement: true,
    },
  },
  {
    id: 'hint-container',
    artifactType: 'hint_container',
    label: 'Tips-behållare',
    description: 'Hela hint-systemet (flera hints, cooldown, cost).',
    roles: ['admin', 'host', 'participant'],
    configSchema: hintConfigSchema,
    defaultConfig: {
      hints: [
        { id: 'h1', content: 'Kolla under mattan.', cost: 'none' },
        { id: 'h2', content: 'Nyckeln är nära dörren.', cost: 'time', timePenalty: 30 },
      ],
      cooldownSeconds: 10,
      maxHints: 2,
      showHintCount: true,
    },
  },
  {
    id: 'qr-gate-checkpoint',
    artifactType: 'qr_gate',
    label: 'QR-kod checkpoint',
    description: 'Verifiering via QR (med manuell fallback).',
    roles: ['admin', 'host', 'participant'],
    configSchema: scanGateConfigSchema,
    defaultConfig: {
      mode: 'qr',
      allowedValues: ['CHECKPOINT-1'],
      allowManualFallback: true,
      fallbackCode: 'CHECKPOINT-1',
      promptText: 'Skanna QR-koden för att fortsätta',
      successMessage: 'Verifierad!',
    },
  },
  {
    id: 'location-checkpoint',
    artifactType: 'location_check',
    label: 'Plats-checkpoint',
    description: 'Platsverifiering via GPS / QR / manual.',
    roles: ['admin', 'host', 'participant'],
    configSchema: locationCheckConfigSchema,
    defaultConfig: {
      locationId: 'loc-1',
      locationName: 'Startplatsen',
      checkType: 'manual',
      hint: 'Gå till startpunkten och invänta bekräftelse.',
      showDistance: true,
      showCompass: true,
    },
  },
  {
    id: 'hint-single',
    artifactType: 'hint_container',
    label: 'Ledtråd/Hint',
    description: 'En enkel hint (1-item) i HintPanel.',
    roles: ['admin', 'host', 'participant'],
    configSchema: hintConfigSchema,
    defaultConfig: {
      hints: [{ id: 'h1', content: 'Titta på baksidan av dokumentet.' }],
      cooldownSeconds: 0,
      maxHints: 1,
      showHintCount: false,
    },
  },
  {
    id: 'secret-document',
    artifactType: 'document',
    label: 'Hemligt dokument',
    description: 'Textinnehåll (document) som kan kopplas till synlighet senare.',
    roles: ['admin', 'host', 'participant'],
    configSchema: textContentArtifactConfigSchema,
    defaultConfig: {
      title: 'Hemligt dokument',
      body: 'Detta är ett hemligt dokument. Endast vissa roller ska kunna se det.',
      visibility: 'role_private',
      visibleToRoleId: null,
    },
  },
  {
    id: 'reveal-card',
    artifactType: 'card',
    label: 'Avslöjande kort',
    description: 'Ett kort med text som kan användas som reveal/handout.',
    roles: ['admin', 'host', 'participant'],
    configSchema: textContentArtifactConfigSchema,
    defaultConfig: {
      title: 'Avslöjande',
      body: 'Du hittar en lapp: "Nyckeln finns där ingen tittar."',
      visibility: 'public',
      visibleToRoleId: null,
    },
  },
  {
    id: 'role-secret',
    artifactType: 'card',
    label: 'Rollhemlighet',
    description: 'Kort som representerar en hemlighet för en specifik roll.',
    roles: ['admin', 'host', 'participant'],
    configSchema: textContentArtifactConfigSchema,
    defaultConfig: {
      title: 'Din hemlighet',
      body: 'Du var på platsen vid tidpunkten för brottet.',
      visibility: 'role_private',
      visibleToRoleId: 'suspect',
    },
  },
  {
    id: 'audio-clue',
    artifactType: 'audio',
    label: 'Ljudledtråd',
    description: 'Ljuduppspelning som ledtråd (utan ack-krav).',
    roles: ['admin', 'host', 'participant'],
    configSchema: audioArtifactConfigSchema,
    defaultConfig: {
      title: 'Ljudledtråd',
      src: '/sandbox/audio-test.wav',
      config: {
        requireAck: false,
        showTranscript: true,
        transcriptText: 'En svag viskning: "Se mot norr".',
        requireHeadphones: true,
      },
      size: 'md',
    },
  },
  {
    id: 'audio-activation',
    artifactType: 'audio',
    label: 'Ljudaktivering',
    description: 'Ljud som kräver ack innan man går vidare.',
    roles: ['admin', 'host', 'participant'],
    configSchema: audioArtifactConfigSchema,
    defaultConfig: {
      title: 'Lyssna och bekräfta',
      src: '/sandbox/audio-test.wav',
      config: {
        requireAck: true,
        ackButtonText: 'Jag har lyssnat',
        showTranscript: false,
      },
      size: 'md',
    },
  },
  {
    id: 'prop-check',
    artifactType: 'prop_confirmation',
    label: 'Rekvisita-check',
    description: 'Deltagare begär bekräftelse av host (med ev foto).',
    roles: ['admin', 'host', 'participant'],
    configSchema: propConfirmationConfigSchema,
    defaultConfig: {
      propId: 'prop-1',
      propDescription: 'Ett gammalt mynt',
      instructions: 'Hitta myntet och be spelledaren bekräfta.',
      requirePhoto: false,
      allowPartial: false,
    },
  },
  {
    id: 'quiz-numeric-answer',
    artifactType: 'riddle',
    label: 'Quizsvar (siffersvar)',
    description: 'Riddle i numeric mode (endast siffror matchas).',
    roles: ['admin', 'host', 'participant'],
    configSchema: riddleConfigSchema,
    defaultConfig: {
      promptText: 'Hur många dagar har ett skottår?',
      acceptedAnswers: ['366'],
      normalizeMode: 'numeric',
      maxAttempts: 2,
    },
  },
  {
    id: 'text-question',
    artifactType: 'riddle',
    label: 'Textfråga',
    description: 'Riddle i fuzzy mode för vanlig textfråga.',
    roles: ['admin', 'host', 'participant'],
    configSchema: riddleConfigSchema,
    defaultConfig: {
      promptText: 'Vilket ord saknas: "Kunskap är ___"?',
      acceptedAnswers: ['makt'],
      normalizeMode: 'fuzzy',
      maxAttempts: 3,
    },
  },
  {
    id: 'checklist',
    artifactType: 'multi_answer',
    label: 'Checklista',
    description: 'MultiAnswer-form med toggle-checks.',
    roles: ['admin', 'host', 'participant'],
    configSchema: multiAnswerConfigSchema,
    defaultConfig: {
      checks: [
        { id: 'c1', type: 'toggle', label: 'Jag har läst instruktionerna' },
        { id: 'c2', type: 'toggle', label: 'Jag har hittat artefakten' },
      ],
      requireAll: true,
      showProgress: true,
    },
  },
  {
    id: 'learn-card',
    artifactType: 'card',
    label: 'Lärokort',
    description: 'Ett kort med instruktion/kunskap (content).',
    roles: ['admin', 'host', 'participant'],
    configSchema: textContentArtifactConfigSchema,
    defaultConfig: {
      title: 'Lärokort',
      body: 'Tips: Om du fastnar, be om en ledtråd.',
      visibility: 'public',
      visibleToRoleId: null,
    },
  },
  {
    id: 'reveal-image',
    artifactType: 'image',
    label: 'Bild att avslöja',
    description: 'En bild (url) som kan visas som artifact content.',
    roles: ['admin', 'host', 'participant'],
    configSchema: imageRevealArtifactConfigSchema,
    defaultConfig: {
      title: 'Avslöjad bild',
      imageUrl:
        'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80',
      description: 'En ledtråd gömmer sig i bilden.',
    },
  },
  {
    id: 'replay-marker',
    artifactType: 'replay_marker',
    label: 'Replay-markör',
    description: 'Tidslinje där deltagare kan lägga markörer.',
    roles: ['admin', 'host', 'participant'],
    configSchema: replayMarkerConfigSchema,
    defaultConfig: {
      allowParticipantMarkers: true,
      availableTypes: ['highlight', 'bookmark', 'note', 'error'],
    },
  },
  {
    id: 'empty-artifact',
    artifactType: 'empty_artifact',
    label: 'Tom artefakt',
    description: 'Placeholder som alltid renderar en tom yta.',
    roles: ['admin', 'host', 'participant'],
    configSchema: z.object({}).strict(),
    defaultConfig: {},
  },
];

export function getSandboxArtifactScenarioById(id: SandboxArtifactScenarioId) {
  return sandboxArtifactScenarios.find((s) => s.id === id) ?? null;
}

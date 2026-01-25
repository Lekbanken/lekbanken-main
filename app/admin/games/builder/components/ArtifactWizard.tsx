'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button, Input, Select, HelpText } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  XMarkIcon,
  SparklesIcon,
  LockClosedIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import type { ArtifactFormData, ArtifactVisibility } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

type ArtifactTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'escape_room' | 'party' | 'educational' | 'general';
  artifact: Partial<ArtifactFormData>;
};

type ArtifactWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (artifact: ArtifactFormData) => void;
  roles?: { id: string; name: string }[];
};

// =============================================================================
// Templates
// =============================================================================

const getArtifactTemplates = (t: ReturnType<typeof useTranslations>): ArtifactTemplate[] => [
  // =============================================================================
  // Escape Room
  // =============================================================================
  {
    id: 'keypad-basic',
    name: t('wizard.templates.keypadBasic.name'),
    description: t('wizard.templates.keypadBasic.description'),
    icon: '🔐',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.keypadBasic.title'),
      artifact_type: 'keypad',
      metadata: {
        correctCode: t('wizard.templates.keypadBasic.correctCode'),
        codeLength: 4,
        successMessage: t('wizard.templates.keypadBasic.successMessage'),
        failMessage: t('wizard.templates.keypadBasic.failMessage'),
      },
    },
  },
  {
    id: 'keypad-advanced',
    name: t('wizard.templates.keypadAdvanced.name'),
    description: t('wizard.templates.keypadAdvanced.description'),
    icon: '🔒',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.keypadAdvanced.title'),
      artifact_type: 'keypad',
      metadata: {
        correctCode: '',
        codeLength: 4,
        maxAttempts: 3,
        lockOnFail: true,
        successMessage: t('wizard.templates.keypadAdvanced.successMessage'),
        failMessage: t('wizard.templates.keypadAdvanced.failMessage'),
        lockedMessage: t('wizard.templates.keypadAdvanced.lockedMessage'),
      },
    },
  },
  {
    id: 'riddle-puzzle',
    name: t('wizard.templates.riddle.name'),
    description: t('wizard.templates.riddle.description'),
    icon: '❓',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.riddle.title'),
      artifact_type: 'riddle',
      metadata: {
        prompt: t('wizard.templates.riddle.prompt'),
        correctAnswers: t('wizard.templates.riddle.correctAnswers', { count: 3 }).split('\n'),
        normalizeMode: 'fuzzy',
        maxAttempts: null,
      },
    },
  },
  {
    id: 'cipher-caesar',
    name: t('wizard.templates.cipherCaesar.name'),
    description: t('wizard.templates.cipherCaesar.description'),
    icon: '🔤',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.cipherCaesar.title'),
      artifact_type: 'cipher',
      metadata: {
        cipherMethod: 'caesar',
        cipherKey: t('wizard.templates.cipherCaesar.cipherKey'),
        plaintext: t('wizard.templates.cipherCaesar.plaintext'),
      },
    },
  },
  {
    id: 'hotspot-image',
    name: t('wizard.templates.hotspotImage.name'),
    description: t('wizard.templates.hotspotImage.description'),
    icon: '🎯',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.hotspotImage.title'),
      artifact_type: 'hotspot',
      metadata: {
        imageUrl: '',
        imageRef: null,
        zones: [],
        showFeedback: true,
        requiredHits: null,
      },
    },
  },
  {
    id: 'tile-puzzle',
    name: t('wizard.templates.tilePuzzle.name'),
    description: t('wizard.templates.tilePuzzle.description'),
    icon: '🧩',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.tilePuzzle.title'),
      artifact_type: 'tile_puzzle',
      metadata: {
        imageUrl: '',
        gridSize: 3,
        showPreview: false,
      },
    },
  },
  {
    id: 'logic-grid',
    name: t('wizard.templates.logicGrid.name'),
    description: t('wizard.templates.logicGrid.description'),
    icon: '🧠',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.logicGrid.title'),
      artifact_type: 'logic_grid',
      metadata: {
        rows: t('wizard.templates.logicGrid.rows', { count: 3 }).split('\n'),
        columns: t('wizard.templates.logicGrid.columns', { count: 3 }).split('\n'),
        solution: JSON.parse(t('wizard.templates.logicGrid.solution')) as Record<string, string>,
      },
    },
  },
  {
    id: 'counter-clues',
    name: t('wizard.templates.counterClues.name'),
    description: t('wizard.templates.counterClues.description'),
    icon: '🔢',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.counterClues.title'),
      artifact_type: 'counter',
      metadata: {
        initialValue: 0,
        target: 5,
        step: 1,
        label: t('wizard.templates.counterClues.label'),
      },
    },
  },
  {
    id: 'hint-container',
    name: t('wizard.templates.hintContainer.name'),
    description: t('wizard.templates.hintContainer.description'),
    icon: '💡',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.hintContainer.title'),
      artifact_type: 'hint_container',
      metadata: {
        hints: t('wizard.templates.hintContainer.hints', { count: 3 }).split('\n'),
        maxHints: null,
        penaltyPerHint: 0,
      },
    },
  },
  {
    id: 'qr-gate',
    name: t('wizard.templates.qrGate.name'),
    description: t('wizard.templates.qrGate.description'),
    icon: '📱',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.qrGate.title'),
      artifact_type: 'qr_gate',
      metadata: {
        expectedValue: t('wizard.templates.qrGate.expectedValue'),
        successMessage: t('wizard.templates.qrGate.successMessage'),
      },
    },
  },
  {
    id: 'location-checkpoint',
    name: t('wizard.templates.locationCheckpoint.name'),
    description: t('wizard.templates.locationCheckpoint.description'),
    icon: '📍',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.locationCheckpoint.title'),
      artifact_type: 'location_check',
      metadata: {
        latitude: 59.3293,
        longitude: 18.0686,
        radius: 50,
        locationName: t('wizard.templates.locationCheckpoint.locationName'),
      },
    },
  },
  {
    id: 'clue-card',
    name: t('wizard.templates.clueCard.name'),
    description: t('wizard.templates.clueCard.description'),
    icon: '🃏',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.clueCard.title'),
      artifact_type: 'card',
      description: t('wizard.templates.clueCard.descriptionText'),
      variants: [
        {
          id: 'default',
          title: t('wizard.templates.clueCard.variantTitle'),
          body: t('wizard.templates.clueCard.variantBody'),
          visibility: 'leader_only' as ArtifactVisibility,
          media_ref: '',
          visible_to_role_id: null,
          step_index: null,
          phase_index: null,
          metadata: null,
        },
      ],
    },
  },
  {
    id: 'secret-document',
    name: t('wizard.templates.secretDocument.name'),
    description: t('wizard.templates.secretDocument.description'),
    icon: '📄',
    category: 'escape_room',
    artifact: {
      title: t('wizard.templates.secretDocument.title'),
      artifact_type: 'document',
      description: t('wizard.templates.secretDocument.descriptionText'),
    },
  },

  // =============================================================================
  // Party Game
  // =============================================================================
  {
    id: 'reveal-card',
    name: t('wizard.templates.revealCard.name'),
    description: t('wizard.templates.revealCard.description'),
    icon: '🎭',
    category: 'party',
    artifact: {
      title: t('wizard.templates.revealCard.title'),
      artifact_type: 'card',
      metadata: {
        revealStyle: 'dramatic',
      },
    },
  },
  {
    id: 'role-secret',
    name: t('wizard.templates.roleSecret.name'),
    description: t('wizard.templates.roleSecret.description'),
    icon: '🤫',
    category: 'party',
    artifact: {
      title: t('wizard.templates.roleSecret.title'),
      artifact_type: 'card',
      variants: [
        {
          id: 'default',
          title: t('wizard.templates.roleSecret.variantTitle'),
          body: t('wizard.templates.roleSecret.variantBody'),
          visibility: 'role_private' as ArtifactVisibility,
          media_ref: '',
          visible_to_role_id: null,
          step_index: null,
          phase_index: null,
          metadata: null,
        },
      ],
    },
  },
  {
    id: 'audio-clue',
    name: t('wizard.templates.audioClue.name'),
    description: t('wizard.templates.audioClue.description'),
    icon: '🔊',
    category: 'party',
    artifact: {
      title: t('wizard.templates.audioClue.title'),
      artifact_type: 'audio',
      metadata: {
        audioUrl: '',
        audioRef: null,
        autoplay: false,
        requireAck: true,
      },
    },
  },
  {
    id: 'sound-trigger',
    name: t('wizard.templates.soundTrigger.name'),
    description: t('wizard.templates.soundTrigger.description'),
    icon: '🎤',
    category: 'party',
    artifact: {
      title: t('wizard.templates.soundTrigger.title'),
      artifact_type: 'sound_level',
      metadata: {
        threshold: 70,
        holdDuration: 2,
        instruction: t('wizard.templates.soundTrigger.instruction'),
      },
    },
  },
  {
    id: 'prop-check',
    name: t('wizard.templates.propCheck.name'),
    description: t('wizard.templates.propCheck.description'),
    icon: '📦',
    category: 'party',
    artifact: {
      title: t('wizard.templates.propCheck.title'),
      artifact_type: 'prop_confirmation',
      metadata: {
        propName: t('wizard.templates.propCheck.propName'),
        instruction: t('wizard.templates.propCheck.instruction'),
      },
    },
  },

  // =============================================================================
  // Educational
  // =============================================================================
  {
    id: 'quiz-answer',
    name: t('wizard.templates.quizAnswer.name'),
    description: t('wizard.templates.quizAnswer.description'),
    icon: '🔢',
    category: 'educational',
    artifact: {
      title: t('wizard.templates.quizAnswer.title'),
      artifact_type: 'keypad',
      description: t('wizard.templates.quizAnswer.descriptionText'),
      metadata: {
        correctCode: '',
        codeLength: 2,
        successMessage: t('wizard.templates.quizAnswer.successMessage'),
        failMessage: t('wizard.templates.quizAnswer.failMessage'),
      },
    },
  },
  {
    id: 'text-question',
    name: t('wizard.templates.textQuestion.name'),
    description: t('wizard.templates.textQuestion.description'),
    icon: '❓',
    category: 'educational',
    artifact: {
      title: t('wizard.templates.textQuestion.title'),
      artifact_type: 'riddle',
      metadata: {
        prompt: t('wizard.templates.textQuestion.prompt'),
        correctAnswers: t('wizard.templates.textQuestion.correctAnswers', { count: 2 }).split('\n'),
        normalizeMode: 'fuzzy',
        maxAttempts: 3,
      },
    },
  },
  {
    id: 'checklist',
    name: t('wizard.templates.checklist.name'),
    description: t('wizard.templates.checklist.description'),
    icon: '✅',
    category: 'educational',
    artifact: {
      title: t('wizard.templates.checklist.title'),
      artifact_type: 'multi_answer',
      metadata: {
        items: t('wizard.templates.checklist.items', { count: 3 }).split('\n'),
        requiredCount: null,
      },
    },
  },
  {
    id: 'learning-card',
    name: t('wizard.templates.learningCard.name'),
    description: t('wizard.templates.learningCard.description'),
    icon: '📚',
    category: 'educational',
    artifact: {
      title: t('wizard.templates.learningCard.title'),
      artifact_type: 'card',
    },
  },

  // =============================================================================
  // General
  // =============================================================================
  {
    id: 'image-reveal',
    name: t('wizard.templates.imageReveal.name'),
    description: t('wizard.templates.imageReveal.description'),
    icon: '🖼️',
    category: 'general',
    artifact: {
      title: t('wizard.templates.imageReveal.title'),
      artifact_type: 'image',
    },
  },
  {
    id: 'replay-marker',
    name: t('wizard.templates.replayMarker.name'),
    description: t('wizard.templates.replayMarker.description'),
    icon: '⏱️',
    category: 'general',
    artifact: {
      title: t('wizard.templates.replayMarker.title'),
      artifact_type: 'replay_marker',
      metadata: {
        maxMarkers: null,
        allowLabels: true,
      },
    },
  },
  {
    id: 'blank',
    name: t('wizard.templates.blank.name'),
    description: t('wizard.templates.blank.description'),
    icon: '➕',
    category: 'general',
    artifact: {
      title: t('wizard.templates.blank.title'),
      artifact_type: 'card',
    },
  },
];

const CATEGORIES = [
  { id: 'escape_room', labelKey: 'wizard.categories.escape_room', icon: '🔐', color: 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400' },
  { id: 'party', labelKey: 'wizard.categories.party', icon: '🎉', color: 'bg-pink-500/10 border-pink-500/40 text-pink-600 dark:text-pink-400' },
  { id: 'educational', labelKey: 'wizard.categories.educational', icon: '📚', color: 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400' },
  { id: 'general', labelKey: 'wizard.categories.general', icon: '📦', color: 'bg-slate-500/10 border-slate-500/40 text-slate-600 dark:text-slate-400' },
] as const;

// Artifact type styling (same as ArtifactEditor)
type ArtifactTypeStyle = { emoji: string; bg: string; border: string; text: string };
const ARTIFACT_STYLES: Record<string, ArtifactTypeStyle> = {
  card: { emoji: '📇', bg: 'bg-slate-500/10', border: 'border-slate-500/40', text: 'text-slate-600 dark:text-slate-400' },
  document: { emoji: '📄', bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-600 dark:text-blue-400' },
  image: { emoji: '🖼️', bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-600 dark:text-purple-400' },
  keypad: { emoji: '🔐', bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-600 dark:text-amber-400' },
  riddle: { emoji: '❓', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400' },
  cipher: { emoji: '🔒', bg: 'bg-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-600 dark:text-rose-400' },
  logic_grid: { emoji: '🧩', bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', text: 'text-indigo-600 dark:text-indigo-400' },
  multi_answer: { emoji: '✅', bg: 'bg-teal-500/10', border: 'border-teal-500/40', text: 'text-teal-600 dark:text-teal-400' },
  audio: { emoji: '🔊', bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-600 dark:text-pink-400' },
  hotspot: { emoji: '📍', bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400' },
  tile_puzzle: { emoji: '🧱', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-600 dark:text-cyan-400' },
  conversation_cards_collection: { emoji: '💬', bg: 'bg-violet-500/10', border: 'border-violet-500/40', text: 'text-violet-600 dark:text-violet-400' },
  counter: { emoji: '🔢', bg: 'bg-lime-500/10', border: 'border-lime-500/40', text: 'text-lime-600 dark:text-lime-400' },
  qr_gate: { emoji: '📱', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/40', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
  hint_container: { emoji: '💡', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-600 dark:text-yellow-400' },
  location_check: { emoji: '🗺️', bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-600 dark:text-green-400' },
  replay_marker: { emoji: '🔄', bg: 'bg-neutral-500/10', border: 'border-neutral-500/40', text: 'text-neutral-600 dark:text-neutral-400' },
};
const getStyle = (type: string): ArtifactTypeStyle => ARTIFACT_STYLES[type] ?? ARTIFACT_STYLES.card;
const getCategoryColor = (catId: string) => CATEGORIES.find(c => c.id === catId)?.color ?? '';

// =============================================================================
// Helpers
// =============================================================================

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createDefaultVariant() {
  return {
    id: makeId(),
    title: '',
    body: '',
    media_ref: '',
    visibility: 'public' as ArtifactVisibility,
    visible_to_role_id: null,
    step_index: null,
    phase_index: null,
    metadata: null,
  };
}

function instantiateTemplate(template: ArtifactTemplate, t: ReturnType<typeof useTranslations>): ArtifactFormData {
  const base = template.artifact;
  return {
    id: makeId(),
    title: base.title ?? t('wizard.defaults.newArtifact'),
    description: base.description ?? '',
    artifact_type: base.artifact_type ?? 'card',
    tags: base.tags ?? [],
    metadata: base.metadata ?? null,
    variants: base.variants?.map((v) => ({ ...v, id: makeId() })) ?? [createDefaultVariant()],
  };
}

// =============================================================================
// Component
// =============================================================================

export function ArtifactWizard({
  isOpen,
  onClose,
  onComplete,
  roles: _roles = [],
}: ArtifactWizardProps) {
  const t = useTranslations('admin.games.builder');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ArtifactTemplate | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [artifact, setArtifact] = useState<ArtifactFormData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const templates = useMemo(() => getArtifactTemplates(t), [t]);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => 
        t.name.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query)
      );
    }
    return result;
  }, [selectedCategory, templates, searchQuery]);

  const handleSelectTemplate = (template: ArtifactTemplate) => {
    setSelectedTemplate(template);
    setArtifact(instantiateTemplate(template, t));
  };

  const handleCreate = () => {
    if (artifact) {
      onComplete(artifact);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setCustomizing(false);
    setArtifact(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[85vh] bg-background rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {customizing ? t('wizard.customizeArtifact') : t('wizard.createNewArtifact')}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Intro help */}
        {!customizing && (
          <div className="px-4 pt-3 space-y-3">
            <HelpText>
              {t('wizard.helpText')}
            </HelpText>
            {/* Search field */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('wizard.searchPlaceholder')}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {!customizing ? (
          <div className="flex-1 overflow-hidden flex">
            {/* Category Sidebar */}
            <div className="w-48 border-r p-3 space-y-1 overflow-y-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded text-sm ${
                  selectedCategory === null
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-surface-secondary'
                }`}
              >
                {t('wizard.allTemplates')}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-surface-secondary'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{t(cat.labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MagnifyingGlassIcon className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t('wizard.noResults')}</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  const catColor = getCategoryColor(template.category);
                  const typeStyle = getStyle(template.artifact.artifact_type ?? 'card');
                  return (
                    <Card
                      key={template.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        isSelected
                          ? 'ring-2 ring-primary border-primary'
                          : `${typeStyle.border} hover:shadow-md`
                      } ${typeStyle.bg}`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                          <span className={`inline-block mt-2 text-xs px-1.5 py-0.5 rounded ${catColor}`}>
                            {t(`wizard.categories.${template.category}`)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        ) : (
          /* Customization Form */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {artifact && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('wizard.fields.title')}</label>
                    <Input
                      value={artifact.title}
                      onChange={(e) => setArtifact({ ...artifact, title: e.target.value })}
                      placeholder={t('wizard.placeholders.title')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('wizard.fields.type')}</label>
                    <Select
                      value={artifact.artifact_type}
                      onChange={(e) => setArtifact({ ...artifact, artifact_type: e.target.value })}
                      options={[
                        { value: 'card', label: t('wizard.types.card') },
                        { value: 'keypad', label: t('wizard.types.keypad') },
                        { value: 'document', label: t('wizard.types.document') },
                        { value: 'image', label: t('wizard.types.image') },
                      ]}
                    />
                  </div>
                </div>

                {/* Keypad specific */}
                {artifact.artifact_type === 'keypad' && (
                  <Card className="p-4 bg-amber-500/5 border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <LockClosedIcon className="h-5 w-5 text-amber-600" />
                      <h3 className="font-medium">{t('wizard.keypad.settings')}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('wizard.keypad.correctCode')}</label>
                        <Input
                          value={(artifact.metadata?.correctCode as string) ?? ''}
                          onChange={(e) =>
                            setArtifact({
                              ...artifact,
                              metadata: { ...artifact.metadata, correctCode: e.target.value.replace(/\D/g, '') },
                            })
                          }
                          placeholder={t('wizard.keypad.correctCodePlaceholder')}
                          maxLength={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('wizard.keypad.codeLength')}</label>
                        <Input
                          type="number"
                          min={2}
                          max={8}
                          value={(artifact.metadata?.codeLength as number) ?? 4}
                          onChange={(e) =>
                            setArtifact({
                              ...artifact,
                              metadata: { ...artifact.metadata, codeLength: parseInt(e.target.value) || 4 },
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('wizard.fields.description')}</label>
                  <Input
                    value={artifact.description}
                    onChange={(e) => setArtifact({ ...artifact, description: e.target.value })}
                    placeholder={t('wizard.placeholders.description')}
                  />
                </div>

                {/* Preview */}
                <Card className="p-4 bg-surface-secondary">
                  <h3 className="text-sm font-medium mb-2">{t('wizard.preview.title')}</h3>
                  {(() => {
                    const previewStyle = ARTIFACT_STYLES[artifact.artifact_type as keyof typeof ARTIFACT_STYLES] || ARTIFACT_STYLES.item;
                    return (
                      <div className={`flex items-start gap-3 p-3 rounded border ${previewStyle.border} ${previewStyle.bg}`}>
                        <span className="text-2xl">{previewStyle.emoji}</span>
                        <div>
                          <p className="font-medium">{artifact.title || t('wizard.preview.unnamed')}</p>
                          <p className="text-sm text-foreground-secondary">
                            {artifact.description || t('wizard.preview.noDescription')}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Badge variant="outline" size="sm" className={previewStyle.text}>
                              {artifact.artifact_type}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {artifact.variants?.length ?? 1} {t('wizard.preview.variants')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-surface-secondary/50">
          <div className="text-sm text-foreground-secondary">
            {selectedTemplate
              ? t('wizard.selectedTemplate', { name: selectedTemplate.name })
              : t('wizard.selectTemplateHint')}
          </div>
          <div className="flex gap-2">
            {customizing ? (
              <>
                <Button variant="outline" onClick={() => setCustomizing(false)}>
                  {t('wizard.buttons.back')}
                </Button>
                <Button variant="default" onClick={handleCreate} disabled={!artifact?.title}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  {t('wizard.buttons.createArtifact')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  {t('wizard.buttons.cancel')}
                </Button>
                <Button
                  variant="default"
                  onClick={() => setCustomizing(true)}
                  disabled={!selectedTemplate}
                >
                  {t('wizard.buttons.customize')}
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreate}
                  disabled={!artifact}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  {t('wizard.buttons.quickCreate')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

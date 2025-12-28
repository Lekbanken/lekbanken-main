'use client';

import { useState, useMemo } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  XMarkIcon,
  SparklesIcon,
  DocumentTextIcon,
  PhotoIcon,
  LockClosedIcon,
  CubeIcon,
  PlusIcon,
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

const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  // Escape Room
  {
    id: 'keypad-basic',
    name: 'Keypad (4 siffror)',
    description: 'En enkel 4-siffrig pinkod för att låsa upp något',
    icon: '🔐',
    category: 'escape_room',
    artifact: {
      title: 'Hemlig kod',
      artifact_type: 'keypad',
      metadata: {
        correctCode: '1234',
        codeLength: 4,
        successMessage: '✅ Korrekt! Du har låst upp ledtråden.',
        failMessage: '❌ Fel kod. Försök igen!',
      },
    },
  },
  {
    id: 'keypad-advanced',
    name: 'Keypad (med försöksbegränsning)',
    description: 'Pinkod med max 3 försök innan låsning',
    icon: '🔒',
    category: 'escape_room',
    artifact: {
      title: 'Säkerhetskod',
      artifact_type: 'keypad',
      metadata: {
        correctCode: '',
        codeLength: 4,
        maxAttempts: 3,
        lockOnFail: true,
        successMessage: '🎉 Korrekt! Vägen är öppen.',
        failMessage: '⚠️ Fel kod!',
        lockedMessage: '🚫 Keypad låst. Kontakta spelledaren.',
      },
    },
  },
  {
    id: 'clue-card',
    name: 'Ledtråd/Hint',
    description: 'Ett kort med en ledtråd som kan avslöjas',
    icon: '💡',
    category: 'escape_room',
    artifact: {
      title: 'Ledtråd',
      artifact_type: 'card',
      description: 'Dold ledtråd som spelledaren kan visa',
      variants: [
        {
          id: 'default',
          title: 'Ledtråd',
          body: 'Skriv din ledtråd här...',
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
    name: 'Hemligt dokument',
    description: 'Ett dokument som avslöjas vid rätt tidpunkt',
    icon: '📄',
    category: 'escape_room',
    artifact: {
      title: 'Hemligt dokument',
      artifact_type: 'document',
      description: 'Avslöjas när deltagarna hittar det',
    },
  },

  // Party Game
  {
    id: 'reveal-card',
    name: 'Avslöjande kort',
    description: 'Ett kort för dramatiska avslöjanden',
    icon: '🎭',
    category: 'party',
    artifact: {
      title: 'Avslöjandet',
      artifact_type: 'card',
      metadata: {
        revealStyle: 'dramatic',
      },
    },
  },
  {
    id: 'role-secret',
    name: 'Rollhemlighet',
    description: 'Hemlig information synlig endast för en roll',
    icon: '🤫',
    category: 'party',
    artifact: {
      title: 'Din hemlighet',
      artifact_type: 'card',
      variants: [
        {
          id: 'default',
          title: 'Hemlig information',
          body: 'Endast du kan se detta...',
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

  // Educational
  {
    id: 'quiz-answer',
    name: 'Quizsvar',
    description: 'Keypad för quiz-frågor med siffersvar',
    icon: '❓',
    category: 'educational',
    artifact: {
      title: 'Fråga',
      artifact_type: 'keypad',
      description: 'Skriv in svaret med siffror',
      metadata: {
        correctCode: '',
        codeLength: 2,
        successMessage: '✅ Rätt svar!',
        failMessage: '❌ Fel svar. Försök igen!',
      },
    },
  },
  {
    id: 'learning-card',
    name: 'Lärokort',
    description: 'Kort med information eller fakta',
    icon: '📚',
    category: 'educational',
    artifact: {
      title: 'Lärokort',
      artifact_type: 'card',
    },
  },

  // General
  {
    id: 'image-reveal',
    name: 'Bild att avslöja',
    description: 'En bild som visas vid rätt tillfälle',
    icon: '🖼️',
    category: 'general',
    artifact: {
      title: 'Bild',
      artifact_type: 'image',
    },
  },
  {
    id: 'blank',
    name: 'Tom artefakt',
    description: 'Börja från scratch',
    icon: '➕',
    category: 'general',
    artifact: {
      title: 'Ny artefakt',
      artifact_type: 'card',
    },
  },
];

const CATEGORIES = [
  { id: 'escape_room', name: 'Escape Room', icon: '🔐' },
  { id: 'party', name: 'Partyspel', icon: '🎉' },
  { id: 'educational', name: 'Utbildning', icon: '📚' },
  { id: 'general', name: 'Allmänt', icon: '📦' },
] as const;

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

function instantiateTemplate(template: ArtifactTemplate): ArtifactFormData {
  const base = template.artifact;
  return {
    id: makeId(),
    title: base.title ?? 'Ny artefakt',
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
  roles = [],
}: ArtifactWizardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ArtifactTemplate | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [artifact, setArtifact] = useState<ArtifactFormData | null>(null);

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return ARTIFACT_TEMPLATES;
    return ARTIFACT_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const handleSelectTemplate = (template: ArtifactTemplate) => {
    setSelectedTemplate(template);
    setArtifact(instantiateTemplate(template));
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
              {customizing ? 'Anpassa artefakt' : 'Skapa ny artefakt'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

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
                Alla mallar
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
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <Card
                      key={template.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-surface-secondary'
                      }`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{template.name}</p>
                          <p className="text-xs text-foreground-secondary mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Customization Form */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {artifact && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titel</label>
                    <Input
                      value={artifact.title}
                      onChange={(e) => setArtifact({ ...artifact, title: e.target.value })}
                      placeholder="Artefaktnamn"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Typ</label>
                    <Select
                      value={artifact.artifact_type}
                      onChange={(e) => setArtifact({ ...artifact, artifact_type: e.target.value })}
                      options={[
                        { value: 'card', label: 'Kort' },
                        { value: 'keypad', label: 'Keypad' },
                        { value: 'document', label: 'Dokument' },
                        { value: 'image', label: 'Bild' },
                      ]}
                    />
                  </div>
                </div>

                {/* Keypad specific */}
                {artifact.artifact_type === 'keypad' && (
                  <Card className="p-4 bg-amber-500/5 border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <LockClosedIcon className="h-5 w-5 text-amber-600" />
                      <h3 className="font-medium">Keypad-inställningar</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Korrekt kod</label>
                        <Input
                          value={(artifact.metadata?.correctCode as string) ?? ''}
                          onChange={(e) =>
                            setArtifact({
                              ...artifact,
                              metadata: { ...artifact.metadata, correctCode: e.target.value.replace(/\D/g, '') },
                            })
                          }
                          placeholder="1234"
                          maxLength={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kodlängd</label>
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
                  <label className="text-sm font-medium">Beskrivning</label>
                  <Input
                    value={artifact.description}
                    onChange={(e) => setArtifact({ ...artifact, description: e.target.value })}
                    placeholder="Kort beskrivning av artefakten"
                  />
                </div>

                {/* Preview */}
                <Card className="p-4 bg-surface-secondary">
                  <h3 className="text-sm font-medium mb-2">Förhandsvisning</h3>
                  <div className="flex items-start gap-3 p-3 bg-background rounded border">
                    <span className="text-2xl">
                      {artifact.artifact_type === 'keypad' ? '🔐' :
                       artifact.artifact_type === 'document' ? '📄' :
                       artifact.artifact_type === 'image' ? '🖼️' : '📇'}
                    </span>
                    <div>
                      <p className="font-medium">{artifact.title || 'Namnlös'}</p>
                      <p className="text-sm text-foreground-secondary">
                        {artifact.description || 'Ingen beskrivning'}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" size="sm">
                          {artifact.artifact_type}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {artifact.variants?.length ?? 1} variant(er)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-surface-secondary/50">
          <div className="text-sm text-foreground-secondary">
            {selectedTemplate
              ? `Vald: ${selectedTemplate.name}`
              : 'Välj en mall att börja med'}
          </div>
          <div className="flex gap-2">
            {customizing ? (
              <>
                <Button variant="outline" onClick={() => setCustomizing(false)}>
                  Tillbaka
                </Button>
                <Button variant="default" onClick={handleCreate} disabled={!artifact?.title}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Skapa artefakt
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Avbryt
                </Button>
                <Button
                  variant="default"
                  onClick={() => setCustomizing(true)}
                  disabled={!selectedTemplate}
                >
                  Anpassa
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreate}
                  disabled={!artifact}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Snabbskapa
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

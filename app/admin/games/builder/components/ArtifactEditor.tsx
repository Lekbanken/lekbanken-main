'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { ArtifactFormData, ArtifactVariantFormData, ArtifactVisibility } from '@/types/games';
import type { RoleData } from './RoleEditor';
import { ArtifactWizard } from './ArtifactWizard';
import { AudioUploadEditor, type AudioUploadEditorValue } from '@/components/ui/audio-upload-editor';
import { InteractiveImageEditor, type InteractiveImageEditorValue } from '@/components/ui/interactive-image-editor';

type StorageRef = { bucket: string; path: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStorageRef(value: unknown): value is StorageRef {
  if (!isRecord(value)) return false;
  return typeof value.bucket === 'string' && typeof value.path === 'string' && value.bucket.length > 0 && value.path.length > 0;
}

type ArtifactEditorProps = {
  artifacts: ArtifactFormData[];
  roles: RoleData[];
  stepCount: number;
  phaseCount: number;
  onChange: (artifacts: ArtifactFormData[]) => void;
};

// Options are now defined in component with useMemo to support translations

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

// Artifact type styling configuration
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
  prop_confirmation: { emoji: '🎭', bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-600 dark:text-red-400' },
  sound_level: { emoji: '📢', bg: 'bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-600 dark:text-sky-400' },
  replay_marker: { emoji: '🔄', bg: 'bg-neutral-500/10', border: 'border-neutral-500/40', text: 'text-neutral-600 dark:text-neutral-400' },
  signal_generator: { emoji: '📡', bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-600 dark:text-blue-400' },
  time_bank_step: { emoji: '⏱️', bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400' },
  empty_artifact: { emoji: '📦', bg: 'bg-gray-500/10', border: 'border-gray-500/40', text: 'text-gray-600 dark:text-gray-400' },
};
const getStyle = (type: string): ArtifactTypeStyle => ARTIFACT_STYLES[type] ?? ARTIFACT_STYLES.card;

function createVariant(): ArtifactVariantFormData {
  return {
    id: makeId(),
    title: '',
    body: '',
    media_ref: '',
    visibility: 'public',
    visible_to_role_id: null,
    step_index: null,
    phase_index: null,
    metadata: null,
  };
}

function createArtifact(t: ReturnType<typeof useTranslations>): ArtifactFormData {
  return {
    id: makeId(),
    title: t('artifact.newArtifact'),
    description: '',
    artifact_type: 'card',
    tags: [],
    metadata: null,
    variants: [createVariant()],
  };
}

export function ArtifactEditor({ artifacts, roles, stepCount, phaseCount, onChange }: ArtifactEditorProps) {
  const t = useTranslations('admin.games.builder');
  const [wizardOpen, setWizardOpen] = useState(false);
  // Track which artifacts are expanded (by ID) - start with all collapsed
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedArtifacts(new Set(artifacts.map((a) => a.id)));
  const collapseAll = () => setExpandedArtifacts(new Set());

  // Translated options using useMemo
  const visibilityOptions = useMemo(() => [
    { value: 'public' as const, label: t('artifact.visibility.public') },
    { value: 'leader_only' as const, label: t('artifact.visibility.leaderOnly') },
    { value: 'role_private' as const, label: t('artifact.visibility.rolePrivate') },
  ], [t]);

  const artifactTypeOptions = useMemo(() => [
    // Grundläggande
    { value: 'card', label: t('artifact.types.card') },
    { value: 'document', label: t('artifact.types.document') },
    { value: 'image', label: t('artifact.types.image') },
    // Verktyg
    { value: 'conversation_cards_collection', label: t('artifact.types.conversationCards') },
    // Kod & Input
    { value: 'keypad', label: t('artifact.types.keypad') },
    { value: 'riddle', label: t('artifact.types.riddle') },
    { value: 'multi_answer', label: t('artifact.types.multiAnswer') },
    // Media & Interaktion
    { value: 'audio', label: t('artifact.types.audio') },
    { value: 'hotspot', label: t('artifact.types.hotspot') },
    { value: 'tile_puzzle', label: t('artifact.types.tilePuzzle') },
    // Kryptografi & Logik
    { value: 'cipher', label: t('artifact.types.cipher') },
    { value: 'logic_grid', label: t('artifact.types.logicGrid') },
    // Speciella
    { value: 'counter', label: t('artifact.types.counter') },
    { value: 'qr_gate', label: t('artifact.types.qrGate') },
    { value: 'hint_container', label: t('artifact.types.hintContainer') },
    { value: 'prop_confirmation', label: t('artifact.types.propConfirmation') },
    { value: 'location_check', label: t('artifact.types.locationCheck') },
    { value: 'sound_level', label: t('artifact.types.soundLevel') },
    { value: 'replay_marker', label: t('artifact.types.replayMarker') },
    // Session Cockpit (Task 2.1-2.3)
    { value: 'signal_generator', label: t('artifact.types.signalGenerator') },
    { value: 'time_bank_step', label: t('artifact.types.timeBankStep') },
    { value: 'empty_artifact', label: t('artifact.types.emptyArtifact') },
  ], [t]);

  const [conversationDecks, setConversationDecks] = useState<Array<{ id: string; title: string }>>([]);
  const [conversationDecksError, setConversationDecksError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConversationDecks() {
      // Only load if needed
      if (!artifacts.some((a) => a.artifact_type === 'conversation_cards_collection')) return;

      setConversationDecksError(null);
      try {
        const res = await fetch('/api/admin/toolbelt/conversation-cards/collections', { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as {
          collections?: Array<{ id: string; title: string; status?: string | null }>;
          error?: string;
        };
        if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : t('artifact.errors.loadConversationDecks'));

        const published = (data.collections ?? []).filter((c) => c.status === 'published');
        const items = published
          .filter((c) => typeof c.id === 'string' && typeof c.title === 'string')
          .map((c) => ({ id: c.id, title: c.title }));

        if (!cancelled) setConversationDecks(items);
      } catch (e) {
        if (!cancelled) setConversationDecksError(e instanceof Error ? e.message : t('artifact.errors.loadConversationDecks'));
      }
    }

    void loadConversationDecks();
    return () => {
      cancelled = true;
    };
  }, [artifacts, t]);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name || t('artifact.defaults.role') })),
    [roles, t]
  );

  const handleWizardComplete = (artifact: ArtifactFormData) => {
    onChange([...artifacts, artifact]);
    setWizardOpen(false);
  };

  const updateArtifact = (index: number, next: Partial<ArtifactFormData>) => {
    const draft = [...artifacts];
    draft[index] = { ...draft[index], ...next };
    onChange(draft);
  };

  const updateVariant = (artifactIndex: number, variantIndex: number, next: Partial<ArtifactVariantFormData>) => {
    const draft = [...artifacts];
    const variants = [...draft[artifactIndex].variants];
    variants[variantIndex] = { ...variants[variantIndex], ...next };
    draft[artifactIndex] = { ...draft[artifactIndex], variants };
    onChange(draft);
  };

  const moveArtifact = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= artifacts.length) return;
    const draft = [...artifacts];
    const [item] = draft.splice(index, 1);
    draft.splice(target, 0, item);
    onChange(draft);
  };

  const moveVariant = (artifactIndex: number, variantIndex: number, direction: -1 | 1) => {
    const target = variantIndex + direction;
    const variants = artifacts[artifactIndex]?.variants ?? [];
    if (target < 0 || target >= variants.length) return;
    const nextVariants = [...variants];
    const [item] = nextVariants.splice(variantIndex, 1);
    nextVariants.splice(target, 0, item);
    updateArtifact(artifactIndex, { variants: nextVariants });
  };

  const removeArtifact = (index: number) => {
    const draft = [...artifacts];
    draft.splice(index, 1);
    onChange(draft);
  };

  const removeVariant = (artifactIndex: number, variantIndex: number) => {
    const variants = artifacts[artifactIndex]?.variants ?? [];
    if (variants.length <= 1) return;
    const nextVariants = [...variants];
    nextVariants.splice(variantIndex, 1);
    updateArtifact(artifactIndex, { variants: nextVariants });
  };

  return (
    <div className="space-y-4">
      {/* Artifact Wizard */}
      <ArtifactWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />

      {/* Header with buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('artifact.header.title', { count: artifacts.length })}</h3>
          <p className="text-sm text-muted-foreground">{t('artifact.header.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {artifacts.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={expandAll} title="Expandera alla">
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll} title="Kollapsa alla">
                <ChevronUpIcon className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <SparklesIcon className="h-4 w-4 mr-1" />
            {t('artifact.header.wizard')}
          </Button>
          <Button size="sm" onClick={() => {
            const newArtifact = createArtifact(t);
            onChange([...artifacts, newArtifact]);
            setExpandedArtifacts((prev) => new Set([...prev, newArtifact.id]));
          }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('artifact.header.add')}
          </Button>
        </div>
      </div>

      {artifacts.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">{t('artifact.empty.title')}</p>
          <p className="text-xs mt-1">{t('artifact.empty.description')}</p>
        </Card>
      )}

      {artifacts.map((artifact, idx) => {
        const style = getStyle(artifact.artifact_type);
        const isExpanded = expandedArtifacts.has(artifact.id);
        const variantCount = artifact.variants.length;
        
        return (
        <Card key={artifact.id} className={`border-2 transition-colors ${style.border} ${style.bg}`}>
          {/* Collapsed header - always visible */}
          <div className="p-3 flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-3 flex-1 text-left min-w-0"
              onClick={() => toggleExpanded(artifact.id)}
            >
              <span className="text-xl shrink-0">{style.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground truncate">
                    {artifact.title || t('artifact.fields.titlePlaceholder')}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text} shrink-0`}>
                    {variantCount} variant{variantCount !== 1 ? 'er' : ''}
                  </span>
                  {artifact.tags.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      {artifact.tags.slice(0, 2).join(', ')}{artifact.tags.length > 2 ? '...' : ''}
                    </span>
                  )}
                </div>
                {artifact.description && !isExpanded && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{artifact.description}</p>
                )}
              </div>
              <ChevronDownIcon className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => moveArtifact(idx, -1)} disabled={idx === 0}>
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => moveArtifact(idx, 1)} disabled={idx === artifacts.length - 1}>
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => removeArtifact(idx)}>
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/50">
            {/* Title input */}
            <div className="pt-4 space-y-2">
              <label className="text-sm font-medium text-foreground">{t('artifact.fields.titlePlaceholder')}</label>
              <Input
                value={artifact.title}
                onChange={(e) => updateArtifact(idx, { title: e.target.value })}
                placeholder={t('artifact.fields.titlePlaceholder')}
                className="font-medium"
              />
            </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('artifact.fields.typeLabel')}</label>
              <Select
                value={artifact.artifact_type}
                onChange={(e) => updateArtifact(idx, { artifact_type: e.target.value })}
                options={artifactTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('artifact.fields.tagsLabel')}</label>
              <Input
                value={artifact.tags.join(', ')}
                onChange={(e) =>
                  updateArtifact(idx, {
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t('artifact.fields.tagsPlaceholder')}
              />
            </div>
          </div>

          {/* Keypad-specific configuration */}
          {artifact.artifact_type === 'keypad' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.keypad.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.keypad.correctCodeLabel')}</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={(artifact.metadata?.correctCode as string) || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, correctCode: val },
                      });
                    }}
                    placeholder={t('artifact.keypad.correctCodePlaceholder')}
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">{t('artifact.keypad.correctCodeHelp')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.keypad.codeLengthLabel')}</label>
                  <Input
                    type="number"
                    min={2}
                    max={8}
                    value={(artifact.metadata?.codeLength as number) || 4}
                    onChange={(e) => {
                      const val = Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 4));
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, codeLength: val },
                      });
                    }}
                    placeholder={t('artifact.keypad.codeLengthPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('artifact.keypad.codeLengthHelp')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.keypad.successMessageLabel')}</label>
                <Input
                  value={(artifact.metadata?.successMessage as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, successMessage: e.target.value },
                    })
                  }
                  placeholder={t('artifact.keypad.successMessagePlaceholder')}
                />
              </div>

              {/* Advanced keypad settings */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  {t('artifact.keypad.advancedTitle')}
                </summary>
                <div className="mt-3 space-y-4 pl-4 border-l-2 border-amber-500/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.keypad.maxAttemptsLabel')}</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={(artifact.metadata?.maxAttempts as number) || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                          updateArtifact(idx, {
                            metadata: { ...artifact.metadata, maxAttempts: val },
                          });
                        }}
                        placeholder={t('artifact.keypad.maxAttemptsPlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground">{t('artifact.keypad.maxAttemptsHelp')}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.keypad.lockOnFailLabel')}</label>
                      <Select
                        value={(artifact.metadata?.lockOnFail as boolean) ? 'true' : 'false'}
                        onChange={(e) =>
                          updateArtifact(idx, {
                            metadata: { ...artifact.metadata, lockOnFail: e.target.value === 'true' },
                          })
                        }
                        options={[
                          { value: 'false', label: t('artifact.keypad.lockOnFailNo') },
                          { value: 'true', label: t('artifact.keypad.lockOnFailYes') },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('artifact.keypad.failMessageLabel')}</label>
                    <Input
                      value={(artifact.metadata?.failMessage as string) || ''}
                      onChange={(e) =>
                        updateArtifact(idx, {
                          metadata: { ...artifact.metadata, failMessage: e.target.value },
                        })
                      }
                      placeholder={t('artifact.keypad.failMessagePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('artifact.keypad.lockedMessageLabel')}</label>
                    <Input
                      value={(artifact.metadata?.lockedMessage as string) || ''}
                      onChange={(e) =>
                        updateArtifact(idx, {
                          metadata: { ...artifact.metadata, lockedMessage: e.target.value },
                        })
                      }
                      placeholder={t('artifact.keypad.lockedMessagePlaceholder')}
                    />
                  </div>
                </div>
              </details>
            </div>
          )}

          {artifact.artifact_type === 'conversation_cards_collection' && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗣️</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.conversation.title')}</h4>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.conversation.selectLabel')}</label>
                <Select
                  value={typeof artifact.metadata?.conversation_card_collection_id === 'string' ? (artifact.metadata.conversation_card_collection_id as string) : ''}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    updateArtifact(idx, {
                      metadata: {
                        ...(artifact.metadata ?? {}),
                        conversation_card_collection_id: nextId,
                      },
                    });
                  }}
                  options={[
                    { value: '', label: t('artifact.conversation.selectPlaceholder') },
                    ...conversationDecks.map((d) => ({ value: d.id, label: d.title })),
                  ]}
                />
                {conversationDecksError && <p className="text-xs text-destructive">{conversationDecksError}</p>}
                <p className="text-xs text-muted-foreground">
                  {t('artifact.conversation.helpText')}
                </p>
              </div>
            </div>
          )}

          {/* Riddle configuration */}
          {artifact.artifact_type === 'riddle' && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">❓</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.riddle.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.riddle.promptLabel')}</label>
                <Textarea
                  value={(artifact.metadata?.prompt as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, prompt: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder={t('artifact.riddle.promptPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.riddle.answersLabel')}</label>
                <Textarea
                  value={((artifact.metadata?.correctAnswers as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        correctAnswers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  rows={3}
                  placeholder={t('artifact.riddle.answersPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('artifact.riddle.answersHelp')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.riddle.matchModeLabel')}</label>
                  <Select
                    value={(artifact.metadata?.normalizeMode as string) || 'fuzzy'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, normalizeMode: e.target.value },
                      })
                    }
                    options={[
                      { value: 'strict', label: t('artifact.riddle.matchModeExact') },
                      { value: 'fuzzy', label: t('artifact.riddle.matchModeFlexible') },
                      { value: 'numeric', label: t('artifact.riddle.matchModeNumeric') },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.riddle.maxAttemptsLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={(artifact.metadata?.maxAttempts as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxAttempts: val },
                      });
                    }}
                    placeholder={t('artifact.riddle.maxAttemptsPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Counter configuration */}
          {artifact.artifact_type === 'counter' && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔢</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.counter.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.counter.initialLabel')}</label>
                  <Input
                    type="number"
                    value={(artifact.metadata?.initialValue as number) ?? 0}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, initialValue: parseInt(e.target.value, 10) || 0 },
                      })
                    }
                    placeholder={t('artifact.counter.initialPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.counter.targetLabel')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.target as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10) || 1;
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, target: val },
                      });
                    }}
                    placeholder={t('artifact.counter.targetPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.counter.stepLabel')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.step as number) ?? 1}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, step: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    placeholder={t('artifact.counter.stepPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.counter.labelLabel')}</label>
                <Input
                  value={(artifact.metadata?.label as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, label: e.target.value },
                    })
                  }
                  placeholder={t('artifact.counter.labelPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Audio configuration */}
          {artifact.artifact_type === 'audio' && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔊</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.audio.title')}</h4>
              </div>
              <AudioUploadEditor
                tenantId={null}
                value={((): AudioUploadEditorValue => {
                  const raw = artifact.metadata as unknown;
                  const meta = isRecord(raw) ? raw : {};
                  const audioRef = isStorageRef(meta.audioRef)
                    ? (meta.audioRef as unknown as AudioUploadEditorValue['audioRef'])
                    : null;
                  const autoPlay = meta.autoplay === true || meta.autoPlay === true;
                  const requireAck = meta.requireAck === true;
                  return { audioRef, autoPlay, requireAck };
                })()}
                onChange={(next) => {
                  const raw = artifact.metadata as unknown;
                  const meta = isRecord(raw) ? raw : {};
                  updateArtifact(idx, {
                    metadata: {
                      ...meta,
                      audioRef: next.audioRef ?? undefined,
                      autoplay: next.autoPlay,
                      autoPlay: next.autoPlay,
                      requireAck: next.requireAck,
                    },
                  });
                }}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.audio.urlLabel')}</label>
                <Input
                  value={(artifact.metadata?.audioUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, audioUrl: e.target.value },
                    })
                  }
                  placeholder={t('artifact.audio.urlPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Hotspot configuration */}
          {artifact.artifact_type === 'hotspot' && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.hotspot.title')}</h4>
              </div>

              <InteractiveImageEditor
                tenantId={null}
                value={((): InteractiveImageEditorValue => {
                  const raw = artifact.metadata as unknown;
                  const meta = isRecord(raw) ? raw : {};
                  const imageRef = isStorageRef(meta.imageRef)
                    ? (meta.imageRef as unknown as InteractiveImageEditorValue['imageRef'])
                    : null;
                  const zones = Array.isArray(meta.zones)
                    ? (meta.zones as unknown as InteractiveImageEditorValue['zones'])
                    : [];
                  return { imageRef, zones };
                })()}
                onChange={(next) => {
                  const raw = artifact.metadata as unknown;
                  const meta = isRecord(raw) ? raw : {};
                  updateArtifact(idx, {
                    metadata: {
                      ...meta,
                      imageRef: next.imageRef ?? undefined,
                      zones: next.zones,
                    },
                  });
                }}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.hotspot.imageLabel')}</label>
                <Input
                  value={(artifact.metadata?.imageUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, imageUrl: e.target.value },
                    })
                  }
                  placeholder={t('artifact.hotspot.imagePlaceholder')}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.hotspot.requiredHitsLabel')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={(artifact.metadata?.requiredHits as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, requiredHits: val },
                      });
                    }}
                    placeholder={t('artifact.hotspot.requiredHitsPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.hotspot.showFeedbackLabel')}</label>
                  <Select
                    value={(artifact.metadata?.showFeedback as boolean) !== false ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, showFeedback: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: t('artifact.hotspot.showFeedbackYes') },
                      { value: 'false', label: t('artifact.hotspot.showFeedbackNo') },
                    ]}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('artifact.hotspot.helpText')}
              </p>
            </div>
          )}

          {/* Tile Puzzle configuration */}
          {artifact.artifact_type === 'tile_puzzle' && (
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧩</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.tilePuzzle.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.tilePuzzle.imageLabel')}</label>
                <Input
                  value={(artifact.metadata?.imageUrl as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, imageUrl: e.target.value },
                    })
                  }
                  placeholder={t('artifact.tilePuzzle.imagePlaceholder')}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.tilePuzzle.gridLabel')}</label>
                  <Select
                    value={String((artifact.metadata?.gridSize as number) || 3)}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, gridSize: parseInt(e.target.value, 10) },
                      })
                    }
                    options={[
                      { value: '2', label: t('artifact.tilePuzzle.grid2') },
                      { value: '3', label: t('artifact.tilePuzzle.grid3') },
                      { value: '4', label: t('artifact.tilePuzzle.grid4') },
                      { value: '5', label: t('artifact.tilePuzzle.grid5') },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.tilePuzzle.previewLabel')}</label>
                  <Select
                    value={(artifact.metadata?.showPreview as boolean) ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, showPreview: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: t('artifact.common.yes') },
                      { value: 'false', label: t('artifact.common.no') },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cipher configuration */}
          {artifact.artifact_type === 'cipher' && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔤</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.cipher.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.cipher.methodLabel')}</label>
                  <Select
                    value={(artifact.metadata?.cipherMethod as string) || 'caesar'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, cipherMethod: e.target.value },
                      })
                    }
                    options={[
                      { value: 'caesar', label: t('artifact.cipher.methodCaesar') },
                      { value: 'atbash', label: t('artifact.cipher.methodAtbash') },
                      { value: 'vigenere', label: t('artifact.cipher.methodVigenere') },
                      { value: 'substitution', label: t('artifact.cipher.methodSubstitution') },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {(artifact.metadata?.cipherMethod as string) === 'caesar'
                      ? t('artifact.cipher.keyLabelCaesar')
                      : t('artifact.cipher.keyLabelVigenere')}
                  </label>
                  <Input
                    value={(artifact.metadata?.cipherKey as string) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, cipherKey: e.target.value },
                      })
                    }
                    placeholder={(artifact.metadata?.cipherMethod as string) === 'caesar'
                      ? t('artifact.cipher.keyPlaceholderCaesar')
                      : t('artifact.cipher.keyPlaceholderVigenere')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.cipher.plaintextLabel')}</label>
                <Textarea
                  value={(artifact.metadata?.plaintext as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, plaintext: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder={t('artifact.cipher.plaintextPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Logic Grid configuration */}
          {artifact.artifact_type === 'logic_grid' && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.logicGrid.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.logicGrid.rowsLabel')}</label>
                  <Input
                    value={((artifact.metadata?.rows as string[]) || []).join(', ')}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: {
                          ...artifact.metadata,
                          rows: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder={t('artifact.logicGrid.rowsPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.logicGrid.columnsLabel')}</label>
                  <Input
                    value={((artifact.metadata?.columns as string[]) || []).join(', ')}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: {
                          ...artifact.metadata,
                          columns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder={t('artifact.logicGrid.columnsPlaceholder')}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('artifact.logicGrid.helpText')}{' '}
                <code className="font-mono">{t('artifact.logicGrid.helpCode')}</code>
              </p>
            </div>
          )}

          {/* Multi-answer configuration */}
          {artifact.artifact_type === 'multi_answer' && (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.multiAnswer.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.multiAnswer.itemsLabel')}</label>
                <Textarea
                  value={((artifact.metadata?.items as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  rows={4}
                  placeholder={t('artifact.multiAnswer.itemsPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.multiAnswer.requiredCountLabel')}</label>
                <Input
                  type="number"
                  min={1}
                  value={(artifact.metadata?.requiredCount as number) || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, requiredCount: val },
                    });
                  }}
                  placeholder={t('artifact.multiAnswer.requiredCountPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* QR/NFC Gate configuration */}
          {artifact.artifact_type === 'qr_gate' && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.qrGate.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.qrGate.expectedLabel')}</label>
                <Input
                  value={(artifact.metadata?.expectedValue as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, expectedValue: e.target.value },
                    })
                  }
                  placeholder={t('artifact.qrGate.expectedPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('artifact.qrGate.expectedHelp')}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.qrGate.successLabel')}</label>
                <Input
                  value={(artifact.metadata?.successMessage as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, successMessage: e.target.value },
                    })
                  }
                  placeholder={t('artifact.qrGate.successPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Hint Container configuration */}
          {artifact.artifact_type === 'hint_container' && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.hintContainer.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.hintContainer.hintsLabel')}</label>
                <Textarea
                  value={((artifact.metadata?.hints as string[]) || []).join('\n')}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: {
                        ...artifact.metadata,
                        hints: e.target.value.split('\n').filter(Boolean),
                      },
                    })
                  }
                  rows={5}
                  placeholder={t('artifact.hintContainer.hintsPlaceholder')}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.hintContainer.maxHintsLabel')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.maxHints as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxHints: val },
                      });
                    }}
                    placeholder={t('artifact.hintContainer.maxHintsPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.hintContainer.penaltyLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={(artifact.metadata?.penaltyPerHint as number) ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, penaltyPerHint: val },
                      });
                    }}
                    placeholder={t('artifact.hintContainer.penaltyPlaceholder')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prop Confirmation configuration */}
          {artifact.artifact_type === 'prop_confirmation' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.propConfirmation.title')}</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.propConfirmation.propNameLabel')}</label>
                <Input
                  value={(artifact.metadata?.propName as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, propName: e.target.value },
                    })
                  }
                  placeholder={t('artifact.propConfirmation.propNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.propConfirmation.instructionLabel')}</label>
                <Textarea
                  value={(artifact.metadata?.instruction as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, instruction: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder={t('artifact.propConfirmation.instructionPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Location Check configuration */}
          {artifact.artifact_type === 'location_check' && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.locationCheck.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.locationCheck.latitudeLabel')}</label>
                  <Input
                    type="number"
                    step="any"
                    value={(artifact.metadata?.latitude as number) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, latitude: parseFloat(e.target.value) || null },
                      })
                    }
                    placeholder={t('artifact.locationCheck.latitudePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.locationCheck.longitudeLabel')}</label>
                  <Input
                    type="number"
                    step="any"
                    value={(artifact.metadata?.longitude as number) || ''}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, longitude: parseFloat(e.target.value) || null },
                      })
                    }
                    placeholder={t('artifact.locationCheck.longitudePlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.locationCheck.radiusLabel')}</label>
                <Input
                  type="number"
                  min={1}
                  value={(artifact.metadata?.radius as number) || 50}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, radius: parseInt(e.target.value, 10) || 50 },
                    })
                  }
                  placeholder={t('artifact.locationCheck.radiusPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.locationCheck.locationNameLabel')}</label>
                <Input
                  value={(artifact.metadata?.locationName as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, locationName: e.target.value },
                    })
                  }
                  placeholder={t('artifact.locationCheck.locationNamePlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Sound Level configuration */}
          {artifact.artifact_type === 'sound_level' && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎤</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.soundLevel.title')}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.soundLevel.thresholdLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={(artifact.metadata?.threshold as number) ?? 70}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, threshold: parseInt(e.target.value, 10) || 70 },
                      })
                    }
                    placeholder={t('artifact.soundLevel.thresholdPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.soundLevel.holdLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={(artifact.metadata?.holdDuration as number) ?? 2}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, holdDuration: parseFloat(e.target.value) || 2 },
                      })
                    }
                    placeholder={t('artifact.soundLevel.holdPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('artifact.soundLevel.instructionLabel')}</label>
                <Input
                  value={(artifact.metadata?.instruction as string) || ''}
                  onChange={(e) =>
                    updateArtifact(idx, {
                      metadata: { ...artifact.metadata, instruction: e.target.value },
                    })
                  }
                  placeholder={t('artifact.soundLevel.instructionPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Replay Marker configuration */}
          {artifact.artifact_type === 'replay_marker' && (
            <div className="rounded-lg border border-slate-500/30 bg-slate-500/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <h4 className="text-sm font-semibold text-foreground">{t('artifact.replayMarker.title')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('artifact.replayMarker.description')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.replayMarker.maxMarkersLabel')}</label>
                  <Input
                    type="number"
                    min={1}
                    value={(artifact.metadata?.maxMarkers as number) || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, maxMarkers: val },
                      });
                    }}
                    placeholder={t('artifact.replayMarker.maxMarkersPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('artifact.replayMarker.allowLabelsLabel')}</label>
                  <Select
                    value={(artifact.metadata?.allowLabels as boolean) !== false ? 'true' : 'false'}
                    onChange={(e) =>
                      updateArtifact(idx, {
                        metadata: { ...artifact.metadata, allowLabels: e.target.value === 'true' },
                      })
                    }
                    options={[
                      { value: 'true', label: t('artifact.common.yes') },
                      { value: 'false', label: t('artifact.common.no') },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('artifact.fields.descriptionLabel')}</label>
            <Textarea
              value={artifact.description}
              onChange={(e) => updateArtifact(idx, { description: e.target.value })}
              rows={3}
              placeholder={t('artifact.fields.descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t('artifact.variants.title')}</p>
                <p className="text-xs text-muted-foreground">{t('artifact.variants.subtitle')}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateArtifact(idx, { variants: [...artifact.variants, createVariant()] })}
              >
                <PlusIcon className="h-4 w-4 mr-1.5" /> {t('artifact.variants.add')}
              </Button>
            </div>

            <div className="space-y-3">
              {artifact.variants.map((variant, vIdx) => (
                <div key={variant.id} className="rounded-lg border border-border/70 p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {vIdx + 1}
                      </span>
                      {t('artifact.variants.label')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => moveVariant(idx, vIdx, -1)}
                        disabled={vIdx === 0}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => moveVariant(idx, vIdx, 1)}
                        disabled={vIdx === artifact.variants.length - 1}
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => removeVariant(idx, vIdx)}
                        disabled={artifact.variants.length <= 1}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.titleLabel')}</label>
                      <Input
                        value={variant.title}
                        onChange={(e) => updateVariant(idx, vIdx, { title: e.target.value })}
                        placeholder={t('artifact.variants.titlePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.visibilityLabel')}</label>
                      <Select
                        value={variant.visibility}
                        onChange={(e) => updateVariant(idx, vIdx, { visibility: e.target.value as ArtifactVisibility })}
                        options={visibilityOptions}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.roleLabel')}</label>
                      <Select
                        value={variant.visible_to_role_id ?? ''}
                        onChange={(e) => updateVariant(idx, vIdx, { visible_to_role_id: e.target.value || null })}
                        options={[{ value: '', label: t('artifact.variants.roleNoneOption') }, ...roleOptions]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.mediaLabel')}</label>
                      <Input
                        value={variant.media_ref}
                        onChange={(e) => updateVariant(idx, vIdx, { media_ref: e.target.value })}
                        placeholder={t('artifact.variants.mediaPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('artifact.variants.bodyLabel')}</label>
                    <Textarea
                      value={variant.body}
                      onChange={(e) => updateVariant(idx, vIdx, { body: e.target.value })}
                      rows={4}
                      placeholder={t('artifact.variants.bodyPlaceholder')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.stepIndexLabel')}</label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, stepCount - 1)}
                        value={variant.step_index ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateVariant(idx, vIdx, { step_index: Number.isFinite(val) ? val : null });
                        }}
                        placeholder={t('artifact.variants.stepIndexPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t('artifact.variants.phaseIndexLabel')}</label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, phaseCount - 1)}
                        value={variant.phase_index ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateVariant(idx, vIdx, { phase_index: Number.isFinite(val) ? val : null });
                        }}
                        placeholder={t('artifact.variants.phaseIndexPlaceholder')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
          )}
        </Card>
        );
      })}

    </div>
  );
}

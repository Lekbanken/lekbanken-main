'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Input, Textarea, Select, Button, Card } from '@/components/ui';
import { 
  ArrowLeftIcon, 
  EyeIcon, 
  ArrowUturnLeftIcon, 
  ArrowUturnRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BuilderSectionNav,
  QualityChecklist,
  PlayModeSelector,
  StepEditor,
  SaveIndicator,
  PhaseEditor,
  RoleEditor,
  BoardEditor,
  StandardImagePicker,
  ArtifactEditor,
  TriggerEditor,
  GameFlowCanvas,
  MaterialEditor,
  type BuilderSection,
  type QualityState,
} from './components';
import { ValidationPanel } from './components/ValidationPanel';
import { validateGameRefs, type GameDataForValidation } from './utils/validateGameRefs';
import type { ArtifactFormData, ArtifactVariantFormData, TriggerFormData } from '@/types/games';
import { TOOL_REGISTRY } from '@/features/tools/registry';
import type { ToolScope } from '@/features/tools/types';
import { useGameBuilder } from '@/hooks/useGameBuilder';
import {
  type GameBuilderState,
  type StepData,
  type PhaseData,
  type RoleData,
  type BoardConfigData,
  type CoreForm,
  type MaterialsForm,
  type GameToolForm,
  type PlayMode,
  defaultCore,
  defaultMaterials,
  defaultBoardConfig,
  defaultCover,
} from '@/types/game-builder-state';

type Purpose = {
  id: string;
  name: string | null;
  type?: string | null;
  parent_id?: string | null;
};

// Helper to check if a string is a valid UUID
function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

const createVariantForm = (): ArtifactVariantFormData => ({
  id: makeId(),
  title: '',
  body: '',
  media_ref: '',
  visibility: 'public',
  visible_to_role_id: null,
  step_index: null,
  phase_index: null,
  metadata: null,
});

type GameBuilderPageProps = {
  gameId?: string;
};

const DEFAULT_GAME_TOOLS: GameToolForm[] = TOOL_REGISTRY.map((tool) => ({
  tool_key: tool.key,
  enabled: false,
  scope: tool.defaultScope,
}));

export function GameBuilderPage({ gameId }: GameBuilderPageProps) {
  const router = useRouter();
  const t = useTranslations('admin.games.builder.page');
  const isEditing = Boolean(gameId);

  // Use the centralized builder hook with history support
  const builder = useGameBuilder({ gameId });
  const {
    state,
    canUndo,
    canRedo,
    undo,
    redo,
    setCore,
    setSteps,
    setPhases,
    setRoles,
    setArtifacts,
    setTriggers,
    setMaterials,
    setBoardConfig,
    setGameTools,
    setSubPurposeIds,
    setCover,
    loadFromApi,
  } = builder;

  // Destructure state for convenience
  const {
    core,
    steps,
    materials,
    phases,
    roles,
    artifacts,
    triggers,
    boardConfig,
    gameTools,
    subPurposeIds,
    cover,
  } = state;

  // Purposes are loaded separately (not part of builder state)
  const [purposes, setPurposes] = useState<Purpose[]>([]);

  // UI state (not part of builder state)
  const [activeSection, setActiveSection] = useState<BuilderSection>('grundinfo');
  const [loading, setLoading] = useState(isEditing);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in text inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow undo/redo in text fields only with Ctrl+Z/Y
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          // Let browser handle undo in text fields
          return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          // Let browser handle redo in text fields
          return;
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const energyOptions = useMemo(
    () => [
      { value: '', label: t('classification.energyPlaceholder') },
      { value: 'low', label: t('classification.energyLow') },
      { value: 'medium', label: t('classification.energyMedium') },
      { value: 'high', label: t('classification.energyHigh') },
    ],
    [t]
  );

  const locationOptions = useMemo(
    () => [
      { value: '', label: t('classification.locationPlaceholder') },
      { value: 'indoor', label: t('classification.locationIndoor') },
      { value: 'outdoor', label: t('classification.locationOutdoor') },
      { value: 'both', label: t('classification.locationBoth') },
    ],
    [t]
  );

  const taxonomyPresets = useMemo(
    () => [
      t('settings.taxonomyPresets.boardGames'),
      t('settings.taxonomyPresets.partyGame'),
      t('settings.taxonomyPresets.circleGames'),
      t('settings.taxonomyPresets.outdoorGames'),
      t('settings.taxonomyPresets.indoorGames'),
      t('settings.taxonomyPresets.icebreakers'),
    ],
    [t]
  );

  // Load purposes for main/sub purpose selection
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/purposes');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('errors.loadPurposes'));
        setPurposes(data.purposes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.loadPurposes'));
      }
    })();
  }, [t]);

  const mainPurposeOptions = useMemo(
    () =>
      purposes
        .filter((p) => (p.type ?? 'main') !== 'sub')
        .map((p) => ({ value: p.id, label: p.name || t('purposes.unknownMain') })),
    [purposes, t]
  );

  const subPurposeOptions = useMemo(
    () =>
      purposes
        .filter((p) => (p.type ?? 'main') === 'sub' && (!core.main_purpose_id || p.parent_id === core.main_purpose_id))
        .map((p) => ({ value: p.id, label: p.name || t('purposes.unknownSub') })),
    [purposes, core.main_purpose_id, t]
  );

  useEffect(() => {
    if (!core.main_purpose_id && mainPurposeOptions.length > 0) {
      setCore((prev) => ({ ...prev, main_purpose_id: prev.main_purpose_id || mainPurposeOptions[0].value }));
    }
  }, [core.main_purpose_id, mainPurposeOptions]);

  useEffect(() => {
    setSubPurposeIds((prev) => prev.filter((id) => subPurposeOptions.some((opt) => opt.value === id)));
  }, [subPurposeOptions]);

  // Load existing game
  useEffect(() => {
    if (!gameId) return;
    
    void (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/games/builder/${gameId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('errors.loadGame'));
        
        const g = data.game;
        setCore({
          ...defaultCore,
          name: g.name || '',
          short_description: g.short_description || '',
          description: g.description || '',
          status: g.status || 'draft',
          play_mode: g.play_mode || 'basic',
          main_purpose_id: g.main_purpose_id || '',
          product_id: g.product_id,
          taxonomy_category: g.category || '',
          energy_level: g.energy_level,
          location_type: g.location_type,
          time_estimate_min: g.time_estimate_min,
          duration_max: g.duration_max,
          min_players: g.min_players,
          max_players: g.max_players,
          age_min: g.age_min,
          age_max: g.age_max,
          difficulty: g.difficulty,
          accessibility_notes: g.accessibility_notes || '',
          space_requirements: g.space_requirements || '',
          leader_tips: g.leader_tips || '',
        });

        const loadedSteps = ((data.steps as Partial<StepData>[] | undefined) ?? []).map(
          (s, idx) => ({
            id: s.id || `step-${idx}`,
            title: s.title || '',
            body: s.body || '',
            duration_seconds: s.duration_seconds ?? null,
            leader_script: s.leader_script || '',
            phase_id: (s as { phase_id?: string | null }).phase_id ?? null,
            media_ref: (s as { media_ref?: string | null }).media_ref ?? '',
          })
        );
        setSteps(loadedSteps);


        if (data.materials) {
          setMaterials({
            items: data.materials.items || [],
            safety_notes: data.materials.safety_notes || '',
            preparation: data.materials.preparation || '',
          });
        }

        // Load phases
        const loadedPhases = ((data.phases as Partial<PhaseData>[] | undefined) ?? []).map(
          (p, idx) => ({
            id: p.id || `phase-${idx}`,
            name: p.name || '',
            phase_type: p.phase_type || 'round',
            phase_order: p.phase_order ?? idx,
            duration_seconds: p.duration_seconds ?? null,
            timer_visible: p.timer_visible ?? true,
            timer_style: p.timer_style || 'countdown',
            description: p.description || '',
            board_message: p.board_message || '',
            auto_advance: p.auto_advance ?? false,
          })
        );
        setPhases(loadedPhases);


        // Load roles
        const loadedRoles = ((data.roles as Partial<RoleData>[] | undefined) ?? []).map(
          (r, idx) => ({
            id: r.id || `role-${idx}`,
            name: r.name || '',
            icon: r.icon || '??',
            color: r.color || '#3B82F6',
            role_order: r.role_order ?? idx,
            public_description: r.public_description || '',
            private_instructions: r.private_instructions || '',
            private_hints: r.private_hints || '',
            min_count: r.min_count ?? 0,
            max_count: r.max_count ?? null,
            assignment_strategy: r.assignment_strategy || 'random',
            scaling_rules: r.scaling_rules ?? null,
            conflicts_with: r.conflicts_with ?? null,
          })
        );
        setRoles(loadedRoles);

        const normalizeVariant = (variant: unknown, variantIndex: number): ArtifactVariantFormData => {
          const v = (variant || {}) as Record<string, unknown>;
          const rawMeta = (v.metadata as Record<string, unknown> | null) ?? null;
          const meta = rawMeta && typeof rawMeta === 'object' ? { ...rawMeta } : null;
          const stepIndex = typeof (meta?.step_index as unknown) === 'number' ? (meta?.step_index as number) : null;
          const phaseIndex = typeof (meta?.phase_index as unknown) === 'number' ? (meta?.phase_index as number) : null;
          if (meta && 'step_index' in meta) delete (meta as Record<string, unknown>).step_index;
          if (meta && 'phase_index' in meta) delete (meta as Record<string, unknown>).phase_index;

          const visibility = (v.visibility as ArtifactVariantFormData['visibility']) ?? 'public';

          return {
            id: (v.id as string) || `variant-${variantIndex}`,
            title: (v.title as string) || '',
            body: (v.body as string) || '',
            media_ref: (v.media_ref as string) || '',
            visibility: visibility === 'leader_only' || visibility === 'role_private' ? visibility : 'public',
            visible_to_role_id: (v.visible_to_role_id as string | null) ?? null,
            step_index: stepIndex,
            phase_index: phaseIndex,
            metadata: meta,
          };
        };

        const normalizeArtifact = (artifact: unknown, idx: number): ArtifactFormData => {
          const a = (artifact || {}) as Record<string, unknown>;
          const variantsRaw = Array.isArray(a.variants) ? (a.variants as unknown[]) : [];
          const variants = variantsRaw.map((v, j) => normalizeVariant(v, j));

          return {
            id: (a.id as string) || `artifact-${idx}`,
            title: (a.title as string) || '',
            description: (a.description as string) || '',
            artifact_type: (a.artifact_type as string) || 'card',
            tags: Array.isArray(a.tags) ? (a.tags as unknown[]).map((t) => String(t)).filter(Boolean) : [],
            metadata: (a.metadata as Record<string, unknown> | null) ?? null,
            variants: variants.length > 0 ? variants : [createVariantForm()],
          };
        };

        const loadedArtifacts = ((data.artifacts as unknown[]) ?? []).map((a, idx) => normalizeArtifact(a, idx));
        setArtifacts(loadedArtifacts);

        // Load triggers
        const loadedTriggers = ((data.triggers as Partial<TriggerFormData>[] | undefined) ?? []).map(
          (trigger) => ({
            id: trigger.id || `trigger-${Math.random().toString(36).slice(2, 9)}`,
            name: trigger.name || t('defaults.triggerName'),
            description: trigger.description || '',
            enabled: trigger.enabled ?? true,
            condition: trigger.condition || { type: 'manual' },
            actions: trigger.actions || [],
            execute_once: trigger.execute_once ?? true,
            delay_seconds: trigger.delay_seconds ?? 0,
          })
        );
        setTriggers(loadedTriggers);

        if (Array.isArray(data.secondaryPurposes)) {
          setSubPurposeIds((data.secondaryPurposes as string[]).filter(Boolean));
        }

        if (data.coverMedia) {
          setCover({
            mediaId: data.coverMedia.media_id ?? null,
            url: data.coverMedia.url ?? null,
          });
        }


        // Load board config
        if (data.boardConfig) {
          const bc = data.boardConfig as Partial<BoardConfigData> | undefined;
          if (bc) {
            setBoardConfig({
              show_game_name: bc.show_game_name ?? true,
              show_current_phase: bc.show_current_phase ?? true,
              show_timer: bc.show_timer ?? true,
              show_participants: bc.show_participants ?? true,
              show_public_roles: bc.show_public_roles ?? true,
              show_leaderboard: bc.show_leaderboard ?? false,
              show_qr_code: bc.show_qr_code ?? false,
              welcome_message: bc.welcome_message || '',
              theme: bc.theme || 'neutral',
              background_color: bc.background_color || '',
              layout_variant: bc.layout_variant || 'standard',
            });
          }
        }

        // Load toolbelt configuration
        const incomingTools = Array.isArray(data.gameTools) ? (data.gameTools as unknown[]) : [];
        const byKey = new Map<string, { enabled?: unknown; scope?: unknown }>();
        for (const raw of incomingTools) {
          if (!raw || typeof raw !== 'object') continue;
          const rec = raw as Record<string, unknown>;
          const toolKey = rec.tool_key;
          if (typeof toolKey !== 'string') continue;
          byKey.set(toolKey, { enabled: rec.enabled, scope: rec.scope });
        }

        setGameTools(
          DEFAULT_GAME_TOOLS.map((tool) => {
            const row = byKey.get(tool.tool_key);
            const enabled = typeof row?.enabled === 'boolean' ? row.enabled : tool.enabled;
            const scopeRaw = row?.scope;
            const scope: ToolScope = scopeRaw === 'host' || scopeRaw === 'participants' || scopeRaw === 'both' ? scopeRaw : tool.scope;
            return { ...tool, enabled, scope };
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.loadData'));
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId, t]);

  // Validation result (Task 2.6)
  const validationResult = useMemo(() => {
    const dataForValidation: GameDataForValidation = {
      artifacts,
      triggers: triggers
        .filter((t): t is typeof t & { id: string } => Boolean(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          enabled: t.enabled,
          condition: t.condition,
          actions: t.actions,
        })),
      steps: steps.map((s) => ({ id: s.id, title: s.title })),
      phases: phases.map((p) => ({ id: p.id, name: p.name })),
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
    };
    return validateGameRefs(dataForValidation);
  }, [artifacts, triggers, steps, phases, roles]);

  // Quality state calculation
  const qualityState: QualityState = useMemo(() => ({
    name: Boolean(core.name.trim()),
    shortDescription: Boolean(core.short_description.trim()),
    purposeSelected: Boolean(core.main_purpose_id),
    subPurposeSelected: subPurposeIds.length > 0,
    coverImageSelected: Boolean(cover.mediaId),
    hasStepsOrDescription: steps.length > 0 || Boolean(core.description.trim()),
    energyLevel: Boolean(core.energy_level),
    location: Boolean(core.location_type),
    allRequiredMet: Boolean(
      core.name.trim() &&
      core.short_description.trim() &&
      core.main_purpose_id &&
      (steps.length > 0 || core.description.trim()) &&
      cover.mediaId
    ),
    noValidationErrors: validationResult.isValid,
    reviewed: false,
  }), [core, steps, subPurposeIds, cover, validationResult.isValid]);

  // Completed sections
  const completedSections = useMemo(() => {
    const completed: BuilderSection[] = [];
    if (qualityState.name && qualityState.shortDescription) completed.push('grundinfo');
    if (steps.length > 0) completed.push('steg');
    if (materials.items.length > 0) completed.push('material');
    if (materials.safety_notes) completed.push('sakerhet');
    if (phases.length > 0) completed.push('faser');
    if (roles.length > 0) completed.push('roller');
    if (artifacts.length > 0) completed.push('artifacts');
    if (triggers.length > 0) completed.push('triggers');
    // Board config is complete if at least one element is visible or welcome_message is set
    const hasBoardContent = boardConfig.show_game_name || boardConfig.show_current_phase ||
      boardConfig.show_timer || boardConfig.show_participants || boardConfig.show_public_roles ||
      boardConfig.show_qr_code || boardConfig.welcome_message.trim();
    if (hasBoardContent) completed.push('tavla');

    if (gameTools.some((t) => t.enabled)) completed.push('verktyg');
    return completed;
  }, [qualityState, steps, materials, phases, roles, artifacts, triggers, boardConfig, gameTools]);

  // Save handler
  const handleSave = useCallback(async (options?: { status?: 'draft' | 'published' }) => {
    setSaveStatus('saving');
    setError(null);

    try {
      const payload = {
        core: {
          ...core,
          category: core.taxonomy_category || null,
          status: options?.status ?? core.status,
          name: core.name.trim(),
          short_description: core.short_description.trim(),
          description: core.description || null,
        },
        steps: steps.map((s, idx) => ({
          id: isUuid(s.id) ? s.id : undefined,
          title: s.title,
          body: s.body,
          duration_seconds: s.duration_seconds,
          leader_script: s.leader_script || null,
          step_order: idx,
          phase_id: s.phase_id || null,
          media_ref: s.media_ref || null,
        })),
        materials: {
          items: materials.items,
          safety_notes: materials.safety_notes || null,
          preparation: materials.preparation || null,
        },
        phases: phases.map((p, idx) => ({
          id: isUuid(p.id) ? p.id : undefined,
          name: p.name,
          phase_type: p.phase_type,
          phase_order: idx,
          duration_seconds: p.duration_seconds,
          timer_visible: p.timer_visible,
          timer_style: p.timer_style,
          description: p.description || null,
          board_message: p.board_message || null,
          auto_advance: p.auto_advance,
        })),
        roles: roles.map((r, idx) => ({
          id: isUuid(r.id) ? r.id : undefined,
          name: r.name,
          icon: r.icon || null,
          color: r.color || null,
          role_order: idx,
          public_description: r.public_description || null,
          private_instructions: r.private_instructions || null,
          private_hints: r.private_hints || null,
          min_count: r.min_count,
          max_count: r.max_count,
          assignment_strategy: r.assignment_strategy,
          scaling_rules: r.scaling_rules,
          conflicts_with: r.conflicts_with,
        })),
        artifacts: artifacts.map((a, idx) => {
          const variants = a.variants.map((v, j) => {
            const meta: Record<string, unknown> = { ...(v.metadata ?? {}) };
            if (v.step_index !== null && v.step_index !== undefined) meta.step_index = v.step_index;
            if (v.phase_index !== null && v.phase_index !== undefined) meta.phase_index = v.phase_index;
            const hasMeta = Object.keys(meta).length > 0;

            return {
              id: isUuid(v.id) ? v.id : undefined,
              title: v.title || null,
              body: v.body || null,
              media_ref: v.media_ref || null,
              variant_order: j,
              visibility: v.visibility,
              visible_to_role_id: v.visible_to_role_id || null,
              metadata: hasMeta ? meta : null,
              step_index: v.step_index,
              phase_index: v.phase_index,
            };
          });

          return {
            id: isUuid(a.id) ? a.id : undefined,
            title: a.title,
            description: a.description || null,
            artifact_type: a.artifact_type || 'card',
            artifact_order: idx,
            tags: a.tags,
            metadata: a.metadata ?? null,
            variants,
          };
        }),
        boardConfig: {
          show_game_name: boardConfig.show_game_name,
          show_current_phase: boardConfig.show_current_phase,
          show_timer: boardConfig.show_timer,
          show_participants: boardConfig.show_participants,
          show_public_roles: boardConfig.show_public_roles,
          show_leaderboard: boardConfig.show_leaderboard,
          show_qr_code: boardConfig.show_qr_code,
          welcome_message: boardConfig.welcome_message || null,
          theme: boardConfig.theme,
          background_color: boardConfig.background_color || null,
          layout_variant: boardConfig.layout_variant,
        },
        triggers: triggers.map((t, idx) => ({
          id: isUuid(t.id) ? t.id : undefined,
          name: t.name,
          description: t.description || null,
          enabled: t.enabled,
          condition: t.condition,
          actions: t.actions,
          execute_once: t.execute_once,
          delay_seconds: t.delay_seconds,
          sort_order: idx,
        })),
        secondaryPurposes: subPurposeIds,
        coverMediaId: cover.mediaId,
        tools: gameTools,
      };

      const res = await fetch(
        gameId ? `/api/games/builder/${gameId}` : '/api/games/builder',
        {
          method: gameId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        const detailsText =
          data?.details
            ? typeof data.details === 'string'
              ? data.details
              : JSON.stringify(data.details)
            : '';
        const msg = data?.error || t('errors.saveFailed');
        throw new Error(detailsText ? `${msg} (${detailsText})` : msg);
      }

      setSaveStatus('saved');
      setLastSaved(new Date());

      if (!gameId && data.gameId) {
        router.replace(`/admin/games/${data.gameId}/edit`);
      }
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
    }
  }, [core, steps, materials, phases, roles, artifacts, triggers, boardConfig, gameId, router, subPurposeIds, cover, gameTools, t]);

  // Publish handler
  const handlePublish = useCallback(async () => {
    if (!qualityState.allRequiredMet) {
      setError(t('errors.publishMissingRequired'));
      return;
    }
    setCore((prev) => ({ ...prev, status: 'published' }));
    await handleSave({ status: 'published' });
  }, [handleSave, qualityState.allRequiredMet, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{t('loadingGame')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/games"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('header.backToGames')}</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold text-foreground">
              {isEditing ? t('header.editTitle') : t('header.createTitle')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <SaveIndicator
              status={saveStatus}
              lastSaved={lastSaved}
              onRetry={() => handleSave()}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!gameId}
            >
              <EyeIcon className="h-4 w-4 mr-1.5" />
              {t('header.preview')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSave()}
              disabled={saveStatus === 'saving'}
            >
              {t('header.saveDraft')}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={!qualityState.allRequiredMet || saveStatus === 'saving'}
            >
              {t('header.publish')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex">
        {/* Left sidebar - Section navigation */}
        <aside className="hidden lg:block w-64 border-r border-border bg-muted/30 min-h-[calc(100vh-4rem)]">
          <BuilderSectionNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            playMode={core.play_mode}
            completedSections={completedSections}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 max-w-4xl">
          {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Grundinfo Section */}
          {activeSection === 'grundinfo' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('basicInfo.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('basicInfo.description')}
                </p>
              </div>

              {/* Card 1: Namn & Beskrivningar */}
              <Card className="p-6 space-y-5">
                {/* Namn */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    {t('basicInfo.nameLabel')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={core.name}
                    onChange={(e) => setCore({ name: e.target.value })}
                    placeholder={t('basicInfo.namePlaceholder')}
                    className={!core.name ? 'border-amber-300 focus:border-amber-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <InformationCircleIcon className="h-3.5 w-3.5" />
                    {t('basicInfo.nameHint')}
                  </p>
                </div>

                {/* Kort beskrivning */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      {t('basicInfo.shortDescriptionLabel')} <span className="text-destructive">*</span>
                    </label>
                    <span className={`text-xs ${(core.short_description?.length || 0) > 150 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {core.short_description?.length || 0}/150
                    </span>
                  </div>
                  <Textarea
                    value={core.short_description}
                    onChange={(e) => setCore({ short_description: e.target.value })}
                    rows={2}
                    placeholder={t('basicInfo.shortDescriptionPlaceholder')}
                    className={!core.short_description ? 'border-amber-300 focus:border-amber-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <InformationCircleIcon className="h-3.5 w-3.5" />
                    {t('basicInfo.shortDescriptionHint')}
                  </p>
                </div>

                {/* Fullständig beskrivning */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('basicInfo.fullDescriptionLabel')}
                  </label>
                  <Textarea
                    value={core.description}
                    onChange={(e) => setCore({ description: e.target.value })}
                    rows={5}
                    placeholder={t('basicInfo.fullDescriptionPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <InformationCircleIcon className="h-3.5 w-3.5" />
                    {t('basicInfo.fullDescriptionHint')}
                  </p>
                </div>
              </Card>

              {/* Card 2: Syfte & Omslagsbild */}
              <Card className="p-6 space-y-4">
                <h3 className="font-medium text-foreground">{t('purposes.title')}</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t('purposes.mainLabel')} <span className="text-destructive">{t('common.required')}</span>
                    </label>
                    <Select
                      value={core.main_purpose_id}
                      onChange={(e) => setCore({ main_purpose_id: e.target.value })}
                      options={
                        mainPurposeOptions.length > 0
                          ? mainPurposeOptions
                          : [{ value: '', label: t('purposes.loadingOption') }]
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('purposes.subLabel')}</label>
                    <div className="rounded-lg border border-border p-3 space-y-2 max-h-32 overflow-y-auto">
                      {subPurposeOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t('purposes.emptyHint')}</p>
                      )}
                      {subPurposeOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border"
                            checked={subPurposeIds.includes(opt.value)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSubPurposeIds((prev) =>
                                checked ? [...prev, opt.value] : prev.filter((id) => id !== opt.value)
                              );
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <StandardImagePicker
                  mainPurposeId={core.main_purpose_id || null}
                  mainPurposeName={mainPurposeOptions.find(p => p.value === core.main_purpose_id)?.label || null}
                  selectedMediaId={cover.mediaId}
                  selectedUrl={cover.url}
                  onSelect={(mediaId, url) => setCover({ mediaId, url })}
                  onClear={() => setCover({ mediaId: null, url: null })}
                />
              </Card>

              {/* Card 3: Klassificering */}
              <Card className="p-6 space-y-5">
                <h3 className="font-medium text-foreground">{t('classification.title')}</h3>

                {/* Energi & Plats */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('classification.energyLabel')}</label>
                    <Select
                      value={core.energy_level || ''}
                      onChange={(e) => setCore({ energy_level: e.target.value || null })}
                      options={energyOptions}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('classification.locationLabel')}</label>
                    <Select
                      value={core.location_type || ''}
                      onChange={(e) => setCore({ location_type: e.target.value || null })}
                      options={locationOptions}
                    />
                  </div>
                </div>

                {/* Tid */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('classification.timeLabel')}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={core.time_estimate_min ?? ''}
                      onChange={(e) => setCore({ time_estimate_min: e.target.value ? Number(e.target.value) : null })}
                      placeholder={t('classification.timePlaceholder')}
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">{t('classification.timeUnit')}</span>
                  </div>
                </div>

                {/* Antal spelare - grupperat */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('classification.playersLabel')}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={core.min_players ?? ''}
                      onChange={(e) => setCore({ min_players: e.target.value ? Number(e.target.value) : null })}
                      placeholder={t('classification.minPlayersPlaceholder')}
                      className="max-w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min={0}
                      value={core.max_players ?? ''}
                      onChange={(e) => setCore({ max_players: e.target.value ? Number(e.target.value) : null })}
                      placeholder={t('classification.maxPlayersPlaceholder')}
                      className="max-w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">{t('classification.playersUnit')}</span>
                  </div>
                </div>

                {/* Ålder - grupperat */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('classification.ageLabel')}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={core.age_min ?? ''}
                      onChange={(e) => setCore({ age_min: e.target.value ? Number(e.target.value) : null })}
                      placeholder={t('classification.ageMinPlaceholder')}
                      className="max-w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">–</span>
                    <Input
                      type="number"
                      min={0}
                      value={core.age_max ?? ''}
                      onChange={(e) => setCore({ age_max: e.target.value ? Number(e.target.value) : null })}
                      placeholder={t('classification.ageMaxPlaceholder')}
                      className="max-w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">{t('classification.ageUnit')}</span>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Översikt Section */}
          {activeSection === 'oversikt' && (
            <section>
              <GameFlowCanvas
                state={state}
                onNavigate={(section, entityId) => {
                  setActiveSection(section);
                  // If entityId is provided, we could scroll to or focus that entity
                  // For now, just navigate to the section
                }}
              />
            </section>
          )}

          {/* Steg Section */}
          {activeSection === 'steg' && (
            <section>
              <StepEditor
                steps={steps}
                phases={phases.map((p) => ({ id: p.id, name: p.name }))}
                onChange={setSteps}
              />
            </section>
          )}

          {/* Material Section */}
          {activeSection === 'material' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('materials.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('materials.description')}
                </p>
              </div>

              <Card className="p-6">
                <MaterialEditor
                  materials={materials}
                  onChange={setMaterials}
                />
              </Card>
            </section>
          )}

          {/* Säkerhet Section */}
          {activeSection === 'sakerhet' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('safety.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('safety.description')}
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('safety.safetyNotesLabel')}
                  </label>
                  <Textarea
                    value={materials.safety_notes}
                    onChange={(e) => setMaterials({ safety_notes: e.target.value })}
                    rows={4}
                    placeholder={t('safety.safetyNotesPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('safety.accessibilityLabel')}
                  </label>
                  <Textarea
                    value={core.accessibility_notes}
                    onChange={(e) => setCore({ accessibility_notes: e.target.value })}
                    rows={3}
                    placeholder={t('safety.accessibilityPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('safety.spaceLabel')}
                  </label>
                  <Textarea
                    value={core.space_requirements}
                    onChange={(e) => setCore({ space_requirements: e.target.value })}
                    rows={2}
                    placeholder={t('safety.spacePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('safety.leaderTipsLabel')}
                  </label>
                  <Textarea
                    value={core.leader_tips}
                    onChange={(e) => setCore({ leader_tips: e.target.value })}
                    rows={3}
                    placeholder={t('safety.leaderTipsPlaceholder')}
                  />
                </div>
              </Card>
            </section>
          )}

          {/* Spelläge Section */}
          {activeSection === 'spellage' && (
            <section className="space-y-6">
              <PlayModeSelector
                value={core.play_mode}
                onChange={(mode) => setCore({ play_mode: mode })}
              />
            </section>
          )}

          {/* Faser Section */}
          {activeSection === 'faser' && (
            <section>
              <PhaseEditor
                phases={phases}
                onChange={setPhases}
              />
            </section>
          )}

          {/* Artifacts Section */}
          {activeSection === 'artifacts' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('artifacts.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('artifacts.description')}
                </p>
              </div>

              <ArtifactEditor
                artifacts={artifacts}
                roles={roles}
                stepCount={steps.length}
                phaseCount={phases.length}
                onChange={setArtifacts}
              />

              {roles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('artifacts.rolesHint')}
                </p>
              )}
            </section>
          )}

          {/* Triggers Section */}
          {activeSection === 'triggers' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('triggers.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('triggers.description')}
                </p>
              </div>

              <TriggerEditor
                triggers={triggers}
                phases={phases.map((p, idx) => ({ id: p.id || `phase-${idx}`, game_id: gameId || '', name: p.name, phase_type: p.phase_type, phase_order: idx, duration_seconds: p.duration_seconds, timer_visible: p.timer_visible, timer_style: p.timer_style, description: p.description, board_message: p.board_message, auto_advance: p.auto_advance, locale: null, created_at: '', updated_at: '' }))}
                steps={steps.map((s, idx) => ({ id: s.id || `step-${idx}`, game_id: gameId || '', step_order: idx, title: s.title || null, body: s.body || null, duration_seconds: s.duration_seconds, leader_script: s.leader_script || null, display_mode: s.display_mode || null, locale: null, phase_id: null, participant_prompt: null, board_text: null, media_ref: s.media_ref || null, optional: false, conditional: null, created_at: '', updated_at: '' }))}
                artifacts={artifacts.map((a, idx) => ({ id: a.id || `artifact-${idx}`, game_id: gameId || '', title: a.title, description: a.description, artifact_type: a.artifact_type, artifact_order: idx, tags: a.tags, metadata: a.metadata || null, locale: null }))}
                onChange={setTriggers}
              />

              {artifacts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('triggers.artifactsHint')}
                </p>
              )}
            </section>
          )}

          {/* Roller Section */}
          {activeSection === 'roller' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('roles.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('roles.description')}
                </p>
              </div>

              <RoleEditor
                roles={roles}
                onChange={setRoles}
              />
            </section>
          )}

          {/* Tavla Section */}
          {activeSection === 'tavla' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('board.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('board.description')}
                </p>
              </div>

              <BoardEditor
                config={boardConfig}
                gameName={core.name}
                onChange={setBoardConfig}
              />
            </section>
          )}

          {/* Verktyg (Toolbelt) Section */}
          {activeSection === 'verktyg' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('tools.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('tools.description')}
                </p>
              </div>

              <Card className="p-6 space-y-4">
                {TOOL_REGISTRY.map((tool) => {
                  const current = gameTools.find((t) => t.tool_key === tool.key) ?? {
                    tool_key: tool.key,
                    enabled: false,
                    scope: tool.defaultScope,
                  };

                  return (
                    <div key={tool.key} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border"
                              checked={current.enabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setGameTools((prev) =>
                                  prev.map((t) => (t.tool_key === tool.key ? { ...t, enabled: checked } : t))
                                );
                              }}
                            />
                            <span className="text-sm font-medium text-foreground">{tool.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">{t('tools.availabilityLabel')}</label>
                          <Select
                            value={current.scope}
                            onChange={(e) => {
                              const value = e.target.value as ToolScope;
                              setGameTools((prev) =>
                                prev.map((t) => (t.tool_key === tool.key ? { ...t, scope: value } : t))
                              );
                            }}
                            options={[
                              { value: 'host', label: t('tools.availabilityHost') },
                              { value: 'participants', label: t('tools.availabilityParticipants') },
                              { value: 'both', label: t('tools.availabilityBoth') },
                            ]}
                            disabled={!current.enabled}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('tools.availabilityHelp')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          {/* Översättningar Section (placeholder) */}
          {activeSection === 'oversattningar' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('translations.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('translations.description')}
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇸🇪</span>
                      <span className="font-medium">{t('translations.languageSwedish')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-muted-foreground">{t('translations.percent', { percent: 100 })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇳🇴</span>
                      <span className="font-medium">{t('translations.languageNorwegian')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted" />
                      <span className="text-sm text-muted-foreground">{t('translations.percent', { percent: 0 })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇬🇧</span>
                      <span className="font-medium">{t('translations.languageEnglish')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted" />
                      <span className="text-sm text-muted-foreground">{t('translations.percent', { percent: 0 })}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('translations.comingSoon')}
                </p>
              </Card>
            </section>
          )}

          {/* Inställningar Section */}
          {activeSection === 'installningar' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">{t('settings.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.description')}
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('settings.taxonomyLabel')}</label>
                  <Input
                    value={core.taxonomy_category}
                    placeholder={t('settings.taxonomyPlaceholder')}
                    onChange={(e) => setCore({ taxonomy_category: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {taxonomyPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="rounded-full border border-border px-2 py-1 hover:border-primary hover:text-primary"
                        onClick={() => setCore((prev) => ({ ...prev, taxonomy_category: preset }))}
                      >
                        {preset}
                      </button>
                    ))}
                    <span className="text-[11px] text-muted-foreground/70">
                      {t('settings.taxonomyNote')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('settings.statusLabel')}</label>
                  <Select
                    value={core.status}
                    onChange={(e) => setCore({ status: e.target.value as 'draft' | 'published' })}
                    options={[
                      { value: 'draft', label: t('settings.statusDraft') },
                      { value: 'published', label: t('settings.statusPublished') },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {core.status === 'draft' ? t('settings.statusHelpDraft') : t('settings.statusHelpPublished')}
                  </p>
                </div>
              </Card>

              {gameId && (
                <Card className="p-6 border-destructive/20">
                  <h3 className="font-medium text-destructive mb-2">{t('settings.dangerTitle')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.dangerDescription')}
                  </p>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    {t('settings.deleteButton')}
                  </Button>
                </Card>
              )}
            </section>
          )}
        </main>

        {/* Right sidebar - Quality checklist */}
        <aside className="hidden xl:block w-72 border-l border-border bg-muted/30 min-h-[calc(100vh-4rem)] overflow-y-auto">
          <QualityChecklist
            state={qualityState}
            status={core.status}
          />
          
          {/* Validation Panel (Task 2.6) */}
          {(artifacts.length > 0 || triggers.length > 0) && (
            <div className="p-4 border-t">
              <ValidationPanel
                result={validationResult}
                onNavigateToItem={(section, _itemId) => {
                  // Navigate to the relevant section
                  if (section === 'triggers') {
                    setActiveSection('triggers');
                  } else if (section === 'artifacts') {
                    setActiveSection('artifacts');
                  } else if (section === 'steps') {
                    setActiveSection('steg');
                  } else if (section === 'phases') {
                    setActiveSection('faser');
                  } else if (section === 'roles') {
                    setActiveSection('roller');
                  }
                }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

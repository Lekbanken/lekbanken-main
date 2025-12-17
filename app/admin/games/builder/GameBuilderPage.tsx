'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Textarea, Select, Button, Card } from '@/components/ui';
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
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
  type BuilderSection,
  type QualityState,
  type StepData,
  type PhaseData,
  type RoleData,
  type BoardConfigData,
} from './components';

type PlayMode = 'basic' | 'facilitated' | 'participants';

type Purpose = {
  id: string;
  name: string | null;
  type?: string | null;
  parent_id?: string | null;
};

type CoreForm = {
  name: string;
  short_description: string;
  description: string;
  status: 'draft' | 'published';
  play_mode: PlayMode;
  main_purpose_id: string;
  product_id: string | null;
  taxonomy_category: string;
  energy_level: string | null;
  location_type: string | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string;
  space_requirements: string;
  leader_tips: string;
};

type MaterialsForm = {
  items: string[];
  safety_notes: string;
  preparation: string;
};

const defaultCore: CoreForm = {
  name: '',
  short_description: '',
  description: '',
  status: 'draft',
  play_mode: 'basic',
  main_purpose_id: '',
  product_id: null,
  taxonomy_category: '',
  energy_level: null,
  location_type: null,
  time_estimate_min: null,
  duration_max: null,
  min_players: null,
  max_players: null,
  age_min: null,
  age_max: null,
  difficulty: null,
  accessibility_notes: '',
  space_requirements: '',
  leader_tips: '',
};

const energyOptions = [
  { value: '', label: 'Välj energinivå' },
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medel' },
  { value: 'high', label: 'Hög' },
];

const locationOptions = [
  { value: '', label: 'Välj plats' },
  { value: 'indoor', label: 'Inomhus' },
  { value: 'outdoor', label: 'Utomhus' },
  { value: 'both', label: 'Båda' },
];

const taxonomyPresets = [
  'Brädspel',
  'Partylek',
  'Ringlekar',
  'Utelekar',
  'Inomhuslek',
  'Isbrytare',
];

type GameBuilderPageProps = {
  gameId?: string;
};

export function GameBuilderPage({ gameId }: GameBuilderPageProps) {
  const router = useRouter();
  const isEditing = Boolean(gameId);

  // Form state
  const [core, setCore] = useState<CoreForm>(defaultCore);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [materials, setMaterials] = useState<MaterialsForm>({
    items: [],
    safety_notes: '',
    preparation: '',
  });
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [subPurposeIds, setSubPurposeIds] = useState<string[]>([]);
  const [cover, setCover] = useState<{ mediaId: string | null; url: string | null }>({ mediaId: null, url: null });
  const [boardConfig, setBoardConfig] = useState<BoardConfigData>({
    show_game_name: true,
    show_current_phase: true,
    show_timer: true,
    show_participants: true,
    show_public_roles: true,
    show_leaderboard: false,
    show_qr_code: false,
    welcome_message: '',
    theme: 'neutral',
    background_color: '',
    layout_variant: 'standard',
  });

  // UI state
  const [activeSection, setActiveSection] = useState<BuilderSection>('grundinfo');
  const [loading, setLoading] = useState(isEditing);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load purposes for main/sub purpose selection
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/purposes');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kunde inte ladda syften');
        setPurposes(data.purposes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte ladda syften');
      }
    })();
  }, []);

  const mainPurposeOptions = useMemo(
    () =>
      purposes
        .filter((p) => (p.type ?? 'main') !== 'sub')
        .map((p) => ({ value: p.id, label: p.name || 'Okänt syfte' })),
    [purposes]
  );

  const subPurposeOptions = useMemo(
    () =>
      purposes
        .filter((p) => (p.type ?? 'main') === 'sub' && (!core.main_purpose_id || p.parent_id === core.main_purpose_id))
        .map((p) => ({ value: p.id, label: p.name || 'Okänt undersyfte' })),
    [purposes, core.main_purpose_id]
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
        const res = await fetch(`/api/games/builder/${gameId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kunde inte ladda spel');
        
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte ladda data');
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

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
    noValidationErrors: true,
    reviewed: false,
  }), [core, steps, subPurposeIds, cover]);

  // Completed sections
  const completedSections = useMemo(() => {
    const completed: BuilderSection[] = [];
    if (qualityState.name && qualityState.shortDescription) completed.push('grundinfo');
    if (steps.length > 0) completed.push('steg');
    if (materials.items.length > 0) completed.push('material');
    if (materials.safety_notes) completed.push('sakerhet');
    if (phases.length > 0) completed.push('faser');
    if (roles.length > 0) completed.push('roller');
    // Board config is complete if at least one element is visible or welcome_message is set
    const hasBoardContent = boardConfig.show_game_name || boardConfig.show_current_phase ||
      boardConfig.show_timer || boardConfig.show_participants || boardConfig.show_public_roles ||
      boardConfig.show_qr_code || boardConfig.welcome_message.trim();
    if (hasBoardContent) completed.push('tavla');
    return completed;
  }, [qualityState, steps, materials, phases, roles, boardConfig]);

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
          title: s.title,
          body: s.body,
          duration_seconds: s.duration_seconds,
          leader_script: s.leader_script || null,
          step_order: idx,
        })),
        materials: {
          items: materials.items,
          safety_notes: materials.safety_notes || null,
          preparation: materials.preparation || null,
        },
        phases: phases.map((p, idx) => ({
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
        secondaryPurposes: subPurposeIds,
        coverMediaId: cover.mediaId,
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
      if (!res.ok) throw new Error(data.error || 'Misslyckades att spara');

      setSaveStatus('saved');
      setLastSaved(new Date());

      if (!gameId && data.gameId) {
        router.replace(`/admin/games/${data.gameId}/edit`);
      }
    } catch (err) {
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    }
  }, [core, steps, materials, phases, roles, boardConfig, gameId, router, subPurposeIds, cover]);

  // Publish handler
  const handlePublish = useCallback(async () => {
    if (!qualityState.allRequiredMet) {
      setError('Fyll i obligatoriska fält och välj omslagsbild innan publicering.');
      return;
    }
    setCore((prev) => ({ ...prev, status: 'published' }));
    await handleSave({ status: 'published' });
  }, [handleSave, qualityState.allRequiredMet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Laddar spel...</p>
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
              <span className="hidden sm:inline">Tillbaka till lekar</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-semibold text-foreground">
              {isEditing ? 'Redigera lek' : 'Skapa ny lek'}
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
              Förhandsgranska
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSave()}
              disabled={saveStatus === 'saving'}
            >
              Spara utkast
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={!qualityState.allRequiredMet || saveStatus === 'saving'}
            >
              Publicera
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
                <h2 className="text-xl font-semibold text-foreground mb-1">Grundinformation</h2>
                <p className="text-sm text-muted-foreground">
                  Namn och beskrivning som visas i lekbanken.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Namn <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={core.name}
                    onChange={(e) => setCore({ ...core, name: e.target.value })}
                    placeholder="Ex. Samarbetsstafett"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Kort beskrivning <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={core.short_description}
                    onChange={(e) => setCore({ ...core, short_description: e.target.value })}
                    rows={2}
                    placeholder="1-2 meningar som sammanfattar leken."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Full beskrivning
                  </label>
                  <Textarea
                    value={core.description}
                    onChange={(e) => setCore({ ...core, description: e.target.value })}
                    rows={5}
                    placeholder="Detaljerad beskrivning av leken..."
                  />
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="font-medium text-foreground">Syften & omslagsbild</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Huvudsyfte <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={core.main_purpose_id}
                      onChange={(e) => setCore({ ...core, main_purpose_id: e.target.value })}
                      options={mainPurposeOptions.length > 0 ? mainPurposeOptions : [{ value: '', label: 'Laddar syften...' }]}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Undersyften</label>
                    <div className="rounded-lg border border-border p-3 space-y-2 max-h-32 overflow-y-auto">
                      {subPurposeOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground">Välj huvudsyfte för att se undersyften.</p>
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

              <Card className="p-6 space-y-4">
                <h3 className="font-medium text-foreground">Klassificering</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Energinivå</label>
                    <Select
                      value={core.energy_level || ''}
                      onChange={(e) => setCore({ ...core, energy_level: e.target.value || null })}
                      options={energyOptions}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Plats</label>
                    <Select
                      value={core.location_type || ''}
                      onChange={(e) => setCore({ ...core, location_type: e.target.value || null })}
                      options={locationOptions}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tid (minuter)</label>
                    <Input
                      type="number"
                      min={0}
                      value={core.time_estimate_min ?? ''}
                      onChange={(e) => setCore({ ...core, time_estimate_min: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex. 15"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Spelare min</label>
                    <Input
                      type="number"
                      min={0}
                      value={core.min_players ?? ''}
                      onChange={(e) => setCore({ ...core, min_players: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex. 4"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Spelare max</label>
                    <Input
                      type="number"
                      min={0}
                      value={core.max_players ?? ''}
                      onChange={(e) => setCore({ ...core, max_players: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex. 30"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ålder min</label>
                    <Input
                      type="number"
                      min={0}
                      value={core.age_min ?? ''}
                      onChange={(e) => setCore({ ...core, age_min: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex. 6"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ålder max</label>
                    <Input
                      type="number"
                      min={0}
                      value={core.age_max ?? ''}
                      onChange={(e) => setCore({ ...core, age_max: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Ex. 99"
                    />
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Steg Section */}
          {activeSection === 'steg' && (
            <section>
              <StepEditor
                steps={steps}
                onChange={setSteps}
              />
            </section>
          )}

          {/* Material Section */}
          {activeSection === 'material' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Material</h2>
                <p className="text-sm text-muted-foreground">
                  Lista material som behövs för att genomföra leken.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Material (ett per rad)
                  </label>
                  <Textarea
                    value={materials.items.join('\n')}
                    onChange={(e) => setMaterials({ ...materials, items: e.target.value.split('\n').filter(Boolean) })}
                    rows={6}
                    placeholder="Ex:&#10;8 koner&#10;1 boll per lag&#10;Musik (Spotify-spellista)"
                  />
                  <p className="text-xs text-muted-foreground">
                    {materials.items.length} material tillagt
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Förberedelser
                  </label>
                  <Textarea
                    value={materials.preparation}
                    onChange={(e) => setMaterials({ ...materials, preparation: e.target.value })}
                    rows={3}
                    placeholder="Vad behöver ledaren förbereda innan leken?"
                  />
                </div>
              </Card>
            </section>
          )}

          {/* Säkerhet Section */}
          {activeSection === 'sakerhet' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Säkerhet & Inkludering</h2>
                <p className="text-sm text-muted-foreground">
                  Viktiga säkerhetsnoteringar och tips för inkludering.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    ⚠️ Säkerhetsnoteringar
                  </label>
                  <Textarea
                    value={materials.safety_notes}
                    onChange={(e) => setMaterials({ ...materials, safety_notes: e.target.value })}
                    rows={4}
                    placeholder="Ex: Se upp för väggar vid snabb rörelse. Undvik glatta golv."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    ♿ Tillgänglighetsnoteringar
                  </label>
                  <Textarea
                    value={core.accessibility_notes}
                    onChange={(e) => setCore({ ...core, accessibility_notes: e.target.value })}
                    rows={3}
                    placeholder="Tips för anpassning till olika förutsättningar..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    🏠 Utrymmeskrav
                  </label>
                  <Textarea
                    value={core.space_requirements}
                    onChange={(e) => setCore({ ...core, space_requirements: e.target.value })}
                    rows={2}
                    placeholder="Ex: Minst 10x10 meter fritt utrymme"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    💡 Ledartips
                  </label>
                  <Textarea
                    value={core.leader_tips}
                    onChange={(e) => setCore({ ...core, leader_tips: e.target.value })}
                    rows={3}
                    placeholder="Tips till ledaren för att få leken att fungera bättre..."
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
                onChange={(mode) => setCore({ ...core, play_mode: mode })}
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

          {/* Roller Section */}
          {activeSection === 'roller' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Roller</h2>
                <p className="text-sm text-muted-foreground">
                  Definiera roller med hemliga instruktioner för deltagare.
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
                <h2 className="text-xl font-semibold text-foreground mb-1">Publik Tavla</h2>
                <p className="text-sm text-muted-foreground">
                  Innehåll som visas på projektor/storskärm under spelet.
                </p>
              </div>

              <BoardEditor
                config={boardConfig}
                gameName={core.name}
                onChange={setBoardConfig}
              />
            </section>
          )}

          {/* Översättningar Section (placeholder) */}
          {activeSection === 'oversattningar' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Översättningar</h2>
                <p className="text-sm text-muted-foreground">
                  Hantera översättningar till olika språk.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇸🇪</span>
                      <span className="font-medium">Svenska</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-muted-foreground">100%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇳🇴</span>
                      <span className="font-medium">Norska</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted" />
                      <span className="text-sm text-muted-foreground">0%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🇬🇧</span>
                      <span className="font-medium">Engelska</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted" />
                      <span className="text-sm text-muted-foreground">0%</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Fullständig översättningshantering kommer snart.
                </p>
              </Card>
            </section>
          )}

          {/* Inställningar Section */}
          {activeSection === 'installningar' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Inställningar</h2>
                <p className="text-sm text-muted-foreground">
                  Status och synlighet för leken.
                </p>
              </div>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Taxonomi / spelkategori</label>
                  <Input
                    value={core.taxonomy_category}
                    placeholder="Ex. Ringlekar"
                    onChange={(e) => setCore({ ...core, taxonomy_category: e.target.value })}
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
                      Behåller tidigare värde vid import; sparas som spelkategori i databasen.
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={core.status}
                    onChange={(e) => setCore({ ...core, status: e.target.value as 'draft' | 'published' })}
                    options={[
                      { value: 'draft', label: 'Utkast' },
                      { value: 'published', label: 'Publicerad' },
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    {core.status === 'draft'
                      ? 'Utkast är endast synliga för dig.'
                      : 'Publicerade lekar är synliga för alla med tillgång.'}
                  </p>
                </div>
              </Card>

              {gameId && (
                <Card className="p-6 border-destructive/20">
                  <h3 className="font-medium text-destructive mb-2">Farozon</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanent radering av leken. Denna åtgärd kan inte ångras.
                  </p>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Ta bort lek
                  </Button>
                </Card>
              )}
            </section>
          )}
        </main>

        {/* Right sidebar - Quality checklist */}
        <aside className="hidden xl:block w-72 border-l border-border bg-muted/30 min-h-[calc(100vh-4rem)]">
          <QualityChecklist
            state={qualityState}
            status={core.status}
          />
        </aside>
      </div>
    </div>
  );
}

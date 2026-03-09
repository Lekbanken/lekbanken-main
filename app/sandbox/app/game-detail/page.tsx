'use client';

/**
 * GameDetail Sandbox - Golden Reference
 *
 * Visuell regressionsmiljö som använder exakt samma komponenter som production.
 * Inga egna implementationer - bara production-komponenter + synlighets-toggles.
 *
 * Principer:
 * 1. Samma komponenter som production (GameDetails/*)
 * 2. Samma config-driven visibility (getSectionConfig)
 * 3. P2-sektioner visas som DisabledSection (inte mock-data)
 * 4. 3 testspel: basic / facilitated / participants
 */

import { useState, useMemo } from 'react';

import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Button, Card, CardContent, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// GameDetails komponenter (samma som production)
import { GameStartActions } from '@/components/game/GameStartActions';
import {
  GameDetailHeader,
  GameDetailBadges,
  GameDetailAbout,
  GameDetailSteps,
  GameDetailMaterials,
  GameDetailSafety,
  GameDetailPreparation,
  GameDetailPhases,
  GameDetailGallery,
  GameDetailRoles,
  GameDetailArtifacts,
  GameDetailTriggers,
  GameDetailQuickFacts,
  // P1 komponenter
  GameDetailAccessibility,
  GameDetailRequirements,
  GameDetailBoard,
  GameDetailTools,
  // Sprint D komponenter
  GameDetailOutcomes,
  GameDetailLeaderTips,
  // P2 placeholder
  DisabledSection,
  // Config
  getSectionConfig,
  type GameDetailMode,
  type SectionVisibility,
} from '@/components/game/GameDetails';

import type { GameDetailData } from '@/lib/game-display';

// Mock data
import { mockGamesList, playModeConfig } from './mock-games';

// =============================================================================
// TYPES
// =============================================================================

type GameId = 'basic' | 'facilitated' | 'participants' | 'minimal';

// P2 sections that are not in DB yet
const P2_SECTIONS = [
  { key: 'tags', title: 'Taggar', reason: 'Saknas: game_tags tabell' },
  { key: 'variants', title: 'Varianter', reason: 'Saknas: game_variants tabell' },
  { key: 'reflections', title: 'Reflektion', reason: 'Saknas: reflection_prompts tabell' },
  { key: 'checkpoints', title: 'Checkpoints', reason: 'Saknas: game_checkpoints tabell' },
  { key: 'decisions', title: 'Omröstningar/beslut', reason: 'Saknas: game_decisions tabell' },
  { key: 'downloads', title: 'Nerladdningar', reason: 'Saknas: game_downloads tabell' },
  { key: 'hostActions', title: 'Host actions', reason: 'Delvis stöd via game_tools' },
] as const;

// Coverage checklist for data provenance
const COVERAGE_ITEMS = [
  { key: 'header', label: 'Header (title, cover)', db: 'games, game_media' },
  { key: 'badges', label: 'Badges (playMode, energy)', db: 'games.*' },
  { key: 'about', label: 'About (description)', db: 'game_translations' },
  { key: 'steps', label: 'Steps (instruktioner)', db: 'game_steps' },
  { key: 'materials', label: 'Materials', db: 'game_materials' },
  { key: 'safety', label: 'Safety notes', db: 'game_materials.safety_notes' },
  { key: 'preparation', label: 'Preparation', db: 'game_materials.preparation' },
  { key: 'phases', label: 'Phases (faciliterad)', db: 'game_phases' },
  { key: 'roles', label: 'Roles (participants)', db: 'game_roles' },
  { key: 'artifacts', label: 'Artifacts', db: 'game_artifacts + variants' },
  { key: 'triggers', label: 'Triggers', db: 'game_triggers' },
  { key: 'accessibility', label: 'Tillgänglighet', db: 'games.accessibility_notes' },
  { key: 'requirements', label: 'Krav för spel', db: 'games.space_requirements' },
  { key: 'board', label: 'Publik tavla', db: 'game_board_config' },
  { key: 'tools', label: 'Facilitatorverktyg', db: 'game_tools' },
  { key: 'outcomes', label: 'Lärandemål', db: 'games.outcomes' },
  { key: 'leaderTips', label: 'Ledartips', db: 'games.leader_tips' },
  { key: 'highlights', label: 'Highlights', db: 'games.highlights' },
] as const;

// =============================================================================
// SANDBOX PAGE
// =============================================================================

export default function GameDetailSandbox() {
  const [selectedGameId, setSelectedGameId] = useState<GameId>('facilitated');
  const [mode, setMode] = useState<GameDetailMode>('preview');
  const [showP2Sections, setShowP2Sections] = useState(true);
  const [showDataProvenance, setShowDataProvenance] = useState(true);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [sectionOverrides, setSectionOverrides] = useState<Partial<Record<keyof SectionVisibility, boolean>>>({});

  const game = mockGamesList.find((g) => g.id.startsWith(selectedGameId)) ?? mockGamesList[0];
  const baseConfig = getSectionConfig(mode, game.playMode);
  
  // Apply overrides
  const config = useMemo(() => {
    const merged = { ...baseConfig };
    for (const [key, value] of Object.entries(sectionOverrides)) {
      if (value !== undefined) {
        (merged as Record<string, boolean>)[key] = value;
      }
    }
    return merged;
  }, [baseConfig, sectionOverrides]);

  const meta = playModeConfig[game.playMode ?? 'basic'];

  // Count visible sections
  const visibleCount = Object.values(config).filter(Boolean).length;
  const totalSections = Object.keys(config).length;

  return (
    <SandboxShell
      moduleId="app-game-detail"
      title="Game Detail Sandbox - Golden Reference"
      description="Visuell regressionsmiljö. Samma komponenter som production."
    >
      <div className="space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Golden Reference
            </p>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              GameDetails Sandbox
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Production-komponenter • Config-driven visibility • P2 som disabled
            </p>
          </div>
          <Badge size="sm" className="shrink-0 bg-green-100 text-green-800 border-green-300">
            {visibleCount}/{totalSections} sektioner
          </Badge>
        </header>

        {/* Data Provenance Card (collapsible) */}
        <DataProvenanceCard
          game={game}
          config={config}
          mode={mode}
          isOpen={showDataProvenance}
          onToggle={() => setShowDataProvenance(!showDataProvenance)}
        />

        {/* Control Panel */}
        <ControlPanel
          selectedGameId={selectedGameId}
          onSelectGame={setSelectedGameId}
          mode={mode}
          onSetMode={setMode}
          config={config}
          sectionOverrides={sectionOverrides}
          onSectionOverride={(key, value) => 
            setSectionOverrides(prev => ({ ...prev, [key]: value }))
          }
          onResetOverrides={() => setSectionOverrides({})}
          showP2Sections={showP2Sections}
          onToggleP2={() => setShowP2Sections(!showP2Sections)}
          showPrintPreview={showPrintPreview}
          onTogglePrint={() => setShowPrintPreview(!showPrintPreview)}
        />

        {/* Print Preview (7.3) */}
        {showPrintPreview ? (
          <PrintPreview game={game} />
        ) : (
        /* Game Detail Preview */
        <Card className={cn('border-2 bg-card shadow-sm', meta.border)}>
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Left Column: Main Content */}
              <div className="space-y-6">
                {/* P0 Sections */}
                {config.header && <GameDetailHeader game={game} />}
                {config.badges && <GameDetailBadges game={game} />}
                {config.about && <GameDetailAbout game={game} />}
                {config.steps && <GameDetailSteps game={game} />}
                {config.materials && <GameDetailMaterials game={game} />}
                {config.safety && <GameDetailSafety game={game} />}
                {config.preparation && <GameDetailPreparation game={game} />}
                
                {/* P1 Sections */}
                {config.accessibility && <GameDetailAccessibility game={game} />}
                {config.requirements && <GameDetailRequirements game={game} />}
                
                {config.phases && <GameDetailPhases game={game} />}
                {config.board && <GameDetailBoard game={game} />}
                
                {config.gallery && <GameDetailGallery game={game} />}
                {config.roles && <GameDetailRoles game={game} />}
                {config.artifacts && <GameDetailArtifacts game={game} />}
                {config.triggers && <GameDetailTriggers game={game} />}
                {config.tools && <GameDetailTools game={game} />}

                {/* Sprint D Sections */}
                {config.outcomes && (
                  <GameDetailOutcomes game={game} labels={{ title: 'Lärandemål' }} />
                )}
                {config.leaderTips && (
                  <GameDetailLeaderTips game={game} labels={{ title: 'Tips till ledaren' }} />
                )}

                {/* Highlights badges (7.7) */}
                {game.highlights && game.highlights.length > 0 && (
                  <section className="flex flex-wrap gap-2">
                    {game.highlights.map((h, i) => (
                      <Badge key={i} size="sm" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        {h}
                      </Badge>
                    ))}
                  </section>
                )}

                {/* Related games mock (7.5 + 7.6) */}
                {game.id !== 'minimal-sandbox' && (
                  <section className="mt-8 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Relaterade lekar</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {mockGamesList
                        .filter((g) => g.id !== game.id)
                        .slice(0, 4)
                        .map((related) => (
                          <div
                            key={related.id}
                            className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1"
                          >
                            <p className="text-sm font-medium text-foreground">{related.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {related.shortDescription}
                            </p>
                            <Badge size="sm" className={playModeConfig[related.playMode ?? 'basic'].badge}>
                              {playModeConfig[related.playMode ?? 'basic'].label}
                            </Badge>
                          </div>
                        ))}
                    </div>
                    {/* Reactions mock (7.6) */}
                    <div className="flex items-center gap-3 pt-2">
                      <button className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors" disabled>
                        ❤️ <span className="font-medium text-foreground">42</span>
                      </button>
                      <span className="text-xs text-muted-foreground">Mock — reaktionsknapp med count</span>
                    </div>
                  </section>
                )}
                
                {/* P2 Sections (disabled) */}
                {showP2Sections && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pt-4 border-t border-dashed border-border/60">
                      <Badge size="sm" className="bg-orange-100 text-orange-800 border-orange-300">
                        P2 Roadmap
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Sektioner som saknar DB-stöd
                      </span>
                    </div>
                    {P2_SECTIONS.map((section) => (
                      <DisabledSection
                        key={section.key}
                        title={section.title}
                        reason={section.reason}
                        priority="P2"
                      />
                    ))}

                    {/* 7.8 Varianter-preview mockup */}
                    <div className="rounded-2xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 dark:text-purple-400">🔀</span>
                        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">Varianter (design mockup)</h3>
                        <Badge size="sm" className="bg-purple-100 text-purple-700 border-purple-300 text-[10px]">P2</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {['Kort version (15 min)', 'Inomhusvariant', 'Stor grupp (20+)'].map((v) => (
                          <div key={v} className="rounded-lg border border-purple-200 dark:border-purple-800/50 bg-white/50 dark:bg-purple-950/30 p-2.5">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">{v}</p>
                            <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-0.5">Kräver: game_variants tabell</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7.9 Beslut/Omröstning-preview mockup */}
                    <div className="rounded-2xl border border-dashed border-cyan-300 dark:border-cyan-800 bg-cyan-50/50 dark:bg-cyan-950/20 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-600 dark:text-cyan-400">🗳️</span>
                        <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">Omröstning / Beslut (design mockup)</h3>
                        <Badge size="sm" className="bg-cyan-100 text-cyan-700 border-cyan-300 text-[10px]">P2</Badge>
                      </div>
                      <div className="space-y-2">
                        {['Vem ska leda nästa runda?', 'Ska vi förlänga tiden?'].map((q) => (
                          <div key={q} className="flex items-center gap-3 rounded-lg border border-cyan-200 dark:border-cyan-800/50 bg-white/50 dark:bg-cyan-950/30 p-2.5">
                            <div className="h-4 w-4 rounded-full border-2 border-cyan-400" />
                            <p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">{q}</p>
                          </div>
                        ))}
                        <p className="text-[10px] text-cyan-500 dark:text-cyan-400">Kräver: game_decisions tabell + live-röstning i Play-mode</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Sidebar */}
              <aside className="space-y-4">
                {config.sidebar && (
                  <GameStartActions gameId={game.id} gameName={game.title} showShare={true} />
                )}
                {config.quickFacts && <GameDetailQuickFacts game={game} />}
                {config.sidebar && <MetadataSection game={game} />}
              </aside>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </SandboxShell>
  );
}

// =============================================================================
// DATA PROVENANCE CARD
// =============================================================================

function DataProvenanceCard({
  game,
  config,
  mode,
  isOpen,
  onToggle,
}: {
  game: GameDetailData;
  config: SectionVisibility;
  mode: GameDetailMode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const meta = playModeConfig[game.playMode ?? 'basic'];

  return (
    <Card className="border border-border/60 bg-muted/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Data Provenance</span>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isOpen && (
        <CardContent className="border-t border-border/60 p-4 pt-4">
          {/* Current State */}
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Spel:</span>{' '}
              <span className="font-medium text-foreground">{game.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">PlayMode:</span>
              <Badge size="sm" className={cn(meta.badge)}>
                {meta.label}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">DisplayMode:</span>{' '}
              <span className="font-medium text-foreground">{mode}</span>
            </div>
          </div>

          {/* Coverage Checklist */}
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Coverage Checklist (P0 + P1)
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {COVERAGE_ITEMS.map((item) => {
                const isVisible = config[item.key as keyof SectionVisibility];
                return (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-start gap-2 rounded-md p-2 text-xs',
                      isVisible ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/50'
                    )}
                  >
                    <span className={cn('font-mono', isVisible ? 'text-green-600' : 'text-muted-foreground')}>
                      {isVisible ? '✓' : '○'}
                    </span>
                    <div>
                      <div className={cn('font-medium', isVisible ? 'text-green-800 dark:text-green-300' : 'text-muted-foreground')}>
                        {item.label}
                      </div>
                      <div className="text-muted-foreground">{item.db}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visible Sections Summary */}
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Synliga sektioner (config)
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(config)
                .filter(([, visible]) => visible)
                .map(([key]) => (
                  <Badge key={key} size="sm" className="border-0 bg-primary/10 text-primary">
                    {key}
                  </Badge>
                ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// CONTROL PANEL
// =============================================================================

function ControlPanel({
  selectedGameId,
  onSelectGame,
  mode,
  onSetMode,
  config,
  sectionOverrides,
  onSectionOverride,
  onResetOverrides,
  showP2Sections,
  onToggleP2,
  showPrintPreview,
  onTogglePrint,
}: {
  selectedGameId: GameId;
  onSelectGame: (id: GameId) => void;
  mode: GameDetailMode;
  onSetMode: (mode: GameDetailMode) => void;
  config: SectionVisibility;
  sectionOverrides: Partial<Record<keyof SectionVisibility, boolean>>;
  onSectionOverride: (key: keyof SectionVisibility, value: boolean | undefined) => void;
  onResetOverrides: () => void;
  showP2Sections: boolean;
  onToggleP2: () => void;
  showPrintPreview: boolean;
  onTogglePrint: () => void;
}) {
  const [showSectionToggles, setShowSectionToggles] = useState(false);
  const hasOverrides = Object.keys(sectionOverrides).length > 0;

  return (
    <Card className="border border-dashed border-border/70 bg-muted/30 shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Game Selector */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Välj spel
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mockGamesList.map((g) => {
              const gameId = g.id.replace('-sandbox', '') as GameId;
              const isSelected = selectedGameId === gameId;
              const gameMeta = playModeConfig[g.playMode ?? 'basic'];
              return (
                <Button
                  key={g.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectGame(gameId)}
                  className={cn(!isSelected && gameMeta.badge)}
                >
                  <span className="flex items-center gap-2">
                    {g.title}
                    <Badge size="sm" className={cn('text-[10px]', gameMeta.badge)}>
                      {gameMeta.label}
                    </Badge>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Visningsmode
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['preview', 'admin', 'host'] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSetMode(m)}
              >
                {m === 'preview' ? 'Preview (Library)' : m === 'admin' ? 'Admin' : 'Host (Play)'}
              </Button>
            ))}
          </div>
        </div>

        {/* P2 Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div>
            <p className="text-sm font-medium text-foreground">Visa P2-sektioner</p>
            <p className="text-xs text-muted-foreground">Visar DisabledSection för framtida features</p>
          </div>
          <Switch checked={showP2Sections} onCheckedChange={onToggleP2} />
        </div>

        {/* Print Preview Toggle (7.3) */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div>
            <p className="text-sm font-medium text-foreground">Print Preview</p>
            <p className="text-xs text-muted-foreground">Printbar layout utan interaktiva element</p>
          </div>
          <Switch checked={showPrintPreview} onCheckedChange={onTogglePrint} />
        </div>

        {/* Section Toggles */}
        <div className="pt-2 border-t border-border/40">
          <button
            onClick={() => setShowSectionToggles(!showSectionToggles)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Section Overrides
                {hasOverrides && (
                  <Badge size="sm" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                    {Object.keys(sectionOverrides).length} aktiva
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">Manuell toggle per sektion</p>
            </div>
            {showSectionToggles ? (
              <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showSectionToggles && (
            <div className="mt-4 space-y-4">
              {hasOverrides && (
                <Button variant="outline" size="sm" onClick={onResetOverrides}>
                  Återställ alla overrides
                </Button>
              )}
              <div className="grid gap-2 sm:grid-cols-4">
                {Object.keys(config).map((key) => {
                  const sectionKey = key as keyof SectionVisibility;
                  const baseValue = config[sectionKey];
                  const override = sectionOverrides[sectionKey];
                  const isOverridden = override !== undefined;
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between rounded-md p-2',
                        isOverridden ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200' : 'bg-muted/50'
                      )}
                    >
                      <span className="text-xs font-medium">{key}</span>
                      <div className="flex items-center gap-2">
                        {isOverridden && (
                          <button
                            onClick={() => onSectionOverride(sectionKey, undefined)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            ↺
                          </button>
                        )}
                        <Switch
                          checked={isOverridden ? override : baseValue}
                          onCheckedChange={(checked) => onSectionOverride(sectionKey, checked)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// PRINT PREVIEW (7.3)
// =============================================================================

function PrintPreview({ game }: { game: GameDetailData }) {
  return (
    <Card className="border bg-white dark:bg-card shadow-sm print:shadow-none print:border-0">
      <CardContent className="p-6 sm:p-8 lg:p-10 max-w-3xl mx-auto space-y-6 print:p-0">
        {/* Header */}
        <div className="border-b border-border/40 pb-4">
          <h1 className="text-2xl font-bold text-foreground">{game.title}</h1>
          {game.subtitle && (
            <p className="mt-1 text-base text-muted-foreground">{game.subtitle}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {game.durationMin && game.durationMax && (
              <span>{game.durationMin}–{game.durationMax} min</span>
            )}
            {game.minPlayers && game.maxPlayers && (
              <span>• {game.minPlayers}–{game.maxPlayers} deltagare</span>
            )}
            {game.ageMin && game.ageMax && (
              <span>• {game.ageMin}–{game.ageMax} år</span>
            )}
          </div>
        </div>

        {/* Description */}
        {game.description && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Om leken</h2>
            <p className="text-sm text-muted-foreground">{game.description}</p>
          </div>
        )}

        {/* Materials */}
        {game.materials && game.materials.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Material</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {game.materials.map((m, i) => (
                <li key={i}>{typeof m === 'string' ? m : m.label}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preparation */}
        {game.preparation && game.preparation.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Förberedelser</h2>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-0.5">
              {game.preparation.map((p, i) => <li key={i}>{p}</li>)}
            </ol>
          </div>
        )}

        {/* Steps */}
        {game.steps && game.steps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Steg</h2>
            <ol className="space-y-3">
              {game.steps.map((step, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-foreground">
                      {i + 1}. {step.title}
                    </span>
                    {step.duration && (
                      <span className="text-xs text-muted-foreground">({step.duration})</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Outcomes */}
        {game.outcomes && game.outcomes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Lärandemål</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {game.outcomes.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}

        {/* Leader Tips */}
        {game.leaderTips && game.leaderTips.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Tips till ledaren</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {game.leaderTips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Safety */}
        {game.safety && game.safety.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Säkerhet</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
              {game.safety.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border/40 pt-3 text-xs text-muted-foreground">
          {game.meta?.gameKey} • {game.meta?.version} • {game.meta?.updatedAt}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// METADATA SECTION
// =============================================================================

/**
 * Metadata Section - visar spelets metadata
 */
function MetadataSection({ game }: { game: GameDetailData }) {
  if (!game.meta) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-4 sm:p-5">
      <h3 className="text-base font-semibold text-foreground">Metadata</h3>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Spel-ID</span>
          <span className="font-semibold text-foreground">{game.meta.gameKey}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Version</span>
          <span className="font-semibold text-foreground">{game.meta.version}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Uppdaterad</span>
          <span className="font-semibold text-foreground">{game.meta.updatedAt}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Owner</span>
          <span className="font-semibold text-foreground">{game.meta.owner}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Locale</span>
          <span className="font-semibold text-foreground">{game.meta.locale}</span>
        </div>
      </div>
    </section>
  );
}

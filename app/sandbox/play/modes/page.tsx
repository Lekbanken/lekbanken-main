/**
 * Play Modes Sandbox
 *
 * Visar alla tre play-lägen sida vid sida för testning och debugging.
 * - Basic: Enkel steg-navigering utan faser eller roller
 * - Facilitated: Faser, triggers, och avancerade kontroller
 * - Participants: Roller och deltagarhantering
 */

'use client';

import { useState } from 'react';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { BasicPlayView } from '@/features/play/components/BasicPlayView';
import { FacilitatedPlayView } from '@/features/play/components/FacilitatedPlayView';
import { ParticipantPlayView } from '@/features/play/components/ParticipantPlayView';
import { useSessionCapabilities, type SessionCapabilities } from '@/hooks/useSessionCapabilities';
import {
  BASIC_SESSION,
  BASIC_SNAPSHOT,
  FACILITATED_SESSION,
  FACILITATED_SNAPSHOT,
  FACILITATED_TRIGGERS,
  PARTICIPANTS_SESSION,
  PARTICIPANTS_SNAPSHOT,
  PARTICIPANTS_TRIGGERS,
} from '../mock-data';
import { PlayIcon, CogIcon, UsersIcon, EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

type ViewMode = 'host' | 'participant';
type PlayModeType = 'basic' | 'facilitated' | 'participants';

function CapabilitiesDebugPanel({ caps }: { caps: SessionCapabilities }) {
  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Capabilities Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2 font-mono">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>viewType: <span className="text-primary">{caps.viewType}</span></div>
          <div>intent: <span className="text-muted-foreground">{caps.intent}</span></div>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="font-semibold mb-1">Has Flags:</div>
          <div className="flex flex-wrap gap-1">
            {caps.hasSteps && <Badge variant="outline" className="text-xs">steps</Badge>}
            {caps.hasPhases && <Badge variant="outline" className="text-xs">phases</Badge>}
            {caps.hasRoles && <Badge variant="outline" className="text-xs">roles</Badge>}
            {caps.hasArtifacts && <Badge variant="outline" className="text-xs">artifacts</Badge>}
            {caps.hasTriggers && <Badge variant="outline" className="text-xs">triggers</Badge>}
            {caps.hasTools && <Badge variant="outline" className="text-xs">tools</Badge>}
            {caps.hasBoard && <Badge variant="outline" className="text-xs">board</Badge>}
            {caps.hasPuzzles && <Badge variant="outline" className="text-xs">puzzles</Badge>}
            {caps.hasProps && <Badge variant="outline" className="text-xs">props</Badge>}
          </div>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="font-semibold mb-1">Show Flags:</div>
          <div className="flex flex-wrap gap-1">
            {caps.showPhaseNavigation && <Badge variant="secondary" className="text-xs">phaseNav</Badge>}
            {caps.showRoleAssigner && <Badge variant="secondary" className="text-xs">roleAssigner</Badge>}
            {caps.showTriggersPanel && <Badge variant="secondary" className="text-xs">triggers</Badge>}
            {caps.showDirectorMode && <Badge variant="secondary" className="text-xs">director</Badge>}
            {caps.showToolbelt && <Badge variant="secondary" className="text-xs">toolbelt</Badge>}
            {caps.showArtifactsPanel && <Badge variant="secondary" className="text-xs">artifacts</Badge>}
            {caps.showPuzzlesPanel && <Badge variant="secondary" className="text-xs">puzzles</Badge>}
            {caps.showPropsManager && <Badge variant="secondary" className="text-xs">props</Badge>}
            {caps.showDecisionsPanel && <Badge variant="secondary" className="text-xs">decisions</Badge>}
            {caps.showOutcomePanel && <Badge variant="secondary" className="text-xs">outcome</Badge>}
            {caps.showBoardToggle && <Badge variant="secondary" className="text-xs">board</Badge>}
            {caps.showChat && <Badge variant="secondary" className="text-xs">chat</Badge>}
          </div>
        </div>
        <div className="border-t pt-2 mt-2">
          <div className="font-semibold mb-1">Tabs:</div>
          <div className="text-muted-foreground">
            Visible: {caps.visibleTabs.join(', ') || 'none'}
          </div>
          <div className="text-muted-foreground">
            Content: {caps.contentSubTabs.join(', ') || 'none'}
          </div>
          <div className="text-muted-foreground">
            Manage: {caps.manageSubTabs.join(', ') || 'none'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayModePreview({
  mode,
  viewMode,
  showDebug,
}: {
  mode: PlayModeType;
  viewMode: ViewMode;
  showDebug: boolean;
}) {
  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  // Select the appropriate session data
  const sessionData = mode === 'basic' ? BASIC_SESSION 
    : mode === 'facilitated' ? FACILITATED_SESSION 
    : PARTICIPANTS_SESSION;

  const snapshot = mode === 'basic' ? BASIC_SNAPSHOT 
    : mode === 'facilitated' ? FACILITATED_SNAPSHOT 
    : PARTICIPANTS_SNAPSHOT;

  const triggers = mode === 'basic' ? [] 
    : mode === 'facilitated' ? FACILITATED_TRIGGERS 
    : PARTICIPANTS_TRIGGERS;

  // Get capabilities
  const caps = useSessionCapabilities(snapshot, sessionData.tools);

  // Handlers
  const handleComplete = () => {
    console.log(`[${mode}] Session completed`);
    alert('Sessionen är klar! 🎉');
  };

  const handleTriggerAction = (triggerId: string, action: 'fire' | 'disable' | 'arm') => {
    console.log(`[${mode}] Trigger action: ${action} on ${triggerId}`);
  };

  const handleBack = () => {
    console.log(`[${mode}] Back clicked`);
  };

  // Reset state
  const handleReset = () => {
    setCurrentStepIndex(0);
    setCurrentPhaseIndex(0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'basic' && <PlayIcon className="h-5 w-5 text-green-600" />}
          {mode === 'facilitated' && <CogIcon className="h-5 w-5 text-blue-600" />}
          {mode === 'participants' && <UsersIcon className="h-5 w-5 text-purple-600" />}
          <span className="font-medium capitalize">{mode}</span>
          <Badge variant={mode === 'basic' ? 'outline' : mode === 'facilitated' ? 'secondary' : 'accent'}>
            {caps.viewType}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Debug Panel */}
      {showDebug && <CapabilitiesDebugPanel caps={caps} />}

      {/* View */}
      <div className="border rounded-lg p-4 bg-background min-h-[400px]">
        {viewMode === 'host' ? (
          <>
            {caps.viewType === 'basic' && (
              <BasicPlayView
                playData={sessionData}
                caps={caps}
                sessionId={sessionData.sessionId}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
            {caps.viewType === 'facilitated' && (
              <FacilitatedPlayView
                playData={sessionData}
                caps={caps}
                sessionId={sessionData.sessionId}
                triggers={triggers}
                currentStepIndex={currentStepIndex}
                currentPhaseIndex={currentPhaseIndex}
                onStepChange={setCurrentStepIndex}
                onPhaseChange={setCurrentPhaseIndex}
                onTriggerAction={handleTriggerAction}
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
            {caps.viewType === 'participants' && (
              <FacilitatedPlayView
                playData={sessionData}
                caps={caps}
                sessionId={sessionData.sessionId}
                triggers={triggers}
                currentStepIndex={currentStepIndex}
                currentPhaseIndex={currentPhaseIndex}
                onStepChange={setCurrentStepIndex}
                onPhaseChange={setCurrentPhaseIndex}
                onTriggerAction={handleTriggerAction}
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
          </>
        ) : (
          <ParticipantPlayView
            sessionId={sessionData.sessionId}
            gameTitle={sessionData.gameTitle}
            steps={sessionData.steps.map((s) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              durationMinutes: s.duration ? Math.ceil(s.duration / 60) : undefined,
            }))}
            initialState={{ current_step_index: currentStepIndex }}
            role={mode === 'participants' && sessionData.sessionRoles.length > 0 
              ? {
                  id: sessionData.sessionRoles[0].id,
                  name: sessionData.sessionRoles[0].name,
                  icon: sessionData.sessionRoles[0].icon,
                  color: sessionData.sessionRoles[0].color,
                  public_description: sessionData.sessionRoles[0].public_description,
                  private_instructions: sessionData.sessionRoles[0].private_instructions,
                  private_hints: sessionData.sessionRoles[0].private_hints,
                }
              : undefined}
            participantName="Test Deltagare"
            showRole={mode === 'participants'}
          />
        )}
      </div>
    </div>
  );
}

export default function PlayModesPage() {
  const [activeMode, setActiveMode] = useState<PlayModeType>('basic');
  const [viewMode, setViewMode] = useState<ViewMode>('host');
  const [showDebug, setShowDebug] = useState(true);
  const [compareMode, setCompareMode] = useState(false);

  return (
    <SandboxShell
      moduleId="play-modes"
      title="Play Modes"
      description="Testa och jämför alla play-lägen"
    >
      <div className="space-y-8">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Kontroller</CardTitle>
            <CardDescription>Välj visningsläge och inställningar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Perspektiv</label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'host' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('host')}
                >
                  <CogIcon className="h-4 w-4 mr-1" />
                  Ledare (Host)
                </Button>
                <Button
                  variant={viewMode === 'participant' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('participant')}
                >
                  <UsersIcon className="h-4 w-4 mr-1" />
                  Deltagare
                </Button>
              </div>
            </div>

            {/* Debug Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => setShowDebug(e.target.checked)}
                />
                Visa capabilities debug
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                />
                Jämför alla lägen sida vid sida
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Compare Mode - Show all three side by side */}
        {compareMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-green-50 dark:bg-green-950/20">
                <CardTitle className="flex items-center gap-2">
                  <PlayIcon className="h-5 w-5 text-green-600" />
                  Basic Mode
                </CardTitle>
                <CardDescription>Enkel navigering, inga faser</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PlayModePreview mode="basic" viewMode={viewMode} showDebug={showDebug} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                <CardTitle className="flex items-center gap-2">
                  <CogIcon className="h-5 w-5 text-blue-600" />
                  Facilitated Mode
                </CardTitle>
                <CardDescription>Faser, triggers, avancerat</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PlayModePreview mode="facilitated" viewMode={viewMode} showDebug={showDebug} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-purple-50 dark:bg-purple-950/20">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-purple-600" />
                  Participants Mode
                </CardTitle>
                <CardDescription>Roller, deltagarhantering</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PlayModePreview mode="participants" viewMode={viewMode} showDebug={showDebug} />
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Single Mode View with Tabs */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Play Mode Preview</CardTitle>
                  <CardDescription>
                    Testa enskilda play-lägen med full funktionalitet
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {viewMode === 'host' ? 'Host-vy' : 'Deltagarvy'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                tabs={[
                  { id: 'basic', label: '🎮 Basic' },
                  { id: 'facilitated', label: '⚙️ Facilitated' },
                  { id: 'participants', label: '👥 Participants' },
                ]}
                activeTab={activeMode}
                onChange={(id) => setActiveMode(id as PlayModeType)}
              />

              <TabPanel id="basic" activeTab={activeMode}>
                <PlayModePreview mode="basic" viewMode={viewMode} showDebug={showDebug} />
              </TabPanel>

              <TabPanel id="facilitated" activeTab={activeMode}>
                <PlayModePreview mode="facilitated" viewMode={viewMode} showDebug={showDebug} />
              </TabPanel>

              <TabPanel id="participants" activeTab={activeMode}>
                <PlayModePreview mode="participants" viewMode={viewMode} showDebug={showDebug} />
              </TabPanel>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Om Play Modes</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <PlayIcon className="h-4 w-4 text-green-600" />
                  Basic Mode
                </h4>
                <p className="text-sm text-muted-foreground">
                  För enkla lekar utan faser eller roller. Enkel steg-navigering där ledaren går genom aktiviteten steg för steg.
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  <li>Steg-navigering</li>
                  <li>Artifakter (om tillgängliga)</li>
                  <li>Toolbelt (om aktiverat)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CogIcon className="h-4 w-4 text-blue-600" />
                  Facilitated Mode
                </h4>
                <p className="text-sm text-muted-foreground">
                  För mer strukturerade aktiviteter med faser och triggers. Ledaren har tillgång till avancerade kontroller.
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  <li>Fas-navigering</li>
                  <li>Trigger-panel</li>
                  <li>Director Mode</li>
                  <li>Board-kontroller</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-purple-600" />
                  Participants Mode
                </h4>
                <p className="text-sm text-muted-foreground">
                  För rollspel och aktiviteter där deltagare har unika roller med hemliga instruktioner.
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  <li>Roll-tilldelning</li>
                  <li>Hemliga instruktioner</li>
                  <li>Deltagarhantering</li>
                  <li>Allt från Facilitated</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}

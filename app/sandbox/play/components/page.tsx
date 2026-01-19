/**
 * Play Components Sandbox
 *
 * Visar play-komponenter isolerat för testning.
 * Fokuserar på immersion-komponenter och grundläggande UI.
 */

'use client';

import { useState, useMemo } from 'react';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabPanel } from '@/components/ui/tabs';

// Play components
import { StepViewer } from '@/features/play/components/StepViewer';
import { StepPhaseNavigation } from '@/features/play/components/StepPhaseNavigation';
import { RoleCard, type RoleCardData } from '@/features/play/components/RoleCard';

// Immersion components
import { 
  TypewriterText, 
  CountdownOverlay, 
  Keypad,
  AlphaKeypad,
  StoryOverlay,
  TriggerCard,
  TriggerList,
  ReadinessBadge,
  LobbyHub,
  useTrigger,
  type TypewriterSpeed,
} from '@/components/play';
import type { ReadinessLevel, LobbyState } from '@/types/lobby';

// Mock data
import { FACILITATED_SESSION, PARTICIPANTS_SESSION } from '../mock-data';

import { 
  PlayIcon, 
  ClockIcon, 
  SparklesIcon,
  ArrowPathIcon,
  BoltIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

type ComponentCategory = 'immersion' | 'navigation' | 'roles' | 'triggers' | 'lobby';

// Create stable timestamps
const BASE_TIME = new Date('2026-01-19T10:00:00Z');

export default function PlayComponentsPage() {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('immersion');
  const [showCountdown, setShowCountdown] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [typewriterKey, setTypewriterKey] = useState(0);
  const [typewriterSpeed, setTypewriterSpeed] = useState<TypewriterSpeed>('normal');
  
  // Navigation state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  // Trigger state
  const { triggers, addTrigger, removeTrigger, enableTrigger, disableTrigger, fireTrigger, resetTrigger } = useTrigger({
    initialTriggers: [
      {
        id: 'demo-1',
        name: 'Välkomstmeddelande',
        enabled: true,
        status: 'armed',
        when: { type: 'manual' },
        then: [{ type: 'send_message', message: 'Välkommen!', style: 'dramatic' }],
        executeOnce: true,
        firedCount: 0,
        errorCount: 0,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      },
      {
        id: 'demo-2',
        name: 'Kodlås löst',
        enabled: true,
        status: 'fired',
        when: { type: 'keypad_correct', keypadId: 'main-lock' },
        then: [{ type: 'reveal_artifact', artifactId: 'secret-map' }],
        executeOnce: true,
        firedCount: 1,
        errorCount: 0,
        firedAt: BASE_TIME,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      },
      {
        id: 'demo-3',
        name: 'Manuell trigger',
        enabled: false,
        status: 'disabled',
        when: { type: 'manual' },
        then: [{ type: 'advance_step' }],
        executeOnce: false,
        firedCount: 0,
        errorCount: 0,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      },
    ],
  });

  // Lobby state
  const demoLobbyState: LobbyState = useMemo(() => ({
    sessionId: 'demo-session',
    sessionName: 'Mysteriet på Herrgården',
    sessionStatus: 'lobby',
    participants: [
      { id: 'p1', name: 'Anna Svensson', isConnected: true, roleId: 'detective', joinedAt: BASE_TIME },
      { id: 'p2', name: 'Erik Lindberg', isConnected: true, roleId: 'suspect', joinedAt: BASE_TIME },
      { id: 'p3', name: 'Maria Karlsson', isConnected: false, joinedAt: BASE_TIME },
    ],
    roles: [
      { id: 'host', name: 'Spelledare', isHost: true, icon: '🎭' },
      { id: 'detective', name: 'Detektiven', icon: '🔍' },
      { id: 'suspect', name: 'Den misstänkte', icon: '🕵️' },
    ],
    phases: [
      {
        id: 'phase-1',
        title: 'Introduktion',
        steps: [
          { id: 's1', title: 'Välkommen', type: 'intro', isReady: true },
          { id: 's2', title: 'Regler', type: 'activity', isReady: true },
        ],
      },
      {
        id: 'phase-2',
        title: 'Utredning',
        steps: [
          { id: 's3', title: 'Samla ledtrådar', type: 'activity', isReady: true },
          { id: 's4', title: 'Förhör', type: 'decision', isReady: false, issues: ['Saknar alternativ'] },
        ],
      },
    ],
    triggerCount: 3,
    settings: {
      showParticipantNames: true,
      allowChat: true,
      autoAdvance: false,
      requireRoles: true,
      maxParticipants: 8,
      durationLimit: 0,
    },
    readiness: [
      { section: 'participants', level: 'warning', checks: [{ key: 'roles', label: 'Roller', status: 'warning', message: '1 deltagare utan roll' }] },
      { section: 'roles', level: 'warning', checks: [] },
      { section: 'content', level: 'warning', checks: [{ key: 'steps', label: 'Steg', status: 'warning', message: '1 steg har problem' }] },
      { section: 'triggers', level: 'ready', checks: [] },
      { section: 'settings', level: 'ready', checks: [] },
    ],
  }), []);

  // Role data
  const demoRoles: RoleCardData[] = useMemo(() => 
    PARTICIPANTS_SESSION.sessionRoles.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      public_description: r.public_description,
      private_instructions: r.private_instructions,
      private_hints: r.private_hints,
    })), []);

  return (
    <SandboxShell
      moduleId="play-components"
      title="Play Components"
      description="Alla play-komponenter isolerat"
    >
      <div className="space-y-8">
        {/* Category Tabs */}
        <Tabs
          tabs={[
            { id: 'immersion', label: '✨ Immersion' },
            { id: 'navigation', label: '🧭 Navigation' },
            { id: 'roles', label: '👤 Roller' },
            { id: 'triggers', label: '⚡ Triggers' },
            { id: 'lobby', label: '🏠 Lobby' },
          ]}
          activeTab={activeCategory}
          onChange={(id) => setActiveCategory(id as ComponentCategory)}
        />

        {/* Immersion Components */}
        <TabPanel id="immersion" activeTab={activeCategory} className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Immersion Components</h2>
          </div>

          {/* TypewriterText */}
          <Card>
            <CardHeader>
              <CardTitle>TypewriterText</CardTitle>
              <CardDescription>Dramatisk textavslöjning med olika hastigheter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {(['fast', 'normal', 'dramatic', 'instant'] as TypewriterSpeed[]).map((speed) => (
                  <Button
                    key={speed}
                    variant={typewriterSpeed === speed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTypewriterSpeed(speed);
                      setTypewriterKey(k => k + 1);
                    }}
                  >
                    {speed}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setTypewriterKey(k => k + 1)}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Starta om
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <TypewriterText
                  key={typewriterKey}
                  text="Mörkret sänker sig över herrgården. I fjärran hörs en uggla. Plötsligt – ett skrik bryter tystnaden..."
                  speed={typewriterSpeed}
                  showProgress
                  allowSkip
                  allowPause
                  onComplete={() => console.log('Typewriter done')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Keypad */}
          <Card>
            <CardHeader>
              <CardTitle>Keypad</CardTitle>
              <CardDescription>Numeriskt kodlås (koden är 1234)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Keypad
                  correctCode="1234"
                  maxAttempts={5}
                  onSuccess={() => alert('Korrekt kod! 🎉')}
                  onLockout={() => alert('Utelåst! 🔒')}
                />
              </div>
            </CardContent>
          </Card>

          {/* AlphaKeypad */}
          <Card>
            <CardHeader>
              <CardTitle>AlphaKeypad</CardTitle>
              <CardDescription>Bokstavskodlås (koden är MYSTERY)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <AlphaKeypad
                  correctCode="MYSTERY"
                  maxAttempts={5}
                  onSuccess={() => alert('Korrekt ord! 🎉')}
                  onLockout={() => alert('Utelåst! 🔒')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Overlays */}
          <Card>
            <CardHeader>
              <CardTitle>Overlays</CardTitle>
              <CardDescription>Countdown och Story overlays</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => setShowCountdown(true)}>
                <ClockIcon className="h-4 w-4 mr-1" />
                Visa Countdown
              </Button>
              <Button onClick={() => setShowStory(true)}>
                <SparklesIcon className="h-4 w-4 mr-1" />
                Visa Story
              </Button>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Navigation Components */}
        <TabPanel id="navigation" activeTab={activeCategory} className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <PlayIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Navigation Components</h2>
          </div>

          {/* StepPhaseNavigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                StepPhaseNavigation
                <Badge variant="secondary">Facilitated</Badge>
              </CardTitle>
              <CardDescription>Navigation för steg och faser</CardDescription>
            </CardHeader>
            <CardContent>
              <StepPhaseNavigation
                currentStepIndex={currentStepIndex}
                totalSteps={FACILITATED_SESSION.steps.length}
                steps={FACILITATED_SESSION.steps}
                currentPhaseIndex={currentPhaseIndex}
                totalPhases={FACILITATED_SESSION.phases.length}
                phases={FACILITATED_SESSION.phases}
                onStepChange={setCurrentStepIndex}
                onPhaseChange={setCurrentPhaseIndex}
              />
            </CardContent>
          </Card>

          {/* StepViewer */}
          <Card>
            <CardHeader>
              <CardTitle>StepViewer</CardTitle>
              <CardDescription>Visar ett steg med all info</CardDescription>
            </CardHeader>
            <CardContent>
              {FACILITATED_SESSION.steps[currentStepIndex] && (
                <StepViewer
                  step={{
                    id: FACILITATED_SESSION.steps[currentStepIndex].id,
                    title: FACILITATED_SESSION.steps[currentStepIndex].title,
                    description: FACILITATED_SESSION.steps[currentStepIndex].description,
                    durationMinutes: FACILITATED_SESSION.steps[currentStepIndex].durationMinutes,
                    materials: FACILITATED_SESSION.steps[currentStepIndex].materials,
                    safety: FACILITATED_SESSION.steps[currentStepIndex].safety,
                    note: FACILITATED_SESSION.steps[currentStepIndex].note,
                    tag: FACILITATED_SESSION.steps[currentStepIndex].tag,
                  }}
                  index={currentStepIndex}
                  total={FACILITATED_SESSION.steps.length}
                />
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Roles Components */}
        <TabPanel id="roles" activeTab={activeCategory} className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Role Components</h2>
          </div>

          {/* RoleCard Variants */}
          <Card>
            <CardHeader>
              <CardTitle>RoleCard - Alla varianter</CardTitle>
              <CardDescription>Visar en roll med olika visningslägen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Full variant (med hemliga instruktioner)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {demoRoles.slice(0, 2).map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      variant="full"
                      showPrivate
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Summary variant</h4>
                <div className="flex flex-wrap gap-4">
                  {demoRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      variant="summary"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Compact variant</h4>
                <div className="flex flex-wrap gap-2">
                  {demoRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Trigger Components */}
        <TabPanel id="triggers" activeTab={activeCategory} className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <BoltIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Trigger Components</h2>
          </div>

          {/* ReadinessBadge */}
          <Card>
            <CardHeader>
              <CardTitle>ReadinessBadge</CardTitle>
              <CardDescription>Visuell indikator för status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {(['ready', 'warning', 'error', 'unknown'] as ReadinessLevel[]).map((level) => (
                  <div key={level} className="space-y-2">
                    <p className="text-sm text-muted-foreground capitalize">{level}</p>
                    <div className="flex items-center gap-2">
                      <ReadinessBadge level={level} variant="icon" />
                      <ReadinessBadge level={level} variant="badge" showLabel />
                      <ReadinessBadge level={level} variant="pill" showLabel />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TriggerList */}
          <Card>
            <CardHeader>
              <CardTitle>TriggerList</CardTitle>
              <CardDescription>Lista med triggers och kontroller</CardDescription>
            </CardHeader>
            <CardContent>
              <TriggerList
                triggers={triggers}
                onAdd={() => {
                  addTrigger({
                    name: `Ny Trigger ${triggers.length + 1}`,
                    when: { type: 'manual' },
                    then: [{ type: 'advance_step' }],
                  });
                }}
                onEdit={(t) => console.log('Edit:', t.name)}
                onToggle={(t) => t.enabled ? disableTrigger(t.id) : enableTrigger(t.id)}
                onDelete={(t) => removeTrigger(t.id)}
                onFire={(t) => fireTrigger(t.id)}
                onReset={(t) => resetTrigger(t.id)}
              />
            </CardContent>
          </Card>

          {/* Single TriggerCard */}
          <Card>
            <CardHeader>
              <CardTitle>TriggerCard (Compact)</CardTitle>
              <CardDescription>Kompakt visning av en trigger</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                {triggers[0] && (
                  <TriggerCard
                    trigger={triggers[0]}
                    compact
                    onEdit={(t) => console.log('Edit:', t.name)}
                    onToggle={(t) => t.enabled ? disableTrigger(t.id) : enableTrigger(t.id)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Lobby Components */}
        <TabPanel id="lobby" activeTab={activeCategory} className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Lobby Components</h2>
          </div>

          {/* LobbyHub */}
          <Card>
            <CardHeader>
              <CardTitle>LobbyHub</CardTitle>
              <CardDescription>Host lobby med hub-and-spoke navigation</CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <LobbyHub
                state={demoLobbyState}
                onParticipantsClick={() => console.log('Participants clicked')}
                onRolesClick={() => console.log('Roles clicked')}
                onContentClick={() => console.log('Content clicked')}
                onTriggersClick={() => console.log('Triggers clicked')}
                onSettingsClick={() => console.log('Settings clicked')}
                onStartSession={() => console.log('Start session!')}
              />
            </CardContent>
          </Card>
        </TabPanel>
      </div>

      {/* Overlays */}
      <CountdownOverlay
        duration={5}
        message="Nästa fas startar om"
        variant="dramatic"
        allowHostSkip
        isOpen={showCountdown}
        onComplete={() => setShowCountdown(false)}
        onSkip={() => setShowCountdown(false)}
      />

      <StoryOverlay
        text="Natten var mörk. Regnet piskade mot fönstren. I fjärran hördes åskan rulla. Plötsligt slocknade alla ljus..."
        theme="dramatic"
        speed="normal"
        isOpen={showStory}
        allowParticipantSkip
        onComplete={() => setShowStory(false)}
        onSkip={() => setShowStory(false)}
      />
    </SandboxShell>
  );
}

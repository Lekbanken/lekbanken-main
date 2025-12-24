'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlayIcon, ArrowPathIcon, BoltIcon, ClockIcon, SparklesIcon, LockClosedIcon, UsersIcon, SpeakerWaveIcon, BookOpenIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TypewriterText, 
  CountdownOverlay, 
  Keypad,
  AlphaKeypad,
  StoryOverlay,
  TriggerCard, 
  TriggerList, 
  LobbyHub,
  ReadinessBadge,
  RolesSection,
  SettingsSection,
  useTrigger,
  type TypewriterSpeed 
} from '@/components/play';
import type { LobbyState, ReadinessLevel, SessionSettings, Role, Participant } from '@/types/lobby';

const DEMO_TEXTS = {
  short: 'Dörren öppnas sakta...',
  medium: 'Ni befinner er i ett mörkt rum. Luften är fuktig och ni hör ett svagt droppande ljud från något håll. Era ficklampor lyser upp stenväggarna.',
  long: `Kapitel 3: Hemligheten avslöjas

Efter timmar av letande hittar ni äntligen det ni sökt. En gammal kista, gömd bakom en falsk vägg. Låset är rostigt men ger efter med ett högt knarrande.

Inuti ligger ett gulnat pergament. Texten är bleknad men läsbar:

"Den som läser dessa ord har funnit nyckeln. Men var försiktiga - inte allt är som det verkar. Följ stjärnorna, och sanningen ska uppenbaras."

Vad betyder detta? Och vad är det för stjärnor som nämns?`,
};

type DemoTextKey = keyof typeof DEMO_TEXTS;

export default function PlaySandboxPage() {
  const [typewriterSpeed, setTypewriterSpeed] = useState<TypewriterSpeed>('normal');
  const [typewriterText, setTypewriterText] = useState<DemoTextKey>('medium');
  const [typewriterKey, setTypewriterKey] = useState(0);
  const [typewriterSound, setTypewriterSound] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(5);
  const [countdownVariant, setCountdownVariant] = useState<'default' | 'dramatic'>('default');
  const [keypadKey, setKeypadKey] = useState(0);
  const [keypadCode, setKeypadCode] = useState('1234');
  const [keypadMaxAttempts, setKeypadMaxAttempts] = useState<number | undefined>(undefined);
  
  // Phase 2 state
  const [alphaKeypadKey, setAlphaKeypadKey] = useState(0);
  const [alphaKeypadWord, setAlphaKeypadWord] = useState('ESCAPE');
  const [showStoryOverlay, setShowStoryOverlay] = useState(false);
  const [storyTheme, setStoryTheme] = useState<'dark' | 'light' | 'dramatic'>('dark');
  const [demoSettings, setDemoSettings] = useState<SessionSettings>({
    showParticipantNames: true,
    allowChat: true,
    autoAdvance: false,
    requireRoles: true,
    maxParticipants: 8,
    durationLimit: 0,
  });
  const [demoRoles, setDemoRoles] = useState<Role[]>([
    { id: 'detective', name: 'Detektiven', description: 'Leder utredningen', icon: '🔍', color: 'blue' },
    { id: 'suspect', name: 'Den misstänkte', description: 'Har hemligheter', icon: '🕵️', color: 'red', secrets: 'Var på platsen vid tidpunkten för brottet.' },
    { id: 'witness', name: 'Vittnet', description: 'Såg något', icon: '👁️', color: 'green' },
  ]);
  const [demoParticipants, setDemoParticipants] = useState<Participant[]>([
    { id: 'p1', name: 'Anna', roleId: 'detective', isConnected: true, joinedAt: new Date() },
    { id: 'p2', name: 'Erik', roleId: 'suspect', isConnected: true, joinedAt: new Date() },
    { id: 'p3', name: 'Maria', isConnected: true, joinedAt: new Date() },
  ]);

  // Trigger demo state
  const { triggers, addTrigger, removeTrigger, enableTrigger, disableTrigger, fireTrigger, resetTrigger } = useTrigger({
    initialTriggers: [
      {
        id: 'demo-1',
        name: 'Unlock the Vault',
        enabled: true,
        status: 'armed',
        when: { type: 'keypad_correct', keypadId: 'safe-keypad' },
        then: [{ type: 'reveal_artifact', artifactId: 'secret-map' }],
        executeOnce: true,
        firedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo-2',
        name: 'Phase 2 Introduction',
        enabled: true,
        status: 'fired',
        when: { type: 'phase_started', phaseId: 'phase-2' },
        then: [
          { type: 'send_message', message: 'Welcome to Phase 2!', style: 'dramatic' },
          { type: 'show_countdown', duration: 5, message: 'Get ready...' },
        ],
        executeOnce: false,
        firedCount: 2,
        firedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'demo-3',
        name: 'Manual Host Action',
        enabled: false,
        status: 'disabled',
        when: { type: 'manual' },
        then: [{ type: 'advance_step' }],
        executeOnce: false,
        firedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  // Lobby demo state
  const demoLobbyState: LobbyState = {
    sessionId: 'demo-session',
    sessionName: 'Murder Mystery Night',
    sessionStatus: 'lobby',
    participants: [
      { id: 'p1', name: 'Anna Svensson', isConnected: true, roleId: 'detective', joinedAt: new Date() },
      { id: 'p2', name: 'Erik Lindberg', isConnected: true, roleId: 'suspect', joinedAt: new Date() },
      { id: 'p3', name: 'Maria Karlsson', isConnected: false, joinedAt: new Date() },
    ],
    roles: [
      { id: 'host', name: 'Game Master', isHost: true, icon: '🎭' },
      { id: 'detective', name: 'Detective', icon: '🔍' },
      { id: 'suspect', name: 'Suspect', icon: '🕵️' },
    ],
    phases: [
      {
        id: 'phase-1',
        title: 'Introduction',
        steps: [
          { id: 's1', title: 'Welcome', type: 'intro', isReady: true },
          { id: 's2', title: 'Rules', type: 'activity', isReady: true },
        ],
      },
      {
        id: 'phase-2',
        title: 'Investigation',
        steps: [
          { id: 's3', title: 'Gather Clues', type: 'activity', isReady: true },
          { id: 's4', title: 'Interrogation', type: 'decision', isReady: false, issues: ['Missing options'] },
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
      { section: 'participants', level: 'warning', checks: [{ key: 'roles', label: 'Roles', status: 'warning', message: '1 participant without role' }] },
      { section: 'roles', level: 'warning', checks: [] },
      { section: 'content', level: 'warning', checks: [{ key: 'steps', label: 'Steps', status: 'warning', message: '1 step has issues' }] },
      { section: 'triggers', level: 'ready', checks: [] },
      { section: 'settings', level: 'ready', checks: [] },
    ],
  };

  const resetTypewriter = () => {
    setTypewriterKey((k) => k + 1);
  };

  const resetKeypad = () => {
    setKeypadKey((k) => k + 1);
  };
  
  const resetAlphaKeypad = () => {
    setAlphaKeypadKey((k) => k + 1);
  };

  const handleAssignRole = (participantId: string, roleId: string | undefined) => {
    setDemoParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, roleId } : p
    ));
  };

  const handleRandomizeRoles = () => {
    const availableRoles = [...demoRoles];
    setDemoParticipants(prev => prev.map(p => {
      if (availableRoles.length === 0) return p;
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles.splice(randomIndex, 1)[0];
      return { ...p, roleId: role.id };
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/sandbox" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Sandbox</span>
          </Link>
          <div className="flex-1" />
          <Badge variant="accent">Sprint 1-4 + Phase 2</Badge>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8 space-y-12">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Play Immersion Components</h1>
          <p className="mt-2 text-muted-foreground">
            Typewriter text reveal och countdown overlay för Legendary Play
          </p>
        </div>

        {/* Typewriter Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">TypewriterText</h2>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontroller</CardTitle>
              <CardDescription>Konfigurera typewriter-effekten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Speed Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Hastighet</label>
                <div className="flex flex-wrap gap-2">
                  {(['fast', 'normal', 'dramatic', 'instant'] as TypewriterSpeed[]).map((speed) => (
                    <Button
                      key={speed}
                      variant={typewriterSpeed === speed ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTypewriterSpeed(speed);
                        resetTypewriter();
                      }}
                    >
                      {speed === 'fast' && <BoltIcon className="h-4 w-4 mr-1" />}
                      {speed === 'normal' && <PlayIcon className="h-4 w-4 mr-1" />}
                      {speed === 'dramatic' && <ClockIcon className="h-4 w-4 mr-1" />}
                      {speed.charAt(0).toUpperCase() + speed.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Text Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Text</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(DEMO_TEXTS) as DemoTextKey[]).map((key) => (
                    <Button
                      key={key}
                      variant={typewriterText === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTypewriterText(key);
                        resetTypewriter();
                      }}
                    >
                      {key === 'short' && 'Kort'}
                      {key === 'medium' && 'Medium'}
                      {key === 'long' && 'Lång'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle (Phase 2) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ljud</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={typewriterSound ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setTypewriterSound(!typewriterSound);
                      resetTypewriter();
                    }}
                  >
                    <SpeakerWaveIcon className="h-4 w-4 mr-1" />
                    {typewriterSound ? 'Ljud på' : 'Ljud av'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Phase 2: Typewriter-ljud spelar var 3:e tecken</p>
              </div>

              {/* Reset Button */}
              <Button variant="outline" onClick={resetTypewriter} className="gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Starta om
              </Button>
            </CardContent>
          </Card>

          {/* Demo: Default Variant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Variant</CardTitle>
              <CardDescription>Standard text med progress bar</CardDescription>
            </CardHeader>
            <CardContent>
              <TypewriterText
                key={`default-${typewriterKey}`}
                text={DEMO_TEXTS[typewriterText]}
                speed={typewriterSpeed}
                showProgress
                allowSkip
                allowPause
                variant="default"
                soundEnabled={typewriterSound}
                onComplete={() => console.log('Typewriter complete!')}
              />
            </CardContent>
          </Card>

          {/* Demo: Story Variant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Story Variant</CardTitle>
              <CardDescription>Större text för narrativa moment</CardDescription>
            </CardHeader>
            <CardContent>
              <TypewriterText
                key={`story-${typewriterKey}`}
                text={DEMO_TEXTS[typewriterText]}
                speed={typewriterSpeed}
                showProgress
                allowSkip
                variant="story"
              />
            </CardContent>
          </Card>

          {/* Demo: Message Variant */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Variant</CardTitle>
              <CardDescription>För meddelanden på Wall/Board</CardDescription>
            </CardHeader>
            <CardContent>
              <TypewriterText
                key={`message-${typewriterKey}`}
                text={DEMO_TEXTS[typewriterText]}
                speed={typewriterSpeed}
                showProgress={false}
                variant="message"
              />
            </CardContent>
          </Card>
        </section>

        {/* Countdown Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">CountdownOverlay</h2>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontroller</CardTitle>
              <CardDescription>Konfigurera countdown overlay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Varaktighet</label>
                <div className="flex flex-wrap gap-2">
                  {[3, 5, 10].map((duration) => (
                    <Button
                      key={duration}
                      variant={countdownDuration === duration ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCountdownDuration(duration)}
                    >
                      {duration} sekunder
                    </Button>
                  ))}
                </div>
              </div>

              {/* Variant Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Variant</label>
                <div className="flex flex-wrap gap-2">
                  {(['default', 'dramatic'] as const).map((variant) => (
                    <Button
                      key={variant}
                      variant={countdownVariant === variant ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCountdownVariant(variant)}
                    >
                      {variant === 'default' && 'Default'}
                      {variant === 'dramatic' && '✨ Dramatisk'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trigger Button */}
              <Button onClick={() => setShowCountdown(true)} className="gap-2">
                <PlayIcon className="h-4 w-4" />
                Starta Countdown
              </Button>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Klicka på &quot;Starta Countdown&quot; för att visa overlay</p>
              <p className="text-sm mt-2">
                Duration: {countdownDuration}s • Variant: {countdownVariant}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Usage Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Användning</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TypewriterText</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { TypewriterText } from '@/components/play';

<TypewriterText
  text="Dörren öppnas sakta..."
  speed="dramatic"
  showProgress
  allowSkip
  onComplete={() => console.log('Done!')}
/>`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CountdownOverlay</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { CountdownOverlay } from '@/components/play';

<CountdownOverlay
  duration={5}
  message="Nästa steg startar om"
  variant="dramatic"
  allowHostSkip
  onComplete={() => advanceStep()}
  isOpen={showCountdown}
/>`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keypad</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { Keypad } from '@/components/play';

<Keypad
  correctCode="1234"
  maxAttempts={5}
  onSuccess={() => unlockDoor()}
  onLockout={() => gameOver()}
/>`}
              </pre>
            </CardContent>
          </Card>
        </section>

        {/* Keypad Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Keypad</h2>
            <Badge variant="accent">Sprint 3</Badge>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontroller</CardTitle>
              <CardDescription>Konfigurera PIN-koden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Code Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Korrekt kod</label>
                <div className="flex flex-wrap gap-2">
                  {['1234', '0000', '1337', '9876'].map((code) => (
                    <Button
                      key={code}
                      variant={keypadCode === code ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setKeypadCode(code);
                        resetKeypad();
                      }}
                    >
                      {code}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Max Attempts */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Max försök</label>
                <div className="flex flex-wrap gap-2">
                  {[undefined, 3, 5, 10].map((attempts) => (
                    <Button
                      key={attempts ?? 'unlimited'}
                      variant={keypadMaxAttempts === attempts ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setKeypadMaxAttempts(attempts);
                        resetKeypad();
                      }}
                    >
                      {attempts ?? 'Obegränsat'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <Button variant="outline" onClick={resetKeypad} className="gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Återställ
              </Button>
            </CardContent>
          </Card>

          {/* Demo */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Medium (Default)</CardTitle>
                <CardDescription>64×64px knappar, standard storlek</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <Keypad
                  key={`md-${keypadKey}`}
                  correctCode={keypadCode}
                  maxAttempts={keypadMaxAttempts}
                  size="md"
                  onSuccess={() => console.log('Keypad unlocked!')}
                  onWrongCode={(remaining) => console.log(`Wrong! ${remaining} attempts left`)}
                  onLockout={() => console.log('Locked out!')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Large</CardTitle>
                <CardDescription>Större knappar för enklare användning</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <Keypad
                  key={`lg-${keypadKey}`}
                  correctCode={keypadCode}
                  maxAttempts={keypadMaxAttempts}
                  size="lg"
                  title="Lås upp kassaskåpet"
                  onSuccess={() => console.log('Keypad unlocked!')}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AlphaKeypad Section (Phase 2) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground">AlphaKeypad</h2>
            <Badge variant="accent">Phase 2</Badge>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontroller</CardTitle>
              <CardDescription>A-Z tangentbord för ordpussel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Word Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Korrekt ord</label>
                <div className="flex flex-wrap gap-2">
                  {['ESCAPE', 'KEY', 'MYSTERY', 'CLUE'].map((word) => (
                    <Button
                      key={word}
                      variant={alphaKeypadWord === word ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setAlphaKeypadWord(word);
                        resetAlphaKeypad();
                      }}
                    >
                      {word}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <Button variant="outline" onClick={resetAlphaKeypad} className="gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Återställ
              </Button>
            </CardContent>
          </Card>

          {/* Demo */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Med bokstäver</CardTitle>
                <CardDescription>Visar inmatade bokstäver</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <AlphaKeypad
                  key={`alpha-letters-${alphaKeypadKey}`}
                  correctCode={alphaKeypadWord}
                  showLetters
                  maxAttempts={3}
                  onSuccess={() => console.log('Word correct!')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Med prickar</CardTitle>
                <CardDescription>Döljer inmatningen som prickar</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <AlphaKeypad
                  key={`alpha-dots-${alphaKeypadKey}`}
                  correctCode={alphaKeypadWord}
                  showLetters={false}
                  title="Gissa lösenordet"
                  onSuccess={() => console.log('Password correct!')}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* StoryOverlay Section (Phase 2) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">StoryOverlay</h2>
            <Badge variant="accent">Phase 2</Badge>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontroller</CardTitle>
              <CardDescription>Fullskärmsoverlay för dramatiska textmoment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tema</label>
                <div className="flex flex-wrap gap-2">
                  {(['dark', 'light', 'dramatic'] as const).map((theme) => (
                    <Button
                      key={theme}
                      variant={storyTheme === theme ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStoryTheme(theme)}
                    >
                      {theme === 'dark' && '🌙 Mörkt'}
                      {theme === 'light' && '☀️ Ljust'}
                      {theme === 'dramatic' && '✨ Dramatiskt'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trigger Button */}
              <Button onClick={() => setShowStoryOverlay(true)} className="gap-2">
                <PlayIcon className="h-4 w-4" />
                Visa Story Overlay
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Trigger Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BoltIcon className="h-6 w-6 text-yellow" />
            <h2 className="text-2xl font-semibold text-foreground">Trigger System</h2>
            <Badge variant="accent">Sprint 4</Badge>
          </div>

          {/* Readiness Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ReadinessBadge</CardTitle>
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

          {/* Trigger List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TriggerList</CardTitle>
              <CardDescription>Lista med triggers och kontroller</CardDescription>
            </CardHeader>
            <CardContent>
              <TriggerList
                triggers={triggers}
                onAdd={() => {
                  addTrigger({
                    name: `New Trigger ${triggers.length + 1}`,
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

          {/* Single Trigger Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">TriggerCard (Compact)</CardTitle>
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
        </section>

        {/* Lobby Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Lobby Hub</h2>
            <Badge variant="accent">Sprint 4</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">LobbyHub</CardTitle>
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
        </section>

        {/* RolesSection (Phase 2) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground">Roles Section</h2>
            <Badge variant="accent">Phase 2</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RolesSection</CardTitle>
              <CardDescription>Roller med tilldelning och hemligheter</CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <RolesSection
                roles={demoRoles}
                participants={demoParticipants}
                onAddRole={() => {
                  const id = `role-${Date.now()}`;
                  setDemoRoles(prev => [...prev, { id, name: 'Ny roll', icon: '🎭', color: 'purple' }]);
                }}
                onEditRole={(role) => console.log('Edit role:', role.name)}
                onDeleteRole={(roleId) => setDemoRoles(prev => prev.filter(r => r.id !== roleId))}
                onAssignRole={handleAssignRole}
                onRandomizeRoles={handleRandomizeRoles}
              />
            </CardContent>
          </Card>
        </section>

        {/* SettingsSection (Phase 2) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground">Settings Section</h2>
            <Badge variant="accent">Phase 2</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SettingsSection</CardTitle>
              <CardDescription>Sessionsinställningar med toggles och inputs</CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <SettingsSection
                settings={demoSettings}
                onChange={setDemoSettings}
              />
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Countdown Overlay */}
      <CountdownOverlay
        duration={countdownDuration}
        message="Nästa steg startar om"
        variant={countdownVariant}
        allowHostSkip
        isOpen={showCountdown}
        onComplete={() => {
          setShowCountdown(false);
          console.log('Countdown complete!');
        }}
        onSkip={() => {
          setShowCountdown(false);
          console.log('Countdown skipped!');
        }}
      />

      {/* Story Overlay (Phase 2) */}
      <StoryOverlay
        text={DEMO_TEXTS.long}
        theme={storyTheme}
        speed="normal"
        isOpen={showStoryOverlay}
        allowParticipantSkip
        onComplete={() => {
          setShowStoryOverlay(false);
          console.log('Story complete!');
        }}
        onSkip={() => {
          setShowStoryOverlay(false);
          console.log('Story skipped!');
        }}
      />
    </div>
  );
}

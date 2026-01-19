/**
 * Participant View Sandbox
 *
 * Visar deltagarens perspektiv för olika play-lägen.
 * Simulerar upplevelsen som en deltagare har under en session.
 */

'use client';

import { useState, useEffect } from 'react';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Play components
import { ParticipantPlayView } from '@/features/play/components/ParticipantPlayView';
import { RoleCard } from '@/features/play/components/RoleCard';
import { JoinSessionForm, TypewriterText, CountdownOverlay } from '@/components/play';

// Mock data
import { FACILITATED_SESSION, PARTICIPANTS_SESSION } from '../mock-data';

import { 
  UsersIcon, 
  EyeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type DevicePreview = 'mobile' | 'tablet' | 'desktop';
type ParticipantScenario = 'joining' | 'waiting' | 'playing' | 'with-role' | 'spectator';

export default function ParticipantViewPage() {
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('mobile');
  const [scenario, setScenario] = useState<ParticipantScenario>('playing');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Simulate step changes from host
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    if (!autoAdvance) return;
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        const next = prev + 1;
        if (next >= FACILITATED_SESSION.steps.length) {
          setAutoAdvance(false);
          return prev;
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [autoAdvance]);

  // Get preview width based on device
  const getPreviewStyle = () => {
    switch (devicePreview) {
      case 'mobile':
        return { maxWidth: '375px', minHeight: '667px' };
      case 'tablet':
        return { maxWidth: '768px', minHeight: '600px' };
      case 'desktop':
        return { maxWidth: '100%', minHeight: '500px' };
    }
  };

  // Get role for participants mode
  const getRole = () => {
    if (scenario !== 'with-role') return null;
    const role = PARTICIPANTS_SESSION.sessionRoles[0];
    return role ? {
      id: role.id,
      name: role.name,
      icon: role.icon,
      color: role.color,
      public_description: role.public_description,
      private_instructions: role.private_instructions,
      private_hints: role.private_hints,
    } : null;
  };

  return (
    <SandboxShell
      moduleId="play-participant"
      title="Participant View"
      description="Deltagarens perspektiv"
    >
      <div className="space-y-8">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Kontroller</CardTitle>
            <CardDescription>Simulera deltagarupplevelsen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Enhetsförhandsgranskning</label>
              <div className="flex gap-2">
                <Button
                  variant={devicePreview === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDevicePreview('mobile')}
                >
                  <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                  Mobil
                </Button>
                <Button
                  variant={devicePreview === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDevicePreview('tablet')}
                >
                  <DevicePhoneMobileIcon className="h-4 w-4 mr-1 rotate-90" />
                  Tablet
                </Button>
                <Button
                  variant={devicePreview === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDevicePreview('desktop')}
                >
                  <ComputerDesktopIcon className="h-4 w-4 mr-1" />
                  Desktop
                </Button>
              </div>
            </div>

            {/* Scenario Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Scenario</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={scenario === 'joining' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario('joining')}
                >
                  Ansluter
                </Button>
                <Button
                  variant={scenario === 'waiting' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario('waiting')}
                >
                  Väntar i lobby
                </Button>
                <Button
                  variant={scenario === 'playing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario('playing')}
                >
                  Spelar (utan roll)
                </Button>
                <Button
                  variant={scenario === 'with-role' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario('with-role')}
                >
                  Spelar (med roll)
                </Button>
                <Button
                  variant={scenario === 'spectator' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario('spectator')}
                >
                  Åskådare
                </Button>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                />
                Auto-avancera steg (var 5:e sekund)
              </label>
              <Button variant="outline" size="sm" onClick={() => setShowCountdown(true)}>
                Simulera countdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowWelcome(true)}>
                Visa välkomst
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStepIndex(0)}>
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Area */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <EyeIcon className="h-5 w-5" />
                  Deltagarvy
                </CardTitle>
                <CardDescription>
                  {scenario === 'joining' && 'Deltagaren ansluter till sessionen'}
                  {scenario === 'waiting' && 'Deltagaren väntar på att sessionen ska börja'}
                  {scenario === 'playing' && 'Deltagaren är med i en aktiv session'}
                  {scenario === 'with-role' && 'Deltagaren har en tilldelad roll'}
                  {scenario === 'spectator' && 'Deltagaren tittar på utan att delta'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {devicePreview} • Steg {currentStepIndex + 1}/{FACILITATED_SESSION.steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div
                className="border-4 border-gray-800 rounded-2xl bg-gray-900 p-2 overflow-hidden"
                style={getPreviewStyle()}
              >
                <div className="bg-background rounded-lg h-full overflow-auto">
                  {/* Joining Scenario */}
                  {scenario === 'joining' && (
                    <div className="p-4 space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold">Gå med i session</h2>
                        <p className="text-sm text-muted-foreground">
                          Ange din kod för att gå med
                        </p>
                      </div>
                      <JoinSessionForm
                        onSubmit={(code: string, name: string) => {
                          console.log('Join:', code, name);
                          setScenario('waiting');
                        }}
                      />
                    </div>
                  )}

                  {/* Waiting Scenario */}
                  {scenario === 'waiting' && (
                    <div className="p-4 space-y-6 text-center">
                      <div className="space-y-2">
                        <div className="text-4xl animate-bounce">⏳</div>
                        <h2 className="text-xl font-bold">{FACILITATED_SESSION.gameTitle}</h2>
                        <p className="text-sm text-muted-foreground">
                          Väntar på att ledaren ska starta sessionen...
                        </p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm font-medium">Du är ansluten som</p>
                        <p className="text-lg font-bold">Test Deltagare</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <UsersIcon className="h-4 w-4 inline mr-1" />
                        {FACILITATED_SESSION.participantCount} deltagare anslutna
                      </div>
                      <Button onClick={() => setScenario('playing')}>
                        Simulera start
                      </Button>
                    </div>
                  )}

                  {/* Playing Scenario (without role) */}
                  {scenario === 'playing' && (
                    <ParticipantPlayView
                      sessionId={FACILITATED_SESSION.sessionId}
                      gameTitle={FACILITATED_SESSION.gameTitle}
                      steps={FACILITATED_SESSION.steps.map((s) => ({
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        durationMinutes: s.duration ? Math.ceil(s.duration / 60) : undefined,
                      }))}
                      initialState={{ current_step_index: currentStepIndex }}
                      role={undefined}
                      participantName="Test Deltagare"
                      showRole={false}
                    />
                  )}

                  {/* Playing with Role Scenario */}
                  {scenario === 'with-role' && (
                    <div className="space-y-4">
                      {/* Role Card at top */}
                      {getRole() && (
                        <div className="p-4 bg-muted/50">
                          <RoleCard
                            role={getRole()!}
                            showPrivate
                            variant="compact"
                          />
                        </div>
                      )}
                      <ParticipantPlayView
                        sessionId={PARTICIPANTS_SESSION.sessionId}
                        gameTitle={PARTICIPANTS_SESSION.gameTitle}
                        steps={PARTICIPANTS_SESSION.steps.map((s) => ({
                          id: s.id,
                          title: s.title,
                          description: s.description,
                          durationMinutes: s.duration ? Math.ceil(s.duration / 60) : undefined,
                        }))}
                        initialState={{ current_step_index: currentStepIndex }}
                        role={getRole() ?? undefined}
                        participantName="Test Deltagare"
                        showRole
                      />
                    </div>
                  )}

                  {/* Spectator Scenario */}
                  {scenario === 'spectator' && (
                    <div className="p-4 space-y-4">
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <EyeIcon className="h-5 w-5" />
                          <span className="font-medium">Åskådarläge</span>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Du tittar på sessionen utan att delta aktivt.
                        </p>
                      </div>
                      <ParticipantPlayView
                        sessionId={FACILITATED_SESSION.sessionId}
                        gameTitle={FACILITATED_SESSION.gameTitle}
                        steps={FACILITATED_SESSION.steps.map((s) => ({
                          id: s.id,
                          title: s.title,
                          description: s.description,
                          durationMinutes: s.duration ? Math.ceil(s.duration / 60) : undefined,
                        }))}
                        initialState={{ current_step_index: currentStepIndex }}
                        role={undefined}
                        participantName="Åskådare"
                        showRole={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Roles Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Alla tillgängliga roller
            </CardTitle>
            <CardDescription>
              Förhandsgranskning av alla roller i &quot;Participants&quot;-läget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PARTICIPANTS_SESSION.sessionRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={{
                    id: role.id,
                    name: role.name,
                    icon: role.icon ?? '🎭',
                    color: role.color ?? 'gray',
                    public_description: role.public_description ?? '',
                    private_instructions: role.private_instructions ?? '',
                    private_hints: role.private_hints,
                  }}
                  showPrivate
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Immersion Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              Immersion-händelser
            </CardTitle>
            <CardDescription>
              Testa hur dramatiska effekter visas för deltagare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dessa effekter triggas av ledaren och visas för alla deltagare samtidigt.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowCountdown(true)}>
                Countdown Overlay
              </Button>
              <Button onClick={() => setShowWelcome(true)}>
                Välkomstmeddelande
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Countdown Overlay */}
      <CountdownOverlay
        duration={5}
        message="Nästa fas börjar om"
        variant="dramatic"
        isOpen={showCountdown}
        onComplete={() => setShowCountdown(false)}
        onSkip={() => setShowCountdown(false)}
      />

      {/* Welcome Message Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background max-w-lg w-full rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold text-center">Välkommen!</h2>
            <TypewriterText
              text="Ni har blivit inbjudna till Herrgårdens stora mysterium. Era detektivkunskaper kommer att sättas på prov. Var uppmärksamma, ställ rätt frågor, och kanske - bara kanske - lyckas ni avslöja sanningen..."
              speed="normal"
              showProgress
              variant="story"
              onComplete={() => setTimeout(() => setShowWelcome(false), 2000)}
            />
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setShowWelcome(false)}>
                Stäng
              </Button>
            </div>
          </div>
        </div>
      )}
    </SandboxShell>
  );
}

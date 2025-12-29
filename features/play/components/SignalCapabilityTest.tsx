/**
 * SignalCapabilityTest Component
 * 
 * Lobby component that allows hosts and participants to test
 * their device's signal capabilities before starting a game.
 * 
 * Task 4.3 - Session Cockpit Architecture
 */

'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import {
  LightBulbIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BellIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import {
  useSignalCapabilities,
  type SignalCapability,
  type SignalCapabilityStatus,
} from '../hooks/useSignalCapabilities';

// =============================================================================
// Types
// =============================================================================

export interface SignalCapabilityTestProps {
  /** Callback when all tests are complete */
  onComplete?: (availableCount: number, totalCount: number) => void;
  /** Show compact version */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CAPABILITY_CONFIG: Record<
  SignalCapability['type'],
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    testButtonLabel: string;
    fallbackInfo: string;
  }
> = {
  torch: {
    icon: <LightBulbIcon className="h-5 w-5" />,
    label: 'Ficklampa',
    description: 'Använd telefonens ficklampa som signal',
    testButtonLabel: 'Blinka',
    fallbackInfo: 'Kräver kamera-tillgång och en enhet med ficklampa (de flesta smartphones)',
  },
  audio: {
    icon: <SpeakerWaveIcon className="h-5 w-5" />,
    label: 'Ljud',
    description: 'Spela upp ljud som signal',
    testButtonLabel: 'Pip',
    fallbackInfo: 'Fungerar i de flesta webbläsare. På iOS kan du behöva trycka på skärmen först.',
  },
  vibration: {
    icon: <DevicePhoneMobileIcon className="h-5 w-5" />,
    label: 'Vibration',
    description: 'Vibrera enheten som signal',
    testButtonLabel: 'Vibrera',
    fallbackInfo: 'Fungerar på de flesta smartphones. Desktop-datorer stödjer inte vibration.',
  },
  screen_flash: {
    icon: <ComputerDesktopIcon className="h-5 w-5" />,
    label: 'Skärmblänk',
    description: 'Blinka skärmen i olika färger',
    testButtonLabel: 'Blinka',
    fallbackInfo: 'Fungerar i alla webbläsare. Bäst effekt i ett mörkt rum.',
  },
  notification: {
    icon: <BellIcon className="h-5 w-5" />,
    label: 'Notifikation',
    description: 'Visa push-notifikationer',
    testButtonLabel: 'Testa',
    fallbackInfo: 'Kräver att du tillåter notifikationer. Fungerar bäst på mobila enheter.',
  },
};

// =============================================================================
// Helper: Status Icon
// =============================================================================

function StatusIcon({ status }: { status: SignalCapabilityStatus }) {
  switch (status) {
    case 'available':
      return <CheckIcon className="h-4 w-4 text-green-500" />;
    case 'unavailable':
      return <XMarkIcon className="h-4 w-4 text-muted-foreground" />;
    case 'denied':
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    case 'unknown':
    default:
      return <QuestionMarkCircleIcon className="h-4 w-4 text-muted-foreground" />;
  }
}

// =============================================================================
// Helper: Status Badge
// =============================================================================

function StatusBadge({ status }: { status: SignalCapabilityStatus }) {
  switch (status) {
    case 'available':
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
          Tillgänglig
        </Badge>
      );
    case 'unavailable':
      return (
        <Badge variant="outline">
          Ej tillgänglig
        </Badge>
      );
    case 'denied':
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
          Behörighet nekad
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          Fel
        </Badge>
      );
    case 'unknown':
    default:
      return (
        <Badge variant="outline">
          Ej testad
        </Badge>
      );
  }
}

// =============================================================================
// Loading Spinner
// =============================================================================

function Spinner({ className }: { className?: string }) {
  return (
    <ArrowPathIcon className={`animate-spin ${className}`} />
  );
}

// =============================================================================
// Sub-Component: CapabilityRow
// =============================================================================

interface CapabilityRowProps {
  capability: SignalCapability;
  config: typeof CAPABILITY_CONFIG['torch'];
  onTest: () => Promise<void>;
  isTesting: boolean;
  compact?: boolean;
}

function CapabilityRow({
  capability,
  config,
  onTest,
  isTesting,
  compact,
}: CapabilityRowProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={capability.status} />
          <span className="text-sm">{config.label}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTest}
          disabled={isTesting || capability.status === 'unavailable' || capability.status === 'denied'}
          className="h-7 px-2"
        >
          {isTesting ? (
            <Spinner className="h-3 w-3" />
          ) : (
            config.testButtonLabel
          )}
        </Button>
      </div>
    );
  }
  
  const tooltipContent = capability.status === 'unavailable'
    ? 'Denna funktion stöds inte på din enhet'
    : capability.status === 'denied'
    ? 'Du behöver ge behörighet för denna funktion'
    : `Testa ${config.label.toLowerCase()}`;
  
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card">
      <div className={`
        p-2 rounded-lg
        ${capability.status === 'available' ? 'bg-green-500/10 text-green-600' : ''}
        ${capability.status === 'unavailable' ? 'bg-muted text-muted-foreground' : ''}
        ${capability.status === 'denied' ? 'bg-yellow-500/10 text-yellow-600' : ''}
        ${capability.status === 'error' ? 'bg-red-500/10 text-red-600' : ''}
        ${capability.status === 'unknown' ? 'bg-muted text-muted-foreground' : ''}
      `}>
        {config.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{config.label}</h4>
          <StatusBadge status={capability.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {config.description}
        </p>
        
        {/* Show fallback info if unavailable or denied */}
        {(capability.status === 'unavailable' || capability.status === 'denied') && (
          <div className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
            <QuestionMarkCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{config.fallbackInfo}</span>
          </div>
        )}
      </div>
      
      <Tooltip content={tooltipContent}>
        <Button
          variant={capability.status === 'available' ? 'outline' : 'default'}
          size="sm"
          onClick={onTest}
          disabled={isTesting || capability.status === 'unavailable'}
          className="flex-shrink-0"
        >
          {isTesting ? (
            <>
              <Spinner className="h-4 w-4 mr-1" />
              Testar...
            </>
          ) : (
            config.testButtonLabel
          )}
        </Button>
      </Tooltip>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SignalCapabilityTest({
  onComplete,
  compact = false,
  className,
}: SignalCapabilityTestProps) {
  const {
    capabilities,
    allTested,
    availableCount,
    isTesting: isTestingAll,
    testAll,
    testCapability,
    flashScreen,
    playSound,
    vibrate,
    flashTorch,
    sendNotification,
    activateAudioGate,
    audioGateActive,
  } = useSignalCapabilities({ autoDetect: true });
  
  const [testingCapability, setTestingCapability] = useState<SignalCapability['type'] | null>(null);
  
  // Handle testing a specific capability
  const handleTest = useCallback(async (type: SignalCapability['type']) => {
    setTestingCapability(type);
    
    try {
      switch (type) {
        case 'torch':
          await flashTorch(300);
          break;
        case 'audio':
          if (!audioGateActive) {
            await activateAudioGate();
          }
          await playSound();
          break;
        case 'vibration':
          await vibrate([100, 50, 100]);
          break;
        case 'screen_flash':
          await flashScreen('#ffffff', 200);
          break;
        case 'notification':
          await sendNotification('Signaltest', 'Notifikationer fungerar!');
          break;
      }
      
      // Re-test to update status
      await testCapability(type);
    } finally {
      setTestingCapability(null);
    }
  }, [
    flashTorch,
    playSound,
    vibrate,
    flashScreen,
    sendNotification,
    activateAudioGate,
    audioGateActive,
    testCapability,
  ]);
  
  // Handle test all
  const handleTestAll = useCallback(async () => {
    await testAll();
    onComplete?.(availableCount, 5);
  }, [testAll, onComplete, availableCount]);
  
  // Capability entries
  const capabilityEntries = [
    { type: 'screen_flash' as const, capability: capabilities.screenFlash },
    { type: 'audio' as const, capability: capabilities.audio },
    { type: 'vibration' as const, capability: capabilities.vibration },
    { type: 'torch' as const, capability: capabilities.torch },
    { type: 'notification' as const, capability: capabilities.notification },
  ];
  
  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DevicePhoneMobileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Signaler</span>
          </div>
          <Badge variant={availableCount >= 3 ? 'default' : 'outline'}>
            {availableCount}/5
          </Badge>
        </div>
        
        <div className="divide-y">
          {capabilityEntries.map(({ type, capability }) => (
            <CapabilityRow
              key={type}
              capability={capability}
              config={CAPABILITY_CONFIG[type]}
              onTest={() => handleTest(type)}
              isTesting={testingCapability === type}
              compact
            />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="h-5 w-5" />
              Signaltest
            </CardTitle>
            <CardDescription className="mt-1">
              Testa vilka signaler din enhet stödjer
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={availableCount >= 3 ? 'default' : 'outline'}
              className="text-base"
            >
              {availableCount}/5 tillgängliga
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestAll}
              disabled={isTestingAll}
            >
              {isTestingAll ? (
                <>
                  <Spinner className="h-4 w-4 mr-1" />
                  Testar...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Testa alla
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {capabilityEntries.map(({ type, capability }) => (
          <CapabilityRow
            key={type}
            capability={capability}
            config={CAPABILITY_CONFIG[type]}
            onTest={() => handleTest(type)}
            isTesting={testingCapability === type}
          />
        ))}
        
        {/* iOS Audio Gate Warning */}
        {capabilities.audio.status === 'available' && !audioGateActive && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
            <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>iOS-användare:</strong> Tryck på &quot;Pip&quot;-knappen ovan för att 
              aktivera ljud. Detta behöver bara göras en gång per session.
            </div>
          </div>
        )}
        
        {/* Summary */}
        {allTested && (
          <div className={`
            p-4 rounded-lg text-center
            ${availableCount >= 4 ? 'bg-green-500/10 text-green-700' : ''}
            ${availableCount >= 2 && availableCount < 4 ? 'bg-yellow-500/10 text-yellow-700' : ''}
            ${availableCount < 2 ? 'bg-red-500/10 text-red-700' : ''}
          `}>
            {availableCount >= 4 && (
              <>
                <CheckIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="font-medium">Utmärkt! Din enhet stödjer de flesta signaler.</p>
              </>
            )}
            {availableCount >= 2 && availableCount < 4 && (
              <>
                <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="font-medium">Din enhet stödjer grundläggande signaler.</p>
              </>
            )}
            {availableCount < 2 && (
              <>
                <XMarkIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="font-medium">Begränsat signalstöd på denna enhet.</p>
              </>
            )}
            <p className="text-sm mt-1 opacity-80">
              {availableCount} av 5 signaltyper tillgängliga
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

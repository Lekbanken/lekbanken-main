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
import { useTranslations } from 'next-intl';
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

const CAPABILITY_ICONS: Record<SignalCapability['type'], React.ReactNode> = {
  torch: <LightBulbIcon className="h-5 w-5" />,
  audio: <SpeakerWaveIcon className="h-5 w-5" />,
  vibration: <DevicePhoneMobileIcon className="h-5 w-5" />,
  screen_flash: <ComputerDesktopIcon className="h-5 w-5" />,
  notification: <BellIcon className="h-5 w-5" />,
};

const CAPABILITY_TRANSLATION_KEYS: Record<SignalCapability['type'], string> = {
  torch: 'torch',
  audio: 'audio',
  vibration: 'vibration',
  screen_flash: 'screenFlash',
  notification: 'notification',
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
  const t = useTranslations('play.signalCapabilityTest');
  switch (status) {
    case 'available':
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
          {t('status.available')}
        </Badge>
      );
    case 'unavailable':
      return (
        <Badge variant="outline">
          {t('status.unavailable')}
        </Badge>
      );
    case 'denied':
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
          {t('status.denied')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          {t('status.error')}
        </Badge>
      );
    case 'unknown':
    default:
      return (
        <Badge variant="outline">
          {t('status.unknown')}
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
  capabilityType: SignalCapability['type'];
  onTest: () => Promise<void>;
  isTesting: boolean;
  compact?: boolean;
}

function CapabilityRow({
  capability,
  capabilityType,
  onTest,
  isTesting,
  compact,
}: CapabilityRowProps) {
  const t = useTranslations('play.signalCapabilityTest');
  const translationKey = CAPABILITY_TRANSLATION_KEYS[capabilityType];
  const icon = CAPABILITY_ICONS[capabilityType];
  const label = t(`capabilities.${translationKey}.label` as 'capabilities.torch.label');
  const description = t(`capabilities.${translationKey}.description` as 'capabilities.torch.description');
  const testButton = t(`capabilities.${translationKey}.testButton` as 'capabilities.torch.testButton');
  const fallback = t(`capabilities.${translationKey}.fallback` as 'capabilities.torch.fallback');

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={capability.status} />
          <span className="text-sm">{label}</span>
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
            testButton
          )}
        </Button>
      </div>
    );
  }
  
  const tooltipContent = capability.status === 'unavailable'
    ? t('tooltips.unavailable')
    : capability.status === 'denied'
    ? t('tooltips.denied')
    : t('tooltips.test', { capability: label.toLowerCase() });
  
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
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{label}</h4>
          <StatusBadge status={capability.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
        
        {/* Show fallback info if unavailable or denied */}
        {(capability.status === 'unavailable' || capability.status === 'denied') && (
          <div className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
            <QuestionMarkCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{fallback}</span>
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
              {t('testing')}
            </>
          ) : (
            testButton
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
  const t = useTranslations('play.signalCapabilityTest');
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
          await sendNotification(t('notificationTest.title'), t('notificationTest.body'));
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
    t,
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
            <span className="text-sm font-medium">{t('signalsLabel')}</span>
          </div>
          <Badge variant={availableCount >= 3 ? 'default' : 'outline'}>
            {t('availableCountShort', { count: availableCount })}
          </Badge>
        </div>
        
        <div className="divide-y">
          {capabilityEntries.map(({ type, capability }) => (
            <CapabilityRow
              key={type}
              capability={capability}
              capabilityType={type}
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
              {t('title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('description')}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={availableCount >= 3 ? 'default' : 'outline'}
              className="text-base"
            >
              {t('availableCount', { count: availableCount })}
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
                  {t('testing')}
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  {t('testAll')}
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
            capabilityType={type}
            onTest={() => handleTest(type)}
            isTesting={testingCapability === type}
          />
        ))}
        
        {/* iOS Audio Gate Warning */}
        {capabilities.audio.status === 'available' && !audioGateActive && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
            <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>{t('iosWarning.title')}</strong> {t('iosWarning.message')}
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
                <p className="font-medium">{t('summary.excellent')}</p>
              </>
            )}
            {availableCount >= 2 && availableCount < 4 && (
              <>
                <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="font-medium">{t('summary.basic')}</p>
              </>
            )}
            {availableCount < 2 && (
              <>
                <XMarkIcon className="h-6 w-6 mx-auto mb-2" />
                <p className="font-medium">{t('summary.limited')}</p>
              </>
            )}
            <p className="text-sm mt-1 opacity-80">
              {t('summary.count', { count: availableCount })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

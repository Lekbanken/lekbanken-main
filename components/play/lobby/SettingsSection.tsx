'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { SessionSettings } from '@/types/lobby';
import {
  EyeIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  UserGroupIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';

export interface SettingsSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current session settings */
  settings: SessionSettings;
  /** Callback when settings change */
  onChange?: (settings: SessionSettings) => void;
  /** Whether editing is allowed */
  canEdit?: boolean;
}

interface ToggleSetting {
  key: keyof SessionSettings;
  label: string;
  description: string;
  icon: React.ElementType;
  type: 'toggle';
}

interface NumberSetting {
  key: keyof SessionSettings;
  label: string;
  description: string;
  icon: React.ElementType;
  type: 'number';
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

type SettingConfig = ToggleSetting | NumberSetting;

const SETTINGS_CONFIG: SettingConfig[] = [
  {
    key: 'showParticipantNames',
    label: 'Visa deltagarnamn',
    description: 'Deltagare kan se varandras namn',
    icon: EyeIcon,
    type: 'toggle',
  },
  {
    key: 'allowChat',
    label: 'Tillåt chatt',
    description: 'Deltagare kan chatta med varandra',
    icon: ChatBubbleLeftRightIcon,
    type: 'toggle',
  },
  {
    key: 'autoAdvance',
    label: 'Auto-fortsätt',
    description: 'Gå vidare automatiskt när alla är redo',
    icon: PlayIcon,
    type: 'toggle',
  },
  {
    key: 'requireRoles',
    label: 'Kräv roller',
    description: 'Alla deltagare måste ha en roll innan start',
    icon: ShieldCheckIcon,
    type: 'toggle',
  },
  {
    key: 'maxParticipants',
    label: 'Max deltagare',
    description: 'Maximalt antal deltagare i sessionen',
    icon: UserGroupIcon,
    type: 'number',
    min: 2,
    max: 100,
    step: 1,
    suffix: 'st',
  },
  {
    key: 'durationLimit',
    label: 'Tidsgräns',
    description: 'Max tid för sessionen (0 = ingen gräns)',
    icon: ClockIcon,
    type: 'number',
    min: 0,
    max: 480,
    step: 5,
    suffix: 'min',
  },
];

/**
 * SettingsSection - Session settings configuration for lobby
 * 
 * All SessionSettings options as form controls with toggles and number inputs
 */
export const SettingsSection = forwardRef<HTMLDivElement, SettingsSectionProps>(
  (
    {
      settings,
      onChange,
      canEdit = true,
      className,
      ...props
    },
    ref
  ) => {
    const handleToggle = (key: keyof SessionSettings) => {
      if (!onChange || !canEdit) return;
      onChange({
        ...settings,
        [key]: !settings[key],
      });
    };

    const handleNumberChange = (key: keyof SessionSettings, value: number) => {
      if (!onChange || !canEdit) return;
      onChange({
        ...settings,
        [key]: value,
      });
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-6', className)}
        {...props}
      >
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">Inställningar</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Konfigurera sessionen
          </p>
        </div>

        {/* Settings List */}
        <div className="flex flex-col gap-4">
          {SETTINGS_CONFIG.map((config) => {
            const Icon = config.icon;
            const value = settings[config.key];

            return (
              <div
                key={config.key}
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border"
              >
                {/* Icon */}
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                {/* Label and Description */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{config.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {config.description}
                  </p>
                </div>

                {/* Control */}
                {config.type === 'toggle' ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(value)}
                    onClick={() => handleToggle(config.key)}
                    disabled={!canEdit}
                    className={cn(
                      'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      value ? 'bg-primary' : 'bg-muted',
                      !canEdit && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        value ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) => handleNumberChange(config.key, Number(e.target.value))}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      disabled={!canEdit}
                      className={cn(
                        'w-20 text-center rounded-lg border border-border bg-background px-2 py-1.5 text-foreground',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                        !canEdit && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                    {config.suffix && (
                      <span className="text-sm text-muted-foreground">
                        {config.suffix}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center">
          Dessa inställningar kan ändras under sessionen
        </p>
      </div>
    );
  }
);

SettingsSection.displayName = 'SettingsSection';

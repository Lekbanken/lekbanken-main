'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { useTranslations } from 'next-intl';
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
  labelKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  type: 'toggle';
}

interface NumberSetting {
  key: keyof SessionSettings;
  labelKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  type: 'number';
  min: number;
  max: number;
  step: number;
  suffixKey?: string;
}

type SettingConfig = ToggleSetting | NumberSetting;

const SETTINGS_CONFIG: SettingConfig[] = [
  {
    key: 'showParticipantNames',
    labelKey: 'showParticipantNames.label',
    descriptionKey: 'showParticipantNames.description',
    icon: EyeIcon,
    type: 'toggle',
  },
  {
    key: 'allowChat',
    labelKey: 'allowChat.label',
    descriptionKey: 'allowChat.description',
    icon: ChatBubbleLeftRightIcon,
    type: 'toggle',
  },
  {
    key: 'autoAdvance',
    labelKey: 'autoAdvance.label',
    descriptionKey: 'autoAdvance.description',
    icon: PlayIcon,
    type: 'toggle',
  },
  {
    key: 'requireRoles',
    labelKey: 'requireRoles.label',
    descriptionKey: 'requireRoles.description',
    icon: ShieldCheckIcon,
    type: 'toggle',
  },
  {
    key: 'maxParticipants',
    labelKey: 'maxParticipants.label',
    descriptionKey: 'maxParticipants.description',
    icon: UserGroupIcon,
    type: 'number',
    min: 2,
    max: 100,
    step: 1,
    suffixKey: 'maxParticipants.suffix',
  },
  {
    key: 'durationLimit',
    labelKey: 'durationLimit.label',
    descriptionKey: 'durationLimit.description',
    icon: ClockIcon,
    type: 'number',
    min: 0,
    max: 480,
    step: 5,
    suffixKey: 'durationLimit.suffix',
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

    const t = useTranslations('play.settingsSection');

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-6', className)}
        {...props}
      >
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('subtitle')}
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
                  <p className="font-medium text-foreground">{t(config.labelKey as 'title')}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(config.descriptionKey as 'title')}
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
                    {config.suffixKey && (
                      <span className="text-sm text-muted-foreground">
                        {t(config.suffixKey as 'title')}
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
          {t('footerNote')}
        </p>
      </div>
    );
  }
);

SettingsSection.displayName = 'SettingsSection';

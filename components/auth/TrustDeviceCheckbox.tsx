/**
 * Trust Device Checkbox Component
 * For trusting the current device to skip MFA verification
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ComputerDesktopIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface TrustDeviceCheckboxProps {
  /** Whether device is trusted */
  checked: boolean;
  /** Callback when checked state changes */
  onChange: (checked: boolean, deviceName?: string) => void;
  /** Number of days device will be trusted */
  trustDays?: number;
  /** Custom device name */
  deviceName?: string;
  /** Allow editing device name */
  editableName?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)
    ? 'mobile'
    : 'desktop';
}

/**
 * Generate default device name
 */
function getDefaultDeviceName(): string {
  if (typeof window === 'undefined') return 'Okänd enhet';
  
  const ua = navigator.userAgent;
  let browser = 'Webbläsare';
  let os = 'Okänd';
  
  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return `${browser} på ${os}`;
}

export function TrustDeviceCheckbox({
  checked,
  onChange,
  trustDays = 30,
  deviceName: initialDeviceName,
  editableName = false,
  disabled = false,
  className,
}: TrustDeviceCheckboxProps) {
  const t = useTranslations('auth.mfa.challenge');
  const [localDeviceName, setLocalDeviceName] = useState(initialDeviceName || getDefaultDeviceName());
  const [isEditingName, setIsEditingName] = useState(false);
  const deviceType = getDeviceType();
  
  const handleCheckedChange = useCallback((isChecked: boolean) => {
    onChange(isChecked, isChecked ? localDeviceName : undefined);
  }, [onChange, localDeviceName]);

  const handleNameChange = useCallback((name: string) => {
    setLocalDeviceName(name);
    if (checked) {
      onChange(true, name);
    }
  }, [checked, onChange]);

  const DeviceIcon = deviceType === 'mobile' ? DevicePhoneMobileIcon : ComputerDesktopIcon;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        <Checkbox
          id="trust-device"
          checked={checked}
          onChange={(e) => handleCheckedChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="flex-1 min-w-0">
          <label 
            htmlFor="trust-device" 
            className="block text-sm font-medium text-foreground cursor-pointer"
          >
            {t('trustDevice', { days: trustDays })}
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('trustDeviceDescription')}
          </p>
          
          {checked && (
            <div className="mt-2 flex items-center gap-2">
              <DeviceIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {editableName && isEditingName ? (
                <input
                  type="text"
                  value={localDeviceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => editableName && setIsEditingName(true)}
                  className={cn(
                    'text-xs text-muted-foreground truncate',
                    editableName && 'hover:text-foreground cursor-pointer'
                  )}
                  disabled={!editableName}
                >
                  {localDeviceName}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Tenant MFA Policy Client Component
 * Interactive policy configuration and user MFA status overview
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { 
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { TenantMFAPolicy, MFAEnforcementLevel } from '@/types/mfa';

interface TenantMFAPolicyClientProps {
  tenantId: string;
  isSystemAdmin: boolean;
  canManage: boolean;
}

interface TenantMFAStats {
  totalUsers: number;
  mfaEnabledUsers: number;
  mfaRequiredUsers: number;
  usersInGracePeriod: number;
}

const ENFORCEMENT_OPTIONS: { value: MFAEnforcementLevel; label: string; description: string }[] = [
  {
    value: 'optional',
    label: 'Valfritt',
    description: 'Användare kan aktivera MFA om de vill, men det krävs inte.',
  },
  {
    value: 'admins_required',
    label: 'Endast administratörer',
    description: 'Ägare och administratörer måste aktivera MFA. Vanliga användare kan välja.',
  },
  {
    value: 'all_users',
    label: 'Alla användare',
    description: 'Alla användare i organisationen måste aktivera MFA.',
  },
];

const GRACE_PERIOD_OPTIONS = [
  { value: 0, label: 'Ingen (omedelbart)' },
  { value: 3, label: '3 dagar' },
  { value: 7, label: '7 dagar' },
  { value: 14, label: '14 dagar' },
  { value: 30, label: '30 dagar' },
];

const DEVICE_TRUST_OPTIONS = [
  { value: 7, label: '7 dagar' },
  { value: 14, label: '14 dagar' },
  { value: 30, label: '30 dagar' },
  { value: 60, label: '60 dagar' },
  { value: 90, label: '90 dagar' },
];

export default function TenantMFAPolicyClient({
  tenantId,
  isSystemAdmin: _isSystemAdmin,
  canManage,
}: TenantMFAPolicyClientProps) {
  const t = useTranslations('admin.tenant.security.mfa');
  const [policy, setPolicy] = useState<TenantMFAPolicy | null>(null);
  const [stats, setStats] = useState<TenantMFAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [isEnforced, setIsEnforced] = useState(false);
  const [enforcementLevel, setEnforcementLevel] = useState<MFAEnforcementLevel>('admins_required');
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [allowTrustedDevices, setAllowTrustedDevices] = useState(true);
  const [trustedDeviceDays, setTrustedDeviceDays] = useState(30);

  // Fetch policy and stats
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [policyRes, statsRes] = await Promise.all([
        fetch(`/api/admin/tenant/${tenantId}/mfa/policy`, { credentials: 'include' }),
        fetch(`/api/admin/tenant/${tenantId}/mfa/stats`, { credentials: 'include' }),
      ]);
      
      if (policyRes.ok) {
        const policyData = await policyRes.json();
        setPolicy(policyData.policy);
        
        // Update form state from policy
        if (policyData.policy) {
          setIsEnforced(policyData.policy.is_enforced);
          setEnforcementLevel(policyData.policy.enforcement_level);
          setGracePeriodDays(policyData.policy.grace_period_days);
          setAllowTrustedDevices(policyData.policy.allow_trusted_devices);
          setTrustedDeviceDays(policyData.policy.trusted_device_duration_days);
        }
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError('Kunde inte hämta MFA-policy');
      console.error('Failed to fetch MFA policy:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save policy
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/mfa/policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enforced: isEnforced,
          enforcement_level: enforcementLevel,
          grace_period_days: gracePeriodDays,
          allow_trusted_devices: allowTrustedDevices,
          trusted_device_duration_days: trustedDeviceDays,
        }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte spara policy');
      }
      
      const data = await res.json();
      setPolicy(data.policy);
      setSuccess('MFA-policy har sparats');
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsSaving(false);
    }
  }, [tenantId, isEnforced, enforcementLevel, gracePeriodDays, allowTrustedDevices, trustedDeviceDays]);

  // Check if there are unsaved changes
  const hasChanges = policy && (
    isEnforced !== policy.is_enforced ||
    enforcementLevel !== policy.enforcement_level ||
    gracePeriodDays !== policy.grace_period_days ||
    allowTrustedDevices !== policy.allow_trusted_devices ||
    trustedDeviceDays !== policy.trusted_device_duration_days
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success message */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<UserGroupIcon className="h-5 w-5" />}
            label={t('stats.totalUsers')}
            value={stats.totalUsers}
          />
          <StatCard
            icon={<ShieldCheckIcon className="h-5 w-5 text-green-600" />}
            label={t('stats.mfaEnabled')}
            value={stats.mfaEnabledUsers}
            subtext={stats.totalUsers > 0 ? `${Math.round((stats.mfaEnabledUsers / stats.totalUsers) * 100)}%` : undefined}
          />
          <StatCard
            icon={<ShieldExclamationIcon className="h-5 w-5 text-amber-600" />}
            label={t('stats.mfaRequired')}
            value={stats.mfaRequiredUsers}
          />
          <StatCard
            icon={<ClockIcon className="h-5 w-5 text-blue-600" />}
            label={t('stats.inGracePeriod')}
            value={stats.usersInGracePeriod}
          />
        </div>
      )}

      {/* Policy Configuration */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${isEnforced ? 'bg-primary/10' : 'bg-muted'}`}>
              <ShieldCheckIcon className={`h-6 w-6 ${isEnforced ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEnforced ? t('policy.enabled') : t('policy.disabled')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEnforced ? t('policy.enabledDescription') : t('policy.disabledDescription')}
              </p>
            </div>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnforced}
              onChange={(e) => setIsEnforced(e.target.checked)}
              disabled={!canManage}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Enforcement Level */}
        {isEnforced && (
          <div className="space-y-3 pt-4 border-t border-border">
            <label className="block text-sm font-medium text-foreground">
              {t('policy.enforcementLevel')}
            </label>
            <div className="space-y-2">
              {ENFORCEMENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    enforcementLevel === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="enforcement_level"
                    value={option.value}
                    checked={enforcementLevel === option.value}
                    onChange={(e) => setEnforcementLevel(e.target.value as MFAEnforcementLevel)}
                    disabled={!canManage}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-foreground">{t(`enforcement.${option.value === 'admins_required' ? 'adminsRequired' : option.value}`)}</div>
                    <div className="text-sm text-muted-foreground">{t(`enforcement.${option.value === 'admins_required' ? 'adminsRequired' : option.value}Description`)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Grace Period */}
        {isEnforced && (
          <div className="space-y-3 pt-4 border-t border-border">
            <Select
              label={t('policy.gracePeriod')}
              hint={t('policy.gracePeriodHelp')}
              value={String(gracePeriodDays)}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              disabled={!canManage}
              className="w-full md:w-64"
              options={GRACE_PERIOD_OPTIONS.map((option) => ({
                value: String(option.value),
                label: option.label,
              }))}
            />
          </div>
        )}

        {/* Trusted Devices */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t('policy.trustedDevicesEnabled')}
              </label>
              <p className="text-sm text-muted-foreground">
                {t('policy.trustedDevicesDescription')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowTrustedDevices}
                onChange={(e) => setAllowTrustedDevices(e.target.checked)}
                disabled={!canManage}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          {allowTrustedDevices && (
            <div className="pl-4 border-l-2 border-border ml-2">
              <Select
                label={t('policy.trustedDeviceDuration')}
                value={String(trustedDeviceDays)}
                onChange={(e) => setTrustedDeviceDays(Number(e.target.value))}
                disabled={!canManage}
                className="w-full md:w-64"
                options={DEVICE_TRUST_OPTIONS.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {canManage && (
        <div className="flex justify-end gap-3">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={isSaving}
            >
              {t('actions.reset')}
            </Button>
          )}
          <Button
            onClick={handleSave}
            loading={isSaving}
            loadingText={t('actions.saving')}
            disabled={!hasChanges}
          >
            {t('actions.save')}
          </Button>
        </div>
      )}

      {/* Users Link */}
      <div className="pt-6 border-t border-border">
        <a
          href={`/admin/tenant/${tenantId}/security/mfa/users`}
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <UserGroupIcon className="h-5 w-5" />
          {t('users.pageTitle')} →
        </a>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  subtext?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {subtext && <span className="text-sm text-muted-foreground">{subtext}</span>}
      </div>
    </div>
  );
}

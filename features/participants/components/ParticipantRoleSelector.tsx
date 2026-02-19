/**
 * ParticipantRoleSelector Component
 * 
 * Dropdown for selecting participant roles.
 * Used in host dashboard to assign roles to participants.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui/select';
import type { Database } from '@/types/supabase';

type ParticipantRole = Database['public']['Enums']['participant_role'];

interface ParticipantRoleSelectorProps {
  participantId: string;
  currentRole: ParticipantRole;
  sessionId: string;
  disabled?: boolean;
  onRoleChange?: (newRole: ParticipantRole) => void;
}

export function ParticipantRoleSelector({
  participantId,
  currentRole,
  sessionId,
  disabled = false,
  onRoleChange,
}: ParticipantRoleSelectorProps) {
  const t = useTranslations('participantRoleSelector');
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabels: Record<ParticipantRole, string> = {
    observer: t('roles.observer'),
    player: t('roles.player'),
    team_lead: t('roles.teamLead'),
    facilitator: t('roles.facilitator'),
  };

  const roleDescriptions: Record<ParticipantRole, string> = {
    observer: t('descriptions.observer'),
    player: t('descriptions.player'),
    team_lead: t('descriptions.teamLead'),
    facilitator: t('descriptions.facilitator'),
  };
  
  const handleRoleChange = async (newRole: ParticipantRole) => {
    if (newRole === selectedRole || loading || disabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/participants/${participantId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole,
          sessionId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || t('errors.updateFailed'));
      }
      
      setSelectedRole(newRole);
      
      if (onRoleChange) {
        onRoleChange(newRole);
      }
      
    } catch (err) {
      console.error('[RoleSelector] Error:', err);
      setError(err instanceof Error ? err.message : t('errors.updateFailed'));
      // Revert on error
      setSelectedRole(currentRole);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <Select
        value={selectedRole}
        onChange={(e) => handleRoleChange(e.target.value as ParticipantRole)}
        disabled={disabled || loading}
        aria-label={roleDescriptions[selectedRole]}
        options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))}
      />
      
      {loading && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

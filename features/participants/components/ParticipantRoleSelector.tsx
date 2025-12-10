/**
 * ParticipantRoleSelector Component
 * 
 * Dropdown for selecting participant roles.
 * Used in host dashboard to assign roles to participants.
 */

'use client';

import { useState } from 'react';
import type { Database } from '@/types/supabase';

type ParticipantRole = Database['public']['Enums']['participant_role'];

interface ParticipantRoleSelectorProps {
  participantId: string;
  currentRole: ParticipantRole;
  sessionId: string;
  disabled?: boolean;
  onRoleChange?: (newRole: ParticipantRole) => void;
}

const roleLabels: Record<ParticipantRole, string> = {
  observer: 'Observatör',
  player: 'Spelare',
  team_lead: 'Lagledare',
  facilitator: 'Facilitator',
};

const roleDescriptions: Record<ParticipantRole, string> = {
  observer: 'Kan titta men inte delta',
  player: 'Aktiv deltagare',
  team_lead: 'Kan koordinera lagaktiviteter',
  facilitator: 'Kan assistera värd',
};

export function ParticipantRoleSelector({
  participantId,
  currentRole,
  sessionId,
  disabled = false,
  onRoleChange,
}: ParticipantRoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
        throw new Error(data.error || 'Failed to update role');
      }
      
      setSelectedRole(newRole);
      
      if (onRoleChange) {
        onRoleChange(newRole);
      }
      
    } catch (err) {
      console.error('[RoleSelector] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
      // Revert on error
      setSelectedRole(currentRole);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <select
        value={selectedRole}
        onChange={(e) => handleRoleChange(e.target.value as ParticipantRole)}
        disabled={disabled || loading}
        className="block w-full rounded-md border-gray-300 py-1.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        title={roleDescriptions[selectedRole]}
      >
        {Object.entries(roleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      
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

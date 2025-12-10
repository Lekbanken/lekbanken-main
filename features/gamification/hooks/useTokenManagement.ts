/**
 * Token Management Hooks
 * 
 * Hooks for extending and revoking participant tokens
 */

import { useState } from 'react';

interface ExtendTokenOptions {
  participant_token: string;
  extension_hours?: number;
}

interface RevokeTokenOptions {
  participant_token?: string;
  participant_id?: string;
  session_id?: string;
  reason?: string;
}

export function useTokenManagement() {
  const [isExtending, setIsExtending] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const extendToken = async (options: ExtendTokenOptions) => {
    setIsExtending(true);
    try {
      const response = await fetch('/api/participants/tokens/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extend token');
      }

      return data;
    } finally {
      setIsExtending(false);
    }
  };

  const revokeToken = async (options: RevokeTokenOptions) => {
    setIsRevoking(true);
    try {
      const response = await fetch('/api/participants/tokens/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke token');
      }

      return data;
    } finally {
      setIsRevoking(false);
    }
  };

  return {
    extendToken,
    revokeToken,
    isExtending,
    isRevoking,
  };
}

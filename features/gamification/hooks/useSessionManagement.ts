/**
 * Session Management Hooks
 * 
 * Hooks for archiving, restoring, and deleting sessions
 */

import { useState } from 'react';

export function useSessionManagement() {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const archiveSession = async (sessionId: string) => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/archive`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive session');
      }

      return data;
    } finally {
      setIsArchiving(false);
    }
  };

  const restoreSession = async (sessionId: string) => {
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/restore`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore session');
      }

      return data;
    } finally {
      setIsRestoring(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete session');
      }

      return data;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    archiveSession,
    restoreSession,
    deleteSession,
    isArchiving,
    isRestoring,
    isDeleting,
  };
}

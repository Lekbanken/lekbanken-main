/**
 * SessionActions Component
 * 
 * Action buttons for session management (archive, restore, delete)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionManagement } from '@/features/gamification/hooks/useSessionManagement';

interface SessionActionsProps {
  sessionId: string;
  sessionCode: string;
  status: string;
  onActionComplete?: () => void;
}

export function SessionActions({ 
  sessionId, 
  sessionCode, 
  status, 
  onActionComplete 
}: SessionActionsProps) {
  const router = useRouter();
  const { archiveSession, restoreSession, deleteSession, isArchiving, isRestoring, isDeleting } = useSessionManagement();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    try {
      setError(null);
      await archiveSession(sessionId);
      onActionComplete?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive session');
    }
  };

  const handleRestore = async () => {
    try {
      setError(null);
      await restoreSession(sessionId);
      onActionComplete?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore session');
    }
  };

  const handleDelete = async () => {
    try {
      setError(null);
      await deleteSession(sessionId);
      setShowDeleteConfirm(false);
      onActionComplete?.();
      router.push('/participants/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const canArchive = status === 'ended' || status === 'cancelled';
  const canRestore = status === 'archived';
  const canDelete = status === 'archived';

  if (!canArchive && !canRestore && !canDelete) {
    return null;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {canArchive && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isArchiving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Arkiverar...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Arkivera Session
              </>
            )}
          </button>
        )}

        {canRestore && (
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRestoring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Återställer...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Återställ Session
              </>
            )}
          </button>
        )}

        {canDelete && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Ta Bort Permanent
          </button>
        )}

        {showDeleteConfirm && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 flex-1">
              Är du säker? Session <strong>{sessionCode}</strong> kommer att raderas permanent. Detta kan inte ångras!
            </p>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {isDeleting ? 'Raderar...' : 'Ja, Radera'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Avbryt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

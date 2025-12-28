'use client';

/**
 * PropConfirmationManager Component
 * 
 * Host-facing panel for managing prop confirmation requests.
 * Allows host to approve, reject, or request photo evidence.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CameraIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid';

// =============================================================================
// Types
// =============================================================================

export interface PropRequest {
  id: string;
  artifactId: string;
  artifactTitle: string;
  participantId: string;
  participantName: string;
  teamId?: string;
  teamName?: string;
  propDescription: string;
  propImageUrl?: string;
  status: 'pending' | 'waiting' | 'confirmed' | 'rejected';
  requestedAt: string;
  photoUrl?: string;
  hostNotes?: string;
}

export interface PropConfirmationManagerProps {
  sessionId: string;
  /** Refresh interval in ms (default: 3000) */
  refreshInterval?: number;
  /** Callback when a request is handled */
  onRequestHandled?: (requestId: string, action: 'confirm' | 'reject') => void;
}

// =============================================================================
// Component
// =============================================================================

export function PropConfirmationManager({
  sessionId,
  refreshInterval = 3000,
  onRequestHandled,
}: PropConfirmationManagerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PropRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Load pending requests
  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/puzzles/props`, {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte ladda prop-förfrågningar');
      }
      
      const data = await res.json();
      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fel vid laddning');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial load and polling
  useEffect(() => {
    void loadRequests();
    
    const interval = setInterval(() => {
      void loadRequests();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [loadRequests, refreshInterval]);

  // Handle confirm/reject action
  const handleAction = useCallback(async (requestId: string, action: 'confirm' | 'reject') => {
    setActionLoading(prev => new Set([...prev, requestId]));
    
    try {
      const hostNotes = notes.get(requestId);
      
      const res = await fetch(`/api/play/sessions/${sessionId}/puzzles/props`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId, 
          action,
          hostNotes,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte uppdatera förfrågan');
      }
      
      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, status: action === 'confirm' ? 'confirmed' : 'rejected', hostNotes }
          : r
      ));
      
      // Clear notes
      setNotes(prev => {
        const next = new Map(prev);
        next.delete(requestId);
        return next;
      });
      
      onRequestHandled?.(requestId, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fel vid uppdatering');
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, [sessionId, notes, onRequestHandled]);

  // Filter pending requests
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'waiting');
  const handledRequests = requests.filter(r => r.status === 'confirmed' || r.status === 'rejected');

  // Time since request
  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just nu';
    if (minutes < 60) return `${minutes} min sedan`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m sedan`;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>Laddar prop-förfrågningar...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Prop-bekräftelser</h3>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingRequests.length} väntande
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={loadRequests}>
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Error message */}
      {error && (
        <Card className="p-4 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* Pending requests */}
      {pendingRequests.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Inga väntande prop-förfrågningar
          </p>
        </Card>
      ) : (
        pendingRequests.map((request) => (
          <Card key={request.id} className="p-4 border-amber-500/50 bg-amber-500/5">
            {/* Request header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{request.participantName}</span>
                  {request.teamName && (
                    <Badge variant="outline" className="text-xs">
                      {request.teamName}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{request.artifactTitle}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="h-3 w-3" />
                {getTimeAgo(request.requestedAt)}
              </div>
            </div>

            {/* Prop description */}
            <div className="p-3 rounded bg-muted/50 mb-3">
              <p className="text-sm">{request.propDescription}</p>
            </div>

            {/* Photo evidence (if provided) */}
            {request.photoUrl && (
              <div className="mb-3">
                <button
                  onClick={() => setExpandedPhoto(
                    expandedPhoto === request.id ? null : request.id
                  )}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CameraIcon className="h-3 w-3" />
                  {expandedPhoto === request.id ? 'Dölj foto' : 'Visa foto'}
                </button>
                {expandedPhoto === request.id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={request.photoUrl}
                    alt="Prop-bevis"
                    className="mt-2 rounded max-h-48 object-contain"
                  />
                )}
              </div>
            )}

            {/* Host notes input */}
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <ChatBubbleLeftIcon className="h-3 w-3" />
                <span>Anteckning (valfritt)</span>
              </div>
              <Input
                placeholder="T.ex. 'Bra jobbat!' eller 'Ej korrekt föremål'"
                value={notes.get(request.id) || ''}
                onChange={(e) => setNotes(prev => new Map(prev).set(request.id, e.target.value))}
                className="text-sm"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleAction(request.id, 'confirm')}
                disabled={actionLoading.has(request.id)}
              >
                {actionLoading.has(request.id) ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                )}
                Godkänn
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleAction(request.id, 'reject')}
                disabled={actionLoading.has(request.id)}
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Avslå
              </Button>
            </div>
          </Card>
        ))
      )}

      {/* Handled requests (collapsible history) */}
      {handledRequests.length > 0 && (
        <Card className="p-4">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Hanterade förfrågningar ({handledRequests.length})
            </summary>
            <div className="mt-3 space-y-2">
              {handledRequests.map((request) => (
                <div 
                  key={request.id}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    request.status === 'confirmed' 
                      ? 'bg-green-500/10' 
                      : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {request.status === 'confirmed' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-600" />
                    )}
                    <span>{request.participantName}</span>
                    <span className="text-muted-foreground">- {request.artifactTitle}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {request.status === 'confirmed' ? 'Godkänd' : 'Avslagen'}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}

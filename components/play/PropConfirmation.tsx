'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
  ClockIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import type {
  PropConfirmationConfig,
  PropConfirmationState,
  PropConfirmationStatus,
} from '@/types/puzzle-modules';

// ============================================================================
// PropRequest – Participant UI to request prop confirmation
// ============================================================================

export interface PropRequestProps {
  config: PropConfirmationConfig;
  state: PropConfirmationState;
  onRequest: () => void;
  onPhotoCapture?: (photoUrl: string) => void;
  className?: string;
}

export function PropRequest({
  config,
  state,
  onRequest,
  onPhotoCapture,
  className = '',
}: PropRequestProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapturePhoto = async () => {
    setIsCapturing(true);
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Get data URL
      const photoUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      onPhotoCapture?.(photoUrl);
    } catch (error) {
      console.error('Camera access failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Prop info */}
      <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
        {config.propImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.propImageUrl}
            alt={config.propDescription}
            className="w-full h-48 object-contain rounded-lg mb-4 bg-white dark:bg-zinc-900"
          />
        )}
        <h3 className="font-semibold text-lg mb-2">{config.propDescription}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {config.instructions}
        </p>
      </div>

      {/* Status display */}
      <PropStatusBadge status={state.status} />

      {/* Actions based on status */}
      {state.status === 'pending' && (
        <div className="flex flex-col gap-3">
          {config.requirePhoto && (
            <Button
              onClick={handleCapturePhoto}
              disabled={isCapturing}
              variant="outline"
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              {isCapturing ? 'Tar bild...' : 'Ta foto på föremålet'}
            </Button>
          )}
          
          {state.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.photoUrl}
              alt="Captured prop"
              className="w-full h-32 object-cover rounded-lg"
            />
          )}

          <Button onClick={onRequest}>
            <HandRaisedIcon className="h-5 w-5 mr-2" />
            Begär bekräftelse från spelledare
          </Button>
        </div>
      )}

      {state.status === 'waiting' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
          <ClockIcon className="h-6 w-6 animate-pulse" />
          <span>Väntar på spelledarens bekräftelse...</span>
        </div>
      )}

      {state.status === 'confirmed' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-6 w-6" />
          <div>
            <p className="font-medium">Föremål bekräftat!</p>
            {state.confirmedBy && (
              <p className="text-sm opacity-80">Av: {state.confirmedBy}</p>
            )}
          </div>
        </div>
      )}

      {state.status === 'rejected' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
            <XCircleIcon className="h-6 w-6" />
            <div>
              <p className="font-medium">Inte godkänt</p>
              {state.notes && (
                <p className="text-sm opacity-80">{state.notes}</p>
              )}
            </div>
          </div>
          <Button onClick={onRequest} variant="outline">
            Försök igen
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PropConfirmControl – Host/Director UI to confirm/reject props
// ============================================================================

export interface PropConfirmControlProps {
  config: PropConfirmationConfig;
  state: PropConfirmationState;
  participantName?: string;
  onConfirm: (notes?: string) => void;
  onReject: (notes?: string) => void;
  className?: string;
}

export function PropConfirmControl({
  config,
  state,
  participantName,
  onConfirm,
  onReject,
  className = '',
}: PropConfirmControlProps) {
  const [notes, setNotes] = useState('');

  if (state.status !== 'waiting') {
    return (
      <div className={`p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`}>
        <p className="text-sm text-zinc-500">
          Inga väntande bekräftelser för detta föremål
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{config.propDescription}</h4>
          {participantName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Begäran från: {participantName}
            </p>
          )}
        </div>
        <ClockIcon className="h-5 w-5 text-amber-500 animate-pulse" />
      </div>

      {/* Photo evidence */}
      {state.photoUrl && (
        <div>
          <p className="text-sm font-medium mb-2">Foto-bevis:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.photoUrl}
            alt="Prop evidence"
            className="w-full h-48 object-contain rounded-lg bg-white dark:bg-zinc-900"
          />
        </div>
      )}

      {/* Reference image */}
      {config.propImageUrl && (
        <div>
          <p className="text-sm font-medium mb-2">Förväntat föremål:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.propImageUrl}
            alt="Expected prop"
            className="w-full h-32 object-contain rounded-lg bg-white dark:bg-zinc-900"
          />
        </div>
      )}

      {/* Notes input */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Anteckning (valfritt):
        </label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Lägg till kommentar..."
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => onConfirm(notes || undefined)}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Godkänn
        </Button>
        <Button
          onClick={() => onReject(notes || undefined)}
          variant="destructive"
          className="flex-1"
        >
          <XCircleIcon className="h-5 w-5 mr-2" />
          Avvisa
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// PropStatusBadge – Status indicator
// ============================================================================

interface PropStatusBadgeProps {
  status: PropConfirmationStatus;
}

function PropStatusBadge({ status }: PropStatusBadgeProps) {
  const variants: Record<PropConfirmationStatus, { bg: string; text: string; label: string }> = {
    pending: {
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-600 dark:text-zinc-400',
      label: 'Väntar på dig',
    },
    waiting: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'Väntar på bekräftelse',
    },
    confirmed: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      label: 'Bekräftat',
    },
    rejected: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      label: 'Avvisat',
    },
    timeout: {
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-500',
      label: 'Tidsgräns passerad',
    },
  };

  const variant = variants[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${variant.bg} ${variant.text}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {variant.label}
    </div>
  );
}

// ============================================================================
// usePropConfirmation – Hook for managing prop confirmation state
// ============================================================================

export function usePropConfirmation(_config: PropConfirmationConfig) {
  const [state, setState] = useState<PropConfirmationState>({
    status: 'pending',
  });

  const request = useCallback((photoUrl?: string) => {
    setState({
      status: 'waiting',
      requestedAt: new Date().toISOString(),
      photoUrl,
    });
  }, []);

  const confirm = useCallback((confirmedBy: string, notes?: string) => {
    setState(prev => ({
      ...prev,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy,
      notes,
    }));
  }, []);

  const reject = useCallback((notes?: string) => {
    setState(prev => ({
      ...prev,
      status: 'rejected',
      notes,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'pending',
    });
  }, []);

  return { state, request, confirm, reject, reset };
}

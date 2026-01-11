'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookmarkIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  ReplayMarkerConfig,
  ReplayMarkerState,
  ReplayMarker,
  ReplayMarkerType,
} from '@/types/puzzle-modules';

// ============================================================================
// ReplayTimeline – Display replay markers on a timeline
// ============================================================================

export interface ReplayTimelineProps {
  config: ReplayMarkerConfig;
  state: ReplayMarkerState;
  sessionDurationSeconds: number;
  currentTimeSeconds?: number;
  onMarkerClick?: (marker: ReplayMarker) => void;
  onAddMarker?: (marker: Omit<ReplayMarker, 'id' | 'createdAt'>) => void;
  onDeleteMarker?: (markerId: string) => void;
  className?: string;
}

export function ReplayTimeline({
  config,
  state,
  sessionDurationSeconds,
  currentTimeSeconds = 0,
  onMarkerClick,
  onAddMarker,
  onDeleteMarker,
  className = '',
}: ReplayTimelineProps) {
  const t = useTranslations('play.replayMarker');
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [newMarkerType, setNewMarkerType] = useState<ReplayMarkerType>('highlight');
  const [newMarkerLabel, setNewMarkerLabel] = useState('');

  // Handle add marker
  const handleAddMarker = () => {
    if (!newMarkerLabel.trim()) return;
    
    onAddMarker?.({
      type: newMarkerType,
      timestampSeconds: currentTimeSeconds,
      label: newMarkerLabel.trim(),
      createdBy: 'participant',
    });

    setNewMarkerLabel('');
    setIsAddingMarker(false);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Timeline */}
      <div className="relative h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
        {/* Progress indicator */}
        <div
          className="absolute top-0 left-0 h-full bg-blue-500/20"
          style={{
            width: `${(currentTimeSeconds / sessionDurationSeconds) * 100}%`,
          }}
        />

        {/* Current position */}
        <div
          className="absolute top-0 w-0.5 h-full bg-blue-500"
          style={{
            left: `${(currentTimeSeconds / sessionDurationSeconds) * 100}%`,
          }}
        />

        {/* Markers */}
        {state.markers.map(marker => (
          <button
            key={marker.id}
            onClick={() => onMarkerClick?.(marker)}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
            style={{
              left: `${(marker.timestampSeconds / sessionDurationSeconds) * 100}%`,
            }}
            title={`${marker.label} (${formatTime(marker.timestampSeconds)})`}
          >
            <MarkerIcon type={marker.type} className="h-6 w-6" />
          </button>
        ))}

        {/* Time labels */}
        <div className="absolute bottom-1 left-2 text-xs text-zinc-500">
          {formatTime(0)}
        </div>
        <div className="absolute bottom-1 right-2 text-xs text-zinc-500">
          {formatTime(sessionDurationSeconds)}
        </div>
      </div>

      {/* Marker list */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <BookmarkIcon className="h-4 w-4" />
          {t('markers')} ({state.markers.length})
        </h4>
        
        {state.markers.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('noMarkers')}</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {state.markers
              .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
              .map(marker => (
                <div
                  key={marker.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer group"
                  onClick={() => onMarkerClick?.(marker)}
                >
                  <MarkerIcon type={marker.type} className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{marker.label}</span>
                  <span className="text-xs text-zinc-500">
                    {formatTime(marker.timestampSeconds)}
                  </span>
                  {onDeleteMarker && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <TrashIcon className="h-3 w-3 text-red-500" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add marker */}
      {config.allowParticipantMarkers && (
        <div>
          {isAddingMarker ? (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="flex gap-2">
                {config.availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setNewMarkerType(type)}
                    className={`p-2 rounded-lg ${
                      newMarkerType === type
                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  >
                    <MarkerIcon type={type} className="h-5 w-5" />
                  </button>
                ))}
              </div>
              <Input
                value={newMarkerLabel}
                onChange={e => setNewMarkerLabel(e.target.value)}
                placeholder={t('markerNamePlaceholder')}
                onKeyDown={e => e.key === 'Enter' && handleAddMarker()}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddMarker} size="sm" disabled={!newMarkerLabel.trim()}>
                  {t('add')}
                </Button>
                <Button
                  onClick={() => setIsAddingMarker(false)}
                  variant="outline"
                  size="sm"
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddingMarker(true)}
              variant="outline"
              size="sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('addMarkerAt', { time: formatTime(currentTimeSeconds) })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MarkerIcon – Icon for marker type
// ============================================================================

interface MarkerIconProps {
  type: ReplayMarkerType;
  className?: string;
}

function MarkerIcon({ type, className = '' }: MarkerIconProps) {
  switch (type) {
    case 'highlight':
      return <StarIcon className={`text-amber-500 ${className}`} />;
    case 'bookmark':
      return <BookmarkIcon className={`text-blue-500 ${className}`} />;
    case 'note':
      return <ChatBubbleLeftIcon className={`text-green-500 ${className}`} />;
    case 'error':
      return <ExclamationCircleIcon className={`text-red-500 ${className}`} />;
    default:
      return <BookmarkIcon className={`text-zinc-500 ${className}`} />;
  }
}

// ============================================================================
// useReplayMarkers – Hook for managing replay markers
// ============================================================================

export function useReplayMarkers(_config: ReplayMarkerConfig) {
  const [state, setState] = useState<ReplayMarkerState>({
    markers: [],
  });

  const addMarker = useCallback(
    (marker: Omit<ReplayMarker, 'id' | 'createdAt'>) => {
      const newMarker: ReplayMarker = {
        ...marker,
        id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      setState(prev => ({
        markers: [...prev.markers, newMarker],
      }));

      return newMarker;
    },
    []
  );

  const deleteMarker = useCallback((markerId: string) => {
    setState(prev => ({
      markers: prev.markers.filter(m => m.id !== markerId),
    }));
  }, []);

  const clearMarkers = useCallback(() => {
    setState({ markers: [] });
  }, []);

  return { state, addMarker, deleteMarker, clearMarkers };
}

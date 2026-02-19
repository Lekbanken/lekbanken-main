'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button, Select } from '@/components/ui';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ForwardIcon,
  BackwardIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import type { TimelineEvent } from '@/types/analytics';

type SessionReplayProps = {
  sessionId: string;
  events?: TimelineEvent[];
  autoLoad?: boolean;
};

type PlaybackState = 'stopped' | 'playing' | 'paused';

function formatTimestamp(dateStr: string, startTime: Date | null): string {
  const date = new Date(dateStr);
  if (!startTime) return date.toLocaleTimeString('sv-SE');
  
  const diff = Math.floor((date.getTime() - startTime.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    session_started: '🎬',
    session_ended: '🏁',
    participant_joined: '👤',
    participant_left: '👋',
    trigger_fired: '⚡',
    step_advanced: '📍',
    phase_changed: '🔄',
    signal_sent: '📡',
    time_bank_changed: '⏰',
    decision_created: '🗳️',
    vote_cast: '✅',
    artifact_revealed: '🔓',
  };
  return <span className="text-xl">{icons[type] || '📋'}</span>;
}

export function SessionReplay({ sessionId, events: initialEvents, autoLoad = true }: SessionReplayProps) {
  const t = useTranslations('admin.sessionReplay');
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents || []);
  const [loading, setLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visibleEvents, setVisibleEvents] = useState<TimelineEvent[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get session start time
  const startTime = events.length > 0 ? new Date(events[0].timestamp) : null;

  // Load events if not provided
  const loadEvents = useCallback(async () => {
    if (initialEvents) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load session data');
      const data = await res.json();
      setEvents(data.timeline || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, initialEvents]);

  useEffect(() => {
    if (autoLoad && !initialEvents) {
      loadEvents();
    }
  }, [autoLoad, initialEvents, loadEvents]);

  // Playback logic
  useEffect(() => {
    if (playbackState !== 'playing' || currentIndex >= events.length) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const currentEvent = events[currentIndex];
    const nextEvent = events[currentIndex + 1];

    // Add current event to visible
    setVisibleEvents((prev) => {
      if (prev.find(e => e.id === currentEvent.id)) return prev;
      return [...prev, currentEvent];
    });

    // Scroll to bottom
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }

    // Calculate delay to next event
    let delay = 1000; // Default 1 second
    if (nextEvent) {
      const currentTime = new Date(currentEvent.timestamp).getTime();
      const nextTime = new Date(nextEvent.timestamp).getTime();
      delay = Math.max(100, (nextTime - currentTime) / playbackSpeed);
      // Cap at 5 seconds max
      delay = Math.min(delay, 5000 / playbackSpeed);
    }

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [playbackState, currentIndex, events, playbackSpeed]);

  // Auto-stop at end
  useEffect(() => {
    if (currentIndex >= events.length && playbackState === 'playing') {
      setPlaybackState('paused');
    }
  }, [currentIndex, events.length, playbackState]);

  const handlePlay = () => {
    if (currentIndex >= events.length) {
      // Restart
      setCurrentIndex(0);
      setVisibleEvents([]);
    }
    setPlaybackState('playing');
  };

  const handlePause = () => {
    setPlaybackState('paused');
  };

  const handleStop = () => {
    setPlaybackState('stopped');
    setCurrentIndex(0);
    setVisibleEvents([]);
  };

  const handleSkipForward = () => {
    const newIndex = Math.min(currentIndex + 5, events.length - 1);
    setCurrentIndex(newIndex);
    setVisibleEvents(events.slice(0, newIndex + 1));
  };

  const handleSkipBackward = () => {
    const newIndex = Math.max(currentIndex - 5, 0);
    setCurrentIndex(newIndex);
    setVisibleEvents(events.slice(0, newIndex + 1));
  };

  const handleJumpTo = (index: number) => {
    setCurrentIndex(index);
    setVisibleEvents(events.slice(0, index + 1));
    if (playbackState === 'stopped') {
      setPlaybackState('paused');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={loadEvents} className="mt-4">
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p className="text-sm">{t('noEvents')}</p>
      </Card>
    );
  }

  const progress = events.length > 0 ? (currentIndex / events.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('eventCount', { count: events.length })} · {formatTimestamp(events[events.length - 1].timestamp, startTime)} {t('total')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(playbackSpeed)}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            options={[
              { value: '0.5', label: '0.5x' },
              { value: '1', label: '1x' },
              { value: '2', label: '2x' },
              { value: '5', label: '5x' },
              { value: '10', label: '10x' },
            ]}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const index = Math.floor(percentage * events.length);
            handleJumpTo(index);
          }}
        >
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentIndex} / {events.length}</span>
          <span>
            {currentIndex < events.length 
              ? formatTimestamp(events[currentIndex].timestamp, startTime)
              : formatTimestamp(events[events.length - 1].timestamp, startTime)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipBackward}
          disabled={currentIndex === 0}
        >
          <BackwardIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          disabled={playbackState === 'stopped'}
        >
          <StopIcon className="h-4 w-4" />
        </Button>

        {playbackState === 'playing' ? (
          <Button onClick={handlePause} className="px-6">
            <PauseIcon className="h-5 w-5 mr-1" />
            {t('controls.pause')}
          </Button>
        ) : (
          <Button onClick={handlePlay} className="px-6">
            <PlayIcon className="h-5 w-5 mr-1" />
            {currentIndex >= events.length ? t('controls.restart') : t('controls.play')}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipForward}
          disabled={currentIndex >= events.length - 1}
        >
          <ForwardIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Event list */}
      <Card className="p-0 overflow-hidden">
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto p-4 space-y-2"
        >
          {visibleEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('pressPlayToStart')}
            </p>
          ) : (
            visibleEvents.map((event, idx) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-2 rounded-lg transition-all duration-300 ${
                  idx === visibleEvents.length - 1
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/20'
                }`}
              >
                <EventIcon type={event.event_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTimestamp(event.timestamp, startTime)}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {event.actor_type}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Full event list (collapsed) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          {t('allEvents', { count: events.length })}
        </summary>
        <Card className="mt-2 p-0 overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
            {events.map((event, idx) => (
              <button
                key={event.id}
                onClick={() => handleJumpTo(idx)}
                className={`w-full text-left px-4 py-2 hover:bg-muted/50 flex items-center gap-3 ${
                  idx <= currentIndex ? 'opacity-100' : 'opacity-50'
                } ${idx === currentIndex ? 'bg-primary/10' : ''}`}
              >
                <span className="text-xs font-mono text-muted-foreground w-8">
                  {idx + 1}
                </span>
                <EventIcon type={event.event_type} />
                <span className="text-sm flex-1 truncate">{event.description}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTimestamp(event.timestamp, startTime)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </details>
    </div>
  );
}

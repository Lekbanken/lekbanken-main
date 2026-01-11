/**
 * useSessionTimeline Hook
 * 
 * Provides timeline data for session events visualization.
 * Groups events by time, step, and type for easy navigation.
 * 
 * Backlog B.3: Session timeline visualization
 */

'use client';

import { useMemo, useCallback, useState } from 'react';
import type { SessionEvent, SessionEventType } from '@/types/session-event';

// =============================================================================
// Types
// =============================================================================

export interface TimelineMarker {
  /** Unique identifier */
  id: string;
  /** Event type */
  type: SessionEventType;
  /** Timestamp */
  timestamp: Date;
  /** Step index when event occurred */
  stepIndex: number;
  /** Phase within step */
  phase: 'intro' | 'main' | 'outro' | 'none';
  /** Human-readable label */
  label: string;
  /** Optional description */
  description?: string;
  /** Severity/importance */
  severity: 'info' | 'success' | 'warning' | 'error';
  /** Duration if applicable (in ms) */
  duration?: number;
  /** Related artifact ID */
  artifactId?: string;
  /** Related trigger ID */
  triggerId?: string;
  /** Raw event data */
  event: SessionEvent;
}

export interface TimelineSegment {
  /** Segment identifier */
  id: string;
  /** Step index */
  stepIndex: number;
  /** Step name */
  stepName: string;
  /** Start time */
  startTime: Date;
  /** End time (null if current) */
  endTime: Date | null;
  /** Duration in milliseconds */
  duration: number;
  /** Markers within this segment */
  markers: TimelineMarker[];
  /** Is this the current step? */
  isCurrent: boolean;
}

export interface TimelineStats {
  /** Total session duration in ms */
  totalDuration: number;
  /** Time per step */
  stepDurations: Map<number, number>;
  /** Event counts by type */
  eventCounts: Map<SessionEventType, number>;
  /** Average step duration */
  avgStepDuration: number;
  /** Most active step */
  mostActiveStep: number;
  /** Error count */
  errorCount: number;
}

export interface UseSessionTimelineOptions {
  /** Session events */
  events: SessionEvent[];
  /** Step definitions */
  steps: Array<{ id: string; name: string; order_index: number }>;
  /** Current step index */
  currentStepIndex: number;
  /** Session start time */
  sessionStartTime?: Date;
  /** Filter by event types */
  filterTypes?: SessionEventType[];
  /** Filter by step */
  filterStep?: number;
  /** Time window in ms (show last N ms) */
  timeWindow?: number;
}

export interface UseSessionTimelineReturn {
  /** All timeline markers */
  markers: TimelineMarker[];
  /** Timeline segments (by step) */
  segments: TimelineSegment[];
  /** Timeline statistics */
  stats: TimelineStats;
  /** Filtered markers */
  filteredMarkers: TimelineMarker[];
  /** Current playhead position (0-1) */
  playheadPosition: number;
  /** Zoom level (1 = normal) */
  zoom: number;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Get marker at position */
  getMarkerAtPosition: (position: number) => TimelineMarker | null;
  /** Get segment at position */
  getSegmentAtPosition: (position: number) => TimelineSegment | null;
  /** Jump to marker */
  jumpToMarker: (markerId: string) => TimelineMarker | null;
  /** Get relative position for timestamp */
  getPositionForTime: (time: Date) => number;
}

// =============================================================================
// Helpers
// =============================================================================

function getEventSeverity(type: SessionEventType): TimelineMarker['severity'] {
  switch (type) {
    case 'trigger_error':
    case 'artifact_failed':
      return 'error';
    case 'artifact_solved':
    case 'step_completed':
    case 'phase_completed':
    case 'session_ended':
      return 'success';
    case 'trigger_fired':
    case 'signal_sent':
    case 'timebank_expired':
      return 'warning';
    default:
      return 'info';
  }
}

/** 
 * @deprecated Use event.eventType as translation key instead
 * Translation keys are in play.sessionTimeline.eventTypes.[eventType]
 */
function getEventLabel(event: SessionEvent): string {
  // Return English labels as fallback - components should use eventType as translation key
  const labels: Partial<Record<SessionEventType, string>> = {
    session_started: 'Session started',
    session_paused: 'Session paused',
    session_resumed: 'Session resumed',
    session_ended: 'Session ended',
    step_started: 'Step started',
    step_completed: 'Step completed',
    phase_started: 'Phase started',
    phase_completed: 'Phase completed',
    artifact_revealed: 'Artifact revealed',
    artifact_hidden: 'Artifact hidden',
    artifact_state_changed: 'Artifact updated',
    artifact_solved: 'Puzzle solved',
    artifact_failed: 'Wrong answer',
    trigger_armed: 'Trigger armed',
    trigger_disabled: 'Trigger disabled',
    trigger_fired: 'Trigger fired',
    trigger_error: 'Trigger error',
    signal_sent: 'Signal sent',
    timebank_started: 'TimeBank started',
    timebank_paused: 'TimeBank paused',
    timebank_expired: 'TimeBank expired',
    participant_joined: 'Participant joined',
    participant_left: 'Participant left',
    participant_role_assigned: 'Role assigned',
    host_action: 'Host action',
  };
  return labels[event.eventType] ?? (event.payload as { label?: string })?.label ?? event.eventType;
}

// =============================================================================
// Hook
// =============================================================================

export function useSessionTimeline({
  events,
  steps,
  currentStepIndex,
  sessionStartTime,
  filterTypes,
  filterStep,
  timeWindow,
}: UseSessionTimelineOptions): UseSessionTimelineReturn {
  const [zoom, setZoom] = useState(1);

  // Convert events to markers
  const markers = useMemo<TimelineMarker[]>(() => {
    return events.map((event) => {
      const payload = event.payload as Record<string, unknown>;
      return {
        id: event.id,
        type: event.eventType,
        timestamp: event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt),
        stepIndex: (payload.stepIndex as number) ?? 0,
        phase: (payload.phase as TimelineMarker['phase']) ?? 'none',
        label: getEventLabel(event),
        description: payload.description as string | undefined,
        severity: getEventSeverity(event.eventType),
        duration: payload.duration as number | undefined,
        artifactId: event.targetType === 'artifact' ? event.targetId : undefined,
        triggerId: event.targetType === 'trigger' ? event.targetId : undefined,
        event,
      };
    });
  }, [events]);

  // Calculate timeline segments (by step)
  const segments = useMemo<TimelineSegment[]>(() => {
    const segmentMap = new Map<number, TimelineSegment>();
    
    // Initialize segments for all steps
    steps.forEach((step) => {
      segmentMap.set(step.order_index, {
        id: step.id,
        stepIndex: step.order_index,
        stepName: step.name,
        startTime: new Date(),
        endTime: null,
        duration: 0,
        markers: [],
        isCurrent: step.order_index === currentStepIndex,
      });
    });

    // Find step change events to calculate times
    const stepChanges = markers
      .filter((m) => m.type === 'step_started')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Session start
    const _startTime = sessionStartTime ?? stepChanges[0]?.timestamp ?? new Date();

    // Update segment times
    stepChanges.forEach((change, index) => {
      const stepIndex = (change.event.payload as { stepIndex?: number })?.stepIndex ?? change.stepIndex;
      const segment = segmentMap.get(stepIndex);
      
      if (segment) {
        segment.startTime = change.timestamp;
        
        // End time is next step change or now
        if (index < stepChanges.length - 1) {
          segment.endTime = stepChanges[index + 1].timestamp;
        } else {
          segment.endTime = null; // Current step
        }
        
        segment.duration = segment.endTime
          ? segment.endTime.getTime() - segment.startTime.getTime()
          : Date.now() - segment.startTime.getTime();
      }
    });

    // Assign markers to segments
    markers.forEach((marker) => {
      const segment = segmentMap.get(marker.stepIndex);
      if (segment) {
        segment.markers.push(marker);
      }
    });

    return Array.from(segmentMap.values()).sort((a, b) => a.stepIndex - b.stepIndex);
  }, [markers, steps, currentStepIndex, sessionStartTime]);

  // Calculate statistics
  const stats = useMemo<TimelineStats>(() => {
    const stepDurations = new Map<number, number>();
    const eventCounts = new Map<SessionEventType, number>();
    let totalDuration = 0;
    let errorCount = 0;
    let maxEvents = 0;
    let mostActiveStep = 0;

    segments.forEach((segment) => {
      stepDurations.set(segment.stepIndex, segment.duration);
      totalDuration += segment.duration;
      
      if (segment.markers.length > maxEvents) {
        maxEvents = segment.markers.length;
        mostActiveStep = segment.stepIndex;
      }
    });

    markers.forEach((marker) => {
      const count = eventCounts.get(marker.type) ?? 0;
      eventCounts.set(marker.type, count + 1);
      
      if (marker.severity === 'error') {
        errorCount++;
      }
    });

    const avgStepDuration = segments.length > 0 ? totalDuration / segments.length : 0;

    return {
      totalDuration,
      stepDurations,
      eventCounts,
      avgStepDuration,
      mostActiveStep,
      errorCount,
    };
  }, [markers, segments]);

  // Apply filters
  const filteredMarkers = useMemo(() => {
    let result = markers;
    
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((m) => filterTypes.includes(m.type));
    }
    
    if (filterStep !== undefined) {
      result = result.filter((m) => m.stepIndex === filterStep);
    }
    
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      result = result.filter((m) => m.timestamp.getTime() >= cutoff);
    }
    
    return result;
  }, [markers, filterTypes, filterStep, timeWindow]);

  // Calculate playhead position
  const playheadPosition = useMemo(() => {
    if (stats.totalDuration === 0) return 0;
    
    const currentSegment = segments.find((s) => s.isCurrent);
    if (!currentSegment) return 1;

    const elapsed = segments
      .filter((s) => s.stepIndex < currentStepIndex)
      .reduce((sum, s) => sum + s.duration, 0);

    const currentElapsed = Date.now() - currentSegment.startTime.getTime();
    
    return Math.min(1, (elapsed + currentElapsed) / stats.totalDuration);
  }, [segments, stats.totalDuration, currentStepIndex]);

  // Get marker at timeline position (0-1)
  const getMarkerAtPosition = useCallback(
    (position: number): TimelineMarker | null => {
      const targetTime = stats.totalDuration * position;
      let elapsed = 0;

      for (const segment of segments) {
        if (elapsed + segment.duration >= targetTime) {
          // Find closest marker in this segment
          const segmentOffset = targetTime - elapsed;
          const targetTimestamp = segment.startTime.getTime() + segmentOffset;

          let closest: TimelineMarker | null = null;
          let closestDiff = Infinity;

          for (const marker of segment.markers) {
            const diff = Math.abs(marker.timestamp.getTime() - targetTimestamp);
            if (diff < closestDiff) {
              closestDiff = diff;
              closest = marker;
            }
          }

          return closest;
        }
        elapsed += segment.duration;
      }

      return null;
    },
    [segments, stats.totalDuration]
  );

  // Get segment at position
  const getSegmentAtPosition = useCallback(
    (position: number): TimelineSegment | null => {
      const targetTime = stats.totalDuration * position;
      let elapsed = 0;

      for (const segment of segments) {
        if (elapsed + segment.duration >= targetTime) {
          return segment;
        }
        elapsed += segment.duration;
      }

      return segments[segments.length - 1] ?? null;
    },
    [segments, stats.totalDuration]
  );

  // Jump to specific marker
  const jumpToMarker = useCallback(
    (markerId: string): TimelineMarker | null => {
      return markers.find((m) => m.id === markerId) ?? null;
    },
    [markers]
  );

  // Get position for timestamp
  const getPositionForTime = useCallback(
    (time: Date): number => {
      let elapsed = 0;

      for (const segment of segments) {
        if (segment.startTime <= time && (!segment.endTime || segment.endTime >= time)) {
          const segmentOffset = time.getTime() - segment.startTime.getTime();
          return (elapsed + segmentOffset) / stats.totalDuration;
        }
        elapsed += segment.duration;
      }

      return 1;
    },
    [segments, stats.totalDuration]
  );

  return {
    markers,
    segments,
    stats,
    filteredMarkers,
    playheadPosition,
    zoom,
    setZoom,
    getMarkerAtPosition,
    getSegmentAtPosition,
    jumpToMarker,
    getPositionForTime,
  };
}

/**
 * SessionTimeline Component
 * 
 * Visual timeline for session events with zoom, filtering, and navigation.
 * Shows events grouped by step with markers for different event types.
 * 
 * Backlog B.3: Session timeline visualization
 */

'use client';

import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ClockIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SessionEventType } from '@/types/session-event';
import type {
  UseSessionTimelineReturn,
  TimelineMarker,
  TimelineSegment,
} from '../hooks/useSessionTimeline';

// =============================================================================
// Types
// =============================================================================

export interface SessionTimelineProps {
  /** Timeline data from useSessionTimeline */
  timeline: UseSessionTimelineReturn;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for limited space */
  compact?: boolean;
  /** Timeline height in pixels */
  height?: number;
  /** Callback when marker is clicked */
  onMarkerClick?: (marker: TimelineMarker) => void;
  /** Callback when segment is clicked */
  onSegmentClick?: (segment: TimelineSegment) => void;
  /** Show stats panel */
  showStats?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

const SEVERITY_COLORS: Record<TimelineMarker['severity'], string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const SEVERITY_ICONS: Record<TimelineMarker['severity'], React.ReactNode> = {
  info: <InformationCircleIcon className="h-3 w-3 text-blue-500" />,
  success: <CheckCircleIcon className="h-3 w-3 text-green-500" />,
  warning: <ExclamationTriangleIcon className="h-3 w-3 text-yellow-500" />,
  error: <ExclamationCircleIcon className="h-3 w-3 text-red-500" />,
};

// Event type groups for filtering - using valid SessionEventType values
const EVENT_TYPE_GROUPS: Record<string, SessionEventType[]> = {
  'triggers': ['trigger_armed', 'trigger_fired', 'trigger_disabled', 'trigger_error'],
  'artifacts': ['artifact_revealed', 'artifact_hidden', 'artifact_solved', 'artifact_failed', 'artifact_state_changed'],
  'navigation': ['step_started', 'step_completed', 'phase_started', 'phase_completed'],
  'timebank': ['timebank_started', 'timebank_paused', 'timebank_expired', 'timebank_delta_applied'],
  'signals': ['signal_sent', 'signal_received'],
  'participants': ['participant_joined', 'participant_left', 'participant_action'],
  'host': ['host_action', 'host_hint_sent', 'host_message_sent'],
};

// =============================================================================
// Helpers
// =============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// =============================================================================
// Sub-Component: TimelineMarkerDot
// =============================================================================

interface TimelineMarkerDotProps {
  marker: TimelineMarker;
  onClick?: () => void;
}

function TimelineMarkerDot({ marker, onClick }: TimelineMarkerDotProps) {
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-1">
            {SEVERITY_ICONS[marker.severity]}
            {marker.label}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(marker.timestamp)}
          </div>
          {marker.description && (
            <div className="text-xs">{marker.description}</div>
          )}
        </div>
      }
    >
      <button
        onClick={onClick}
        className={`
          w-3 h-3 rounded-full transition-transform hover:scale-150 cursor-pointer
          ${SEVERITY_COLORS[marker.severity]}
        `}
      />
    </Tooltip>
  );
}

// =============================================================================
// Sub-Component: SegmentBar
// =============================================================================

interface SegmentBarProps {
  segment: TimelineSegment;
  totalDuration: number;
  zoom: number;
  onClick?: () => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
}

function SegmentBar({
  segment,
  totalDuration,
  zoom,
  onClick,
  onMarkerClick,
}: SegmentBarProps) {
  const t = useTranslations('play.sessionTimeline');
  const widthPercent = (segment.duration / totalDuration) * 100 * zoom;
  
  // Distribute markers across segment width
  const markerPositions = segment.markers.map((marker) => {
    const offset = marker.timestamp.getTime() - segment.startTime.getTime();
    return {
      marker,
      position: segment.duration > 0 ? (offset / segment.duration) * 100 : 0,
    };
  });

  return (
    <div
      className="relative flex-shrink-0 group"
      style={{ width: `${Math.max(widthPercent, 3)}%`, minWidth: '60px' }}
    >
      {/* Segment background */}
      <button
        onClick={onClick}
        className={`
          w-full h-8 rounded-md transition-colors cursor-pointer
          ${segment.isCurrent
            ? 'bg-primary/20 border-2 border-primary'
            : 'bg-muted/50 hover:bg-muted border border-border'
          }
        `}
      >
        {/* Segment label */}
        <div className="absolute inset-x-1 top-1 text-xs font-medium truncate">
          {t('stepLabel', { number: segment.stepIndex + 1 })}
        </div>
        
        {/* Duration */}
        <div className="absolute inset-x-1 bottom-0.5 text-[10px] text-muted-foreground truncate">
          {formatDuration(segment.duration)}
        </div>
      </button>

      {/* Markers track */}
      <div className="relative h-4 mt-1">
        {markerPositions.map(({ marker, position }) => (
          <div
            key={marker.id}
            className="absolute top-0.5 -translate-x-1/2"
            style={{ left: `${position}%` }}
          >
            <TimelineMarkerDot
              marker={marker}
              onClick={() => onMarkerClick?.(marker)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: FilterPanel
// =============================================================================

interface FilterPanelProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
}

function FilterPanel({ selectedGroup, onGroupChange }: FilterPanelProps) {
  const t = useTranslations('play.sessionTimeline');
  const options = [
    { value: 'all', label: t('filters.all') },
    ...Object.keys(EVENT_TYPE_GROUPS).map((group) => ({
      value: group,
      label: t(`filters.${group}` as 'filters.all'),
    })),
  ];

  return (
    <Select
      options={options}
      value={selectedGroup}
      onChange={(e) => onGroupChange(e.target.value)}
      className="w-[140px] h-8 text-sm"
    />
  );
}

// =============================================================================
// Sub-Component: ZoomControls
// =============================================================================

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const zoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[idx + 1]);
    }
  };

  const zoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) {
      onZoomChange(ZOOM_LEVELS[idx - 1]);
    }
  };

  const reset = () => onZoomChange(1);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={zoomOut}
        disabled={zoom === ZOOM_LEVELS[0]}
      >
        <MagnifyingGlassMinusIcon className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground w-10 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={zoomIn}
        disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
      >
        <MagnifyingGlassPlusIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={reset}
      >
        <ArrowPathIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

// =============================================================================
// Sub-Component: StatsPanel
// =============================================================================

interface StatsPanelProps {
  stats: UseSessionTimelineReturn['stats'];
}

function StatsPanel({ stats }: StatsPanelProps) {
  const t = useTranslations('play.sessionTimeline');
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t('stats.totalTime')}</div>
        <div className="font-semibold">{formatDuration(stats.totalDuration)}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t('stats.avgPerStep')}</div>
        <div className="font-semibold">{formatDuration(stats.avgStepDuration)}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t('stats.mostActiveStep')}</div>
        <div className="font-semibold">{t('stepLabel', { number: stats.mostActiveStep + 1 })}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
          {t('stats.errors')}
        </div>
        <div className={`font-semibold ${stats.errorCount > 0 ? 'text-red-500' : ''}`}>
          {stats.errorCount}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: MarkerList
// =============================================================================

interface MarkerListProps {
  markers: TimelineMarker[];
  onMarkerClick?: (marker: TimelineMarker) => void;
  maxItems?: number;
}

function MarkerList({ markers, onMarkerClick, maxItems = 50 }: MarkerListProps) {
  const t = useTranslations('play.sessionTimeline');
  const displayMarkers = markers.slice(-maxItems);

  return (
    <div className="space-y-1">
      {displayMarkers.map((marker) => (
        <button
          key={marker.id}
          onClick={() => onMarkerClick?.(marker)}
          className={`
            w-full flex items-center gap-2 p-2 rounded-md text-left text-sm
            hover:bg-muted/50 transition-colors
          `}
        >
          <div className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[marker.severity]}`} />
          <span className="flex-1 truncate">{marker.label}</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(marker.timestamp)}
          </span>
          <Badge variant="outline" className="text-xs">
            {t('stepLabel', { number: marker.stepIndex + 1 })}
          </Badge>
        </button>
      ))}
      {markers.length > maxItems && (
        <div className="text-xs text-muted-foreground text-center py-1">
          {t('showingRecent', { maxItems, total: markers.length })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SessionTimeline({
  timeline,
  className,
  compact = false,
  height = 160,
  onMarkerClick,
  onSegmentClick,
  showStats = true,
}: SessionTimelineProps) {
  const t = useTranslations('play.sessionTimeline');
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterGroup, setFilterGroup] = useState('all');
  const [showList, setShowList] = useState(false);

  // Filter markers by group
  const filteredMarkers = filterGroup === 'all'
    ? timeline.filteredMarkers
    : timeline.filteredMarkers.filter((m) =>
        EVENT_TYPE_GROUPS[filterGroup]?.includes(m.type)
      );

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <SignalIcon className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            {!compact && (
              <CardDescription>
                {t('description', { count: timeline.markers.length, steps: timeline.segments.length })}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FilterPanel selectedGroup={filterGroup} onGroupChange={setFilterGroup} />
            <ZoomControls zoom={timeline.zoom} onZoomChange={timeline.setZoom} />
            <Button
              variant={showList ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowList(!showList)}
            >
              {t('listButton')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats panel */}
        {showStats && !compact && <StatsPanel stats={timeline.stats} />}

        {/* Timeline visualization */}
        <div 
          ref={containerRef}
          className="relative border rounded-lg p-2 bg-background"
          style={{ height: compact ? height * 0.6 : height }}
        >
          {/* Time axis labels */}
          <div className="absolute top-0 left-0 right-0 h-5 flex items-center px-2 text-[10px] text-muted-foreground border-b">
            <span>{t('timeAxis.start')}</span>
            <span className="flex-1 text-center">
              {formatDuration(timeline.stats.totalDuration)}
            </span>
            <span>{t('timeAxis.now')}</span>
          </div>

          {/* Segments container */}
          <ScrollArea maxHeight={`${compact ? height * 0.4 : height - 40}px`} className="pt-5">
            <div className="flex gap-1 p-1 min-w-full">
              {timeline.segments.map((segment) => (
                <SegmentBar
                  key={segment.id}
                  segment={segment}
                  totalDuration={timeline.stats.totalDuration}
                  zoom={timeline.zoom}
                  onClick={() => onSegmentClick?.(segment)}
                  onMarkerClick={onMarkerClick}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Live indicator */}
          <div className="absolute top-6 right-2 flex items-center gap-1">
            <SignalIcon className="h-3 w-3 text-red-500 animate-pulse" />
            <span className="text-xs text-red-500">LIVE</span>
          </div>
        </div>

        {/* Event list view */}
        {showList && (
          <div className="border rounded-lg">
            <ScrollArea maxHeight="200px">
              <MarkerList
                markers={filteredMarkers}
                onMarkerClick={onMarkerClick}
              />
            </ScrollArea>
          </div>
        )}

        {/* Quick stats footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {t('solved', { count: timeline.stats.eventCounts.get('artifact_solved') ?? 0 })}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              {t('triggers', { count: timeline.stats.eventCounts.get('trigger_fired') ?? 0 })}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              {t('errors', { count: timeline.stats.errorCount })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {t('updatingLive')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Compact Timeline (for sidebar)
// =============================================================================

export interface CompactTimelineProps {
  timeline: UseSessionTimelineReturn;
  onMarkerClick?: (marker: TimelineMarker) => void;
  className?: string;
}

export function CompactTimeline({
  timeline,
  onMarkerClick,
  className,
}: CompactTimelineProps) {
  const t = useTranslations('play.sessionTimeline');
  const recentMarkers = timeline.markers.slice(-10).reverse();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1">
          <SignalIcon className="h-4 w-4" />
          {t('recentEvents')}
        </span>
        <Badge variant="outline" className="text-xs">
          {timeline.markers.length}
        </Badge>
      </div>

      <div className="space-y-1">
        {recentMarkers.map((marker) => (
          <button
            key={marker.id}
            onClick={() => onMarkerClick?.(marker)}
            className="w-full flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted/50 text-left"
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_COLORS[marker.severity]}`} />
            <span className="truncate flex-1">{marker.label}</span>
            <span className="text-muted-foreground flex-shrink-0">
              {formatTime(marker.timestamp)}
            </span>
          </button>
        ))}
      </div>

      {timeline.markers.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {t('noEvents')}
        </div>
      )}
    </div>
  );
}

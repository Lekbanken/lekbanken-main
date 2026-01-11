/**
 * EventFeedPanel Component
 * 
 * Real-time event feed showing all session events with filtering,
 * grouping, and correlation tracking.
 * 
 * Epic 6: Event System & Observability - Task 6.3
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import {
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  BoltIcon,
  PuzzlePieceIcon,
  RadioIcon,
  ClockIcon,
  MapIcon,
  UserIcon,
  StarIcon,
  PlayCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  BugAntIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type {
  SessionEvent,
  EventCategory,
  EventSeverity,
  EventStats,
} from '@/types/session-event';

// =============================================================================
// Types
// =============================================================================

export interface EventFeedPanelProps {
  /** Events to display */
  events: SessionEvent[];
  /** Event statistics */
  stats?: EventStats[];
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: Error | null;
  /** Callback to refresh events */
  onRefresh?: () => void;
  /** Callback to clear events */
  onClear?: () => void;
  /** Maximum height for scroll area */
  maxHeight?: string;
  /** Compact mode */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_ICONS: Record<EventCategory, React.ReactNode> = {
  trigger: <BoltIcon className="h-3.5 w-3.5" />,
  artifact: <PuzzlePieceIcon className="h-3.5 w-3.5" />,
  lifecycle: <PlayCircleIcon className="h-3.5 w-3.5" />,
  signal: <RadioIcon className="h-3.5 w-3.5" />,
  timebank: <ClockIcon className="h-3.5 w-3.5" />,
  navigation: <MapIcon className="h-3.5 w-3.5" />,
  participant: <UserIcon className="h-3.5 w-3.5" />,
  host: <StarIcon className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<EventCategory, string> = {
  trigger: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  artifact: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  lifecycle: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  signal: 'bg-green-500/10 text-green-600 border-green-500/20',
  timebank: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  navigation: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  participant: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  host: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

const SEVERITY_ICONS: Record<EventSeverity, React.ReactNode> = {
  debug: <BugAntIcon className="h-3 w-3 text-muted-foreground" />,
  info: <InformationCircleIcon className="h-3 w-3 text-blue-500" />,
  warning: <ExclamationTriangleIcon className="h-3 w-3 text-yellow-500" />,
  error: <ExclamationCircleIcon className="h-3 w-3 text-red-500" />,
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  trigger: 'categories.trigger',
  artifact: 'categories.artifact',
  lifecycle: 'categories.lifecycle',
  signal: 'categories.signal',
  timebank: 'categories.timebank',
  navigation: 'categories.navigation',
  participant: 'categories.participant',
  host: 'categories.host',
};

// =============================================================================
// Helper: Format event type for display
// =============================================================================

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Helper: Format time for display
// =============================================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// =============================================================================
// Helper: Group events by time
// =============================================================================

interface EventGroup {
  label: string;
  events: SessionEvent[];
}

function groupEventsByTime(events: SessionEvent[], t: ReturnType<typeof useTranslations<'play.eventFeed'>>): EventGroup[] {
  const now = new Date();
  const groups: EventGroup[] = [];
  
  const thisMinute: SessionEvent[] = [];
  const last5Min: SessionEvent[] = [];
  const last15Min: SessionEvent[] = [];
  const older: SessionEvent[] = [];
  
  for (const event of events) {
    const diffMs = now.getTime() - event.createdAt.getTime();
    const diffMin = diffMs / 60000;
    
    if (diffMin < 1) {
      thisMinute.push(event);
    } else if (diffMin < 5) {
      last5Min.push(event);
    } else if (diffMin < 15) {
      last15Min.push(event);
    } else {
      older.push(event);
    }
  }
  
  if (thisMinute.length > 0) {
    groups.push({ label: t('timeGroups.lastMinute'), events: thisMinute });
  }
  if (last5Min.length > 0) {
    groups.push({ label: t('timeGroups.last5Minutes'), events: last5Min });
  }
  if (last15Min.length > 0) {
    groups.push({ label: t('timeGroups.last15Minutes'), events: last15Min });
  }
  if (older.length > 0) {
    groups.push({ label: t('timeGroups.older'), events: older });
  }
  
  return groups;
}

// =============================================================================
// Sub-Component: EventRow
// =============================================================================

interface EventRowProps {
  event: SessionEvent;
  compact?: boolean;
  t: ReturnType<typeof useTranslations<'play.eventFeed'>>;
}

function EventRow({ event, compact, t }: EventRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasPayload = Object.keys(event.payload).length > 0;
  
  return (
    <div
      className={`
        border-l-2 pl-3 py-2
        ${event.severity === 'error' ? 'border-l-red-500 bg-red-500/5' : ''}
        ${event.severity === 'warning' ? 'border-l-yellow-500 bg-yellow-500/5' : ''}
        ${event.severity === 'info' ? 'border-l-transparent' : ''}
        ${event.severity === 'debug' ? 'border-l-muted opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Severity icon */}
        <div className="mt-0.5">
          {SEVERITY_ICONS[event.severity]}
        </div>
        
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            <span
              className={`
                inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
                ${CATEGORY_COLORS[event.eventCategory]}
              `}
            >
              {CATEGORY_ICONS[event.eventCategory]}
              {!compact && t(CATEGORY_LABELS[event.eventCategory] as 'categories.trigger')}
            </span>
            
            {/* Event type */}
            <span className="text-sm font-medium truncate">
              {formatEventType(event.eventType)}
            </span>
            
            {/* Target name */}
            {event.targetName && (
              <span className="text-sm text-muted-foreground truncate">
                → {event.targetName}
              </span>
            )}
          </div>
          
          {/* Actor and time */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {event.actorName && (
              <span>{event.actorName}</span>
            )}
            {event.actorName && <span>•</span>}
            <span title={event.createdAt.toLocaleString('sv-SE')}>
              {formatTime(event.createdAt)}
            </span>
            {event.correlationId && (
              <>
                <span>•</span>
                <span className="font-mono text-xs opacity-50">
                  {event.correlationId.slice(0, 8)}
                </span>
              </>
            )}
          </div>
          
          {/* Expandable payload */}
          {hasPayload && !compact && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-3 w-3" />
                  ) : (
                    <ChevronRightIcon className="h-3 w-3" />
                  )}
                  Detaljer
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: EventGroupSection
// =============================================================================

interface EventGroupSectionProps {
  group: EventGroup;
  compact?: boolean;
  t: ReturnType<typeof useTranslations<'play.eventFeed'>>;
}

function EventGroupSection({ group, compact, t }: EventGroupSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full py-2 px-2 hover:bg-muted/50 rounded transition-colors">
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{group.label}</span>
          <Badge variant="default" className="ml-auto">
            {group.events.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 ml-2">
          {group.events.map((event) => (
            <EventRow key={event.id} event={event} compact={compact} t={t} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function EventFeedPanel({
  events,
  stats = [],
  isLoading = false,
  error = null,
  onRefresh,
  onClear,
  maxHeight = '500px',
  compact = false,
  className,
}: EventFeedPanelProps) {
  const t = useTranslations('play.eventFeed');
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByTime, setGroupByTime] = useState(true);

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = events;
    
    if (categoryFilter !== 'all') {
      result = result.filter((e) => e.eventCategory === categoryFilter);
    }
    
    if (severityFilter !== 'all') {
      result = result.filter((e) => e.severity === severityFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.eventType.toLowerCase().includes(query) ||
        e.targetName?.toLowerCase().includes(query) ||
        e.actorName?.toLowerCase().includes(query) ||
        JSON.stringify(e.payload).toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [events, categoryFilter, severityFilter, searchQuery]);

  // Group events
  const groupedEvents = useMemo(() => {
    if (!groupByTime) {
      return [{ label: t('allEvents'), events: filteredEvents }];
    }
    return groupEventsByTime(filteredEvents, t);
  }, [filteredEvents, groupByTime, t]);

  // Count by severity
  const errorCount = events.filter((e) => e.severity === 'error').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartBarIcon className="h-5 w-5" />
              {t('title')}
              {isLoading && (
                <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {t('eventCount', { count: events.length })}
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {t('errors', { count: errorCount })}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs text-yellow-600">
                  {t('warnings', { count: warningCount })}
                </Badge>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-muted' : ''}
            >
              <FunnelIcon className="h-4 w-4" />
            </Button>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('filters.searchPlaceholder')}
                  className="pl-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('filters.category')}</Label>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'all')}
                  options={[
                    { value: 'all', label: t('filters.allCategories') },
                    ...Object.entries(CATEGORY_LABELS).map(([key, labelKey]) => ({
                      value: key,
                      label: t(labelKey as 'categories.trigger'),
                    })),
                  ]}
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">{t('filters.severity')}</Label>
                <Select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | 'all')}
                  options={[
                    { value: 'all', label: t('filters.allSeverities') },
                    { value: 'error', label: t('severity.error') },
                    { value: 'warning', label: t('severity.warning') },
                    { value: 'info', label: t('severity.info') },
                    { value: 'debug', label: t('severity.debug') },
                  ]}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="group-time"
                  checked={groupByTime}
                  onCheckedChange={setGroupByTime}
                />
                <Label htmlFor="group-time" className="text-xs">
                  {t('filters.groupByTime')}
                </Label>
              </div>
              
              {onClear && events.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="text-xs h-7"
                >
                  {t('filters.clear')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
            <ExclamationCircleIcon className="h-4 w-4" />
            {error.message}
          </div>
        )}

        {/* Event list */}
        <ScrollArea maxHeight={maxHeight} className="pr-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {events.length === 0
                ? t('empty.noEvents')
                : t('empty.noMatchingEvents')}
            </div>
          ) : (
            <div className="space-y-2">
              {groupedEvents.map((group) => (
                <EventGroupSection
                  key={group.label}
                  group={group}
                  compact={compact}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Stats summary */}
        {stats.length > 0 && !compact && (
          <div className="pt-3 border-t">
            <div className="flex flex-wrap gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.eventCategory}
                  className={`
                    inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs
                    ${CATEGORY_COLORS[stat.eventCategory]}
                  `}
                >
                  {CATEGORY_ICONS[stat.eventCategory]}
                  <span>{stat.eventCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

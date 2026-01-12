'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { formatDateTimeLong } from '@/lib/i18n/format-utils';
import {
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  CogIcon,
  GlobeAltIcon,
  SwatchIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { AuditEvent } from "../../types";

type OrganisationAuditFullProps = {
  tenantId: string;
};

// Event type icons and colors (static config without labels)
const eventTypeIcons: Record<string, typeof ClockIcon> = {
  status_changed: ShieldCheckIcon,
  member_added: UserPlusIcon,
  member_removed: UserMinusIcon,
  member_role_changed: ShieldCheckIcon,
  settings_updated: CogIcon,
  domain_added: GlobeAltIcon,
  domain_removed: GlobeAltIcon,
  domain_status_changed: GlobeAltIcon,
  branding_updated: SwatchIcon,
  branding_logo_updated: SwatchIcon,
  locale_updated: GlobeAltIcon,
  feature_toggled: KeyIcon,
  organisation_suspended: ExclamationTriangleIcon,
  organisation_archived: ExclamationTriangleIcon,
};

const eventTypeColors: Record<string, string> = {
  status_changed: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  member_added: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  member_removed: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  member_role_changed: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  settings_updated: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
  domain_added: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  domain_removed: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  domain_status_changed: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  branding_updated: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  branding_logo_updated: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  locale_updated: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
  feature_toggled: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
  organisation_suspended: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  organisation_archived: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
};

const defaultColor = 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';

const PAGE_SIZE = 20;

export function OrganisationAuditFull({
  tenantId,
}: OrganisationAuditFullProps) {
  const t = useTranslations('admin.organizations.audit');
  const { error: toastError } = useToast();
  
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  // Event type labels from translations
  const eventTypeLabels: Record<string, string> = useMemo(() => ({
    status_changed: t('events.statusChanged'),
    member_added: t('events.memberAdded'),
    member_removed: t('events.memberRemoved'),
    member_role_changed: t('events.memberRoleChanged'),
    settings_updated: t('events.settingsUpdated'),
    domain_added: t('events.domainAdded'),
    domain_removed: t('events.domainRemoved'),
    domain_status_changed: t('events.domainStatusChanged'),
    branding_updated: t('events.brandingUpdated'),
    branding_logo_updated: t('events.brandingLogoUpdated'),
    locale_updated: t('events.localeUpdated'),
    feature_toggled: t('events.featureToggled'),
    organisation_suspended: t('events.organisationSuspended'),
    organisation_archived: t('events.organisationArchived'),
  }), [t]);
  
  // Format timestamp for display
  const formatTimestamp = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minAgo', { min: diffMins });
    if (diffHours < 24) return t('hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('daysAgo', { days: diffDays });
    
    return formatDateTimeLong(date);
  }, [t]);
  
  // Format payload details
  const formatPayloadDetails = useCallback((eventType: string, payload: Record<string, unknown> | null): string => {
    if (!payload) return '';
    
    switch (eventType) {
      case 'status_changed':
        return `${payload.from} → ${payload.to}`;
      case 'member_role_changed':
        return `${payload.email}: ${payload.from} → ${payload.to}`;
      case 'member_removed':
        return payload.email as string || '';
      case 'domain_added':
      case 'domain_removed':
        return payload.hostname as string || '';
      case 'domain_status_changed':
        return `${payload.hostname}: ${payload.from} → ${payload.to}`;
      case 'feature_toggled':
        return `${payload.featureKey}: ${payload.enabled ? t('enabled') : t('disabled')}`;
      default:
        return '';
    }
  }, [t]);
  
  // Get unique event types for filter
  const eventTypeOptions = useMemo(() => [
    { value: 'all', label: t('allEvents') },
    ...Object.entries(eventTypeLabels).map(([value, label]) => ({
      value,
      label,
    })),
  ], [eventTypeLabels, t]);
  
  // Load audit events
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tenant_audit_logs')
        .select('id, event_type, payload, created_at, actor_user_id', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      
      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      const mappedEvents: AuditEvent[] = (data || []).map((e) => ({
        id: e.id,
        eventType: e.event_type,
        payload: e.payload as Record<string, unknown> | null,
        createdAt: e.created_at,
        actor: null, // Would need to join users table
      }));
      
      setEvents(mappedEvents);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('Failed to load audit events:', err);
      toastError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, currentPage, eventTypeFilter, toastError, t]);
  
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  
  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [eventTypeFilter]);
  
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ClockIcon className="h-4 w-4" />
          {t('titleWithCount', { count: totalCount })}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadEvents}
            disabled={isLoading}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <FunnelIcon className="h-4 w-4 text-muted-foreground" />
          <Select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            options={eventTypeOptions}
          />
        </div>
        
        {/* Events list */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('loading')}
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {eventTypeFilter !== 'all'
              ? t('noEventsOfType')
              : t('noActivity')
            }
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const Icon = eventTypeIcons[event.eventType] || ClockIcon;
              const color = eventTypeColors[event.eventType] || defaultColor;
              const label = eventTypeLabels[event.eventType] || t('event');
              const details = formatPayloadDetails(event.eventType, event.payload);
              
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{label}</span>
                      {details && (
                        <span className="text-xs text-muted-foreground truncate">
                          {details}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTimestamp(event.createdAt)}
                      {event.actor && (
                        <span> • {event.actor.email}</span>
                      )}
                    </div>
                  </div>
                  {event.payload && (
                    <button
                      onClick={() => console.log('Payload:', event.payload)}
                      className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="JSON"
                    >
                      JSON
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {t('showingRange', { from: currentPage * PAGE_SIZE + 1, to: Math.min((currentPage + 1) * PAGE_SIZE, totalCount), total: totalCount })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={!hasPrevPage || isLoading}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!hasNextPage || isLoading}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

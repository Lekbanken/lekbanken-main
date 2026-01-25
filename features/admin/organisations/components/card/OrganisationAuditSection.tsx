'use client';

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDate } from '@/lib/i18n/format-utils';
import {
  ClockIcon,
  ArrowRightIcon,
  UserCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui";
import type { AuditEvent } from "../../types";

type OrganisationAuditSectionProps = {
  tenantId: string;
  events: AuditEvent[];
  expanded?: boolean;
};

// Event type configuration for icons and labels
const eventConfig: Record<string, { icon: typeof ClockIcon; label: string; color: string }> = {
  status_changed: { icon: ArrowPathIcon, label: 'Status ändrad', color: 'text-amber-600' },
  member_added: { icon: PlusIcon, label: 'Medlem tillagd', color: 'text-emerald-600' },
  member_removed: { icon: UserCircleIcon, label: 'Medlem borttagen', color: 'text-red-600' },
  feature_toggled: { icon: Cog6ToothIcon, label: 'Funktion ändrad', color: 'text-blue-600' },
  branding_updated: { icon: PaintBrushIcon, label: 'Branding uppdaterad', color: 'text-purple-600' },
  contact_updated: { icon: EnvelopeIcon, label: 'Kontakt uppdaterad', color: 'text-primary' },
  domain_added: { icon: GlobeAltIcon, label: 'Domän tillagd', color: 'text-emerald-600' },
  domain_removed: { icon: GlobeAltIcon, label: 'Domän borttagen', color: 'text-red-600' },
  domain_status_changed: { icon: GlobeAltIcon, label: 'Domänstatus ändrad', color: 'text-amber-600' },
};

const defaultConfig = { icon: ClockIcon, label: 'Händelse', color: 'text-muted-foreground' };

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 60) return `${diffMins}m sedan`;
  if (diffHours < 24) return `${diffHours}h sedan`;
  if (diffDays < 7) return `${diffDays}d sedan`;
  if (diffWeeks < 4) return `${diffWeeks}v sedan`;
  return formatDate(date);
}

function formatEventPayload(eventType: string, payload: Record<string, unknown> | null): string {
  if (!payload) return '';
  
  switch (eventType) {
    case 'status_changed':
      return `${payload.from} → ${payload.to}`;
    case 'feature_toggled':
      return `${payload.feature_key}: ${payload.enabled ? 'on' : 'off'}`;
    case 'domain_added':
    case 'domain_removed':
      return String(payload.hostname || '');
    case 'domain_status_changed':
      return `${payload.hostname}: ${payload.from} → ${payload.to}`;
    default:
      return '';
  }
}

export function OrganisationAuditSection({
  tenantId,
  events,
  expanded = false,
}: OrganisationAuditSectionProps) {
  const router = useRouter();
  const t = useTranslations('admin.organisations.audit');
  const displayEvents = expanded ? events : events.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
        </div>
        {!expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/organisations/${tenantId}?tab=audit`)}
            className="text-primary"
          >
            {t('fullLog')}
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayEvents.map((event) => {
              const config = eventConfig[event.eventType] || defaultConfig;
              const Icon = config.icon;
              const payloadStr = formatEventPayload(event.eventType, event.payload);

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{config.label}</span>
                      {payloadStr && (
                        <span className="text-sm text-muted-foreground truncate">
                          {payloadStr}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span>{formatRelativeTime(event.createdAt)}</span>
                    {event.actor && (
                      <span className="font-mono">@{event.actor.email?.split('@')[0]}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!expanded && events.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('moreEvents', { count: events.length - 5 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

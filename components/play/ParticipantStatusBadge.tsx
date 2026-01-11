'use client';

import { useTranslations } from 'next-intl';
import type { Database } from '@/types/supabase';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

type ParticipantStatus = Database['public']['Enums']['participant_status'];

type StatusConfig = {
  labelKey: string;
  variant: BadgeVariant;
};

const statusConfig: Record<ParticipantStatus, StatusConfig> = {
  active: { labelKey: 'active', variant: 'success' },
  idle: { labelKey: 'idle', variant: 'warning' },
  disconnected: { labelKey: 'disconnected', variant: 'secondary' },
  kicked: { labelKey: 'kicked', variant: 'destructive' },
  blocked: { labelKey: 'blocked', variant: 'error' },
};

type ParticipantStatusBadgeProps = {
  status: ParticipantStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function ParticipantStatusBadge({
  status,
  size = 'sm',
  className = '',
}: ParticipantStatusBadgeProps) {
  const t = useTranslations('play.participantStatusBadge');
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} dot className={className}>
      {t(config.labelKey)}
    </Badge>
  );
}

// Status dot component for inline use
type StatusDotProps = {
  status: ParticipantStatus;
  className?: string;
};

const dotColors: Record<ParticipantStatus, string> = {
  active: 'bg-success',
  idle: 'bg-warning',
  disconnected: 'bg-muted-foreground',
  kicked: 'bg-destructive',
  blocked: 'bg-destructive',
};

export function ParticipantStatusDot({ status, className = '' }: StatusDotProps) {
  const t = useTranslations('play.participantStatusBadge');
  const isActive = status === 'active';
  const labelKey = statusConfig[status].labelKey;

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${dotColors[status]} ${
        isActive ? 'animate-pulse' : ''
      } ${className}`}
      role="status"
      aria-label={t(labelKey)}
    />
  );
}

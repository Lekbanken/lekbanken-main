'use client';

import type { Database } from '@/types/supabase';
import { Badge, type BadgeVariant } from '@/components/ui/badge';

type ParticipantStatus = Database['public']['Enums']['participant_status'];

type StatusConfig = {
  label: string;
  variant: BadgeVariant;
};

const statusConfig: Record<ParticipantStatus, StatusConfig> = {
  active: { label: 'Ansluten', variant: 'success' },
  idle: { label: 'Inaktiv', variant: 'warning' },
  disconnected: { label: 'Frånkopplad', variant: 'secondary' },
  kicked: { label: 'Sparkad', variant: 'destructive' },
  blocked: { label: 'Blockerad', variant: 'error' },
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
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} dot className={className}>
      {config.label}
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
  const isActive = status === 'active';

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${dotColors[status]} ${
        isActive ? 'animate-pulse' : ''
      } ${className}`}
      role="status"
      aria-label={statusConfig[status].label}
    />
  );
}

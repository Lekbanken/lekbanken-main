'use client';

import { useTranslations } from 'next-intl';
import type { Database } from '@/types/supabase';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import {
  PlayCircleIcon,
  PauseCircleIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import type { ComponentType, SVGProps } from 'react';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

type StatusConfig = {
  labelKey: string;
  variant: BadgeVariant;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const statusConfig: Record<SessionStatus, StatusConfig> = {
  active: { labelKey: 'active', variant: 'success', Icon: PlayCircleIcon },
  paused: { labelKey: 'paused', variant: 'warning', Icon: PauseCircleIcon },
  locked: { labelKey: 'locked', variant: 'secondary', Icon: LockClosedIcon },
  ended: { labelKey: 'ended', variant: 'default', Icon: CheckCircleIcon },
  archived: { labelKey: 'archived', variant: 'outline', Icon: ArchiveBoxIcon },
  cancelled: { labelKey: 'cancelled', variant: 'destructive', Icon: XCircleIcon },
};

type SessionStatusBadgeProps = {
  status: SessionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
};

export function SessionStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: SessionStatusBadgeProps) {
  const t = useTranslations('play.sessionStatusBadge');
  const config = statusConfig[status];
  const { Icon } = config;

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge variant={config.variant} size={size} dot={!showIcon} className={className}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {t(config.labelKey)}
    </Badge>
  );
}

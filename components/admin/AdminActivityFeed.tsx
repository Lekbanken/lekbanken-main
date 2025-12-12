'use client';

import Image from 'next/image';

import { useState, useEffect, useMemo } from 'react';
import { 
  UserPlusIcon,
  UserMinusIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  CubeIcon,
  BuildingOffice2Icon,
  TrophyIcon,
  CogIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Simple Swedish relative time formatter (no external dependency)
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just nu';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min sedan`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'timme' : 'timmar'} sedan`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagar'} sedan`;
  } else {
    return date.toLocaleDateString('sv-SE');
  }
}

// Activity types for admin actions
export type ActivityType = 
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_invited'
  | 'role_assigned'
  | 'role_removed'
  | 'org_created'
  | 'org_updated'
  | 'org_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_published'
  | 'product_archived'
  | 'achievement_created'
  | 'achievement_awarded'
  | 'settings_updated'
  | 'bulk_action';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  target?: {
    type: 'user' | 'organization' | 'product' | 'achievement' | 'setting';
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

interface AdminActivityFeedProps {
  /** Activity items to display */
  activities: ActivityItem[];
  /** Maximum items to show (default: 10) */
  maxItems?: number;
  /** Whether the feed is loading */
  isLoading?: boolean;
  /** Callback when user clicks on an activity */
  onActivityClick?: (activity: ActivityItem) => void;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Additional className */
  className?: string;
}

// Map activity types to icons and labels
const activityConfig: Record<ActivityType, { 
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  user_created: { icon: UserPlusIcon, label: 'skapade användare', color: 'text-green-600' },
  user_updated: { icon: PencilSquareIcon, label: 'uppdaterade användare', color: 'text-blue-600' },
  user_deleted: { icon: UserMinusIcon, label: 'tog bort användare', color: 'text-red-600' },
  user_invited: { icon: UserPlusIcon, label: 'bjöd in', color: 'text-purple-600' },
  role_assigned: { icon: ShieldCheckIcon, label: 'tilldelade roll till', color: 'text-indigo-600' },
  role_removed: { icon: ShieldCheckIcon, label: 'tog bort roll från', color: 'text-orange-600' },
  org_created: { icon: BuildingOffice2Icon, label: 'skapade organisation', color: 'text-green-600' },
  org_updated: { icon: BuildingOffice2Icon, label: 'uppdaterade organisation', color: 'text-blue-600' },
  org_deleted: { icon: BuildingOffice2Icon, label: 'tog bort organisation', color: 'text-red-600' },
  product_created: { icon: CubeIcon, label: 'skapade produkt', color: 'text-green-600' },
  product_updated: { icon: CubeIcon, label: 'uppdaterade produkt', color: 'text-blue-600' },
  product_published: { icon: CubeIcon, label: 'publicerade produkt', color: 'text-green-600' },
  product_archived: { icon: CubeIcon, label: 'arkiverade produkt', color: 'text-gray-600' },
  achievement_created: { icon: TrophyIcon, label: 'skapade achievement', color: 'text-yellow-600' },
  achievement_awarded: { icon: TrophyIcon, label: 'tilldelade achievement till', color: 'text-yellow-600' },
  settings_updated: { icon: CogIcon, label: 'uppdaterade inställningar', color: 'text-gray-600' },
  bulk_action: { icon: ArrowPathIcon, label: 'utförde massåtgärd', color: 'text-purple-600' },
};

/**
 * Activity feed showing recent admin actions.
 */
export function AdminActivityFeed({
  activities,
  maxItems = 10,
  isLoading = false,
  onActivityClick,
  showTimestamps = true,
  className = '',
}: AdminActivityFeedProps) {
  const displayedActivities = useMemo(
    () => activities.slice(0, maxItems),
    [activities, maxItems]
  );

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
        <ClockIcon className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Ingen aktivitet ännu
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {displayedActivities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        const isLast = index === displayedActivities.length - 1;

        return (
          <div
            key={activity.id}
            className={`relative flex items-start gap-3 py-3 ${onActivityClick ? 'cursor-pointer hover:bg-muted/50' : ''} ${!isLast ? 'border-b border-border' : ''}`}
            onClick={() => onActivityClick?.(activity)}
            role={onActivityClick ? 'button' : undefined}
            tabIndex={onActivityClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onActivityClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onActivityClick(activity);
              }
            }}
          >
            {/* Actor avatar */}
            <div className="flex-shrink-0">
              {activity.actor.avatarUrl ? (
                <Image
                  src={activity.actor.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full"
                  width={32}
                  height={32}
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {activity.actor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.actor.name}</span>{' '}
                <span className="text-muted-foreground">{config.label}</span>
                {activity.target && (
                  <>
                    {' '}
                    <span className="font-medium">{activity.target.name}</span>
                  </>
                )}
              </p>
              {showTimestamps && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              )}
            </div>

            {/* Activity type icon */}
            <div className={`flex-shrink-0 ${config.color}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hook to fetch and manage activity feed data
export function useActivityFeed(options: {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const { 
    limit = 20, 
    autoRefresh = false, 
    refreshInterval = 30000 
  } = options;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Demo data - in production this would fetch from an audit log table
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call - replace with actual Supabase query
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Demo activities
        const demoActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'user_created',
            actor: { id: '1', name: 'Anna Andersson', email: 'anna@example.com' },
            target: { type: 'user', id: '10', name: 'Erik Eriksson' },
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          },
          {
            id: '2',
            type: 'product_published',
            actor: { id: '2', name: 'Karl Karlsson', email: 'karl@example.com' },
            target: { type: 'product', id: '20', name: 'Mattelekar Pro' },
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
          },
          {
            id: '3',
            type: 'role_assigned',
            actor: { id: '1', name: 'Anna Andersson', email: 'anna@example.com' },
            target: { type: 'user', id: '11', name: 'Lisa Lindqvist' },
            metadata: { role: 'org_admin' },
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
          },
          {
            id: '4',
            type: 'achievement_created',
            actor: { id: '3', name: 'Maja Månsson', email: 'maja@example.com' },
            target: { type: 'achievement', id: '30', name: 'Stjärnsamlare' },
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h ago
          },
          {
            id: '5',
            type: 'org_created',
            actor: { id: '1', name: 'Anna Andersson', email: 'anna@example.com' },
            target: { type: 'organization', id: '40', name: 'Stockholms Skolor' },
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          },
        ];

        setActivities(demoActivities.slice(0, limit));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch activities'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Auto-refresh
    if (autoRefresh) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh, refreshInterval]);

  const refetch = () => {
    setIsLoading(true);
    // Trigger re-fetch
  };

  return {
    activities,
    isLoading,
    error,
    refetch,
  };
}

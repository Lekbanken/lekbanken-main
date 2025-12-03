import type { ActivityItem } from "../types";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  UserPlusIcon,
  BuildingOffice2Icon,
  TrophyIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";

type ActivityFeedProps = {
  items: ActivityItem[];
};

// Type-specific icons
const typeIcons: Record<ActivityItem["type"], typeof ClockIcon> = {
  user_created: UserPlusIcon,
  organisation_created: BuildingOffice2Icon,
  achievement_created: TrophyIcon,
  product_updated: CubeIcon,
  license_updated: KeyIcon,
  other: ClockIcon,
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  const getIcon = (item: ActivityItem) => {
    const IconComponent = typeIcons[item.type] || ClockIcon;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusStyles = (status?: ActivityItem["status"]) => {
    switch (status) {
      case "warning":
        return {
          dot: "bg-amber-500",
          iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
          line: "bg-amber-200 dark:bg-amber-800/50",
        };
      case "success":
        return {
          dot: "bg-emerald-500",
          iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
          line: "bg-emerald-200 dark:bg-emerald-800/50",
        };
      default:
        return {
          dot: "bg-primary",
          iconBg: "bg-primary/10 text-primary",
          line: "bg-border",
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClockIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <p className="text-xs text-muted-foreground">Latest events across your admin areas</p>
            </div>
          </div>
          <Button variant="outline" size="sm" href="/admin/analytics" className="gap-1.5">
            <ChartBarIcon className="h-4 w-4" />
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
              <InboxIcon className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No recent activity</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Activity from users, organisations, and products will appear here.
            </p>
            <Button variant="outline" size="sm" href="/admin/analytics" className="mt-4 gap-1.5">
              <ChartBarIcon className="h-4 w-4" />
              View reports
            </Button>
          </div>
        ) : (
          /* Activity Timeline */
          <ul className="divide-y divide-border/40">
            {items.map((item, index) => {
              const styles = getStatusStyles(item.status);
              const isLast = index === items.length - 1;
              
              return (
                <li 
                  key={item.id} 
                  className="group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  {/* Timeline connector */}
                  {!isLast && (
                    <span 
                      className={`absolute left-[30px] top-12 h-[calc(100%-24px)] w-0.5 ${styles.line}`} 
                      aria-hidden 
                    />
                  )}
                  
                  {/* Icon container with status dot */}
                  <div className="relative flex-shrink-0">
                    <span 
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${styles.iconBg} transition-transform group-hover:scale-105`}
                    >
                      {getIcon(item)}
                    </span>
                    {/* Status dot */}
                    <span 
                      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ${styles.dot} ring-2 ring-card`} 
                      aria-hidden 
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

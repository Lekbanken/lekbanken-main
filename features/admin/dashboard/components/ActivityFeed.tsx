import type { ActivityItem } from "../types";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { ClockIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  const getIcon = (item: ActivityItem) => {
    if (item.icon) return item.icon;
    if (item.status === "warning") return <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />;
    if (item.status === "success") return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
    return <ClockIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const getDotClass = (status?: ActivityItem["status"]) => {
    if (status === "warning") return "bg-amber-500";
    if (status === "success") return "bg-emerald-500";
    return "bg-muted-foreground";
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex items-center justify-between p-4 text-sm text-muted-foreground">
            <span>No recent activity.</span>
            <Button variant="outline" size="sm" href="/admin/analytics">
              View reports
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="relative flex items-start gap-3 px-4 py-3">
                <span className="absolute left-4 top-0 h-full w-px bg-border" aria-hidden />
                <span className="relative mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <span className={`absolute left-0 top-0 h-2 w-2 rounded-full ${getDotClass(item.status)}`} aria-hidden />
                  {getIcon(item)}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

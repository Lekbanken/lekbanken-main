import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/solid";

type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  iconGradient?: string;
};

const defaultGradient = "from-slate-500 to-slate-700";

export function MetricCard({ label, value, change, trend = "flat", icon, iconGradient }: MetricCardProps) {
  const gradient = iconGradient || defaultGradient;
  
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            {icon}
          </div>
          <div className="flex-1 text-right">
            <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
        {change && (
          <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border/50 pt-3">
            {trend === "up" && <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
            <span className={`text-xs font-medium ${
              trend === "up" ? "text-emerald-600 dark:text-emerald-400" : 
              trend === "down" ? "text-red-600 dark:text-red-400" : 
              "text-muted-foreground"
            }`}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

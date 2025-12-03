import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from "@heroicons/react/24/solid";

type MetricCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  iconGradient?: string;
  attention?: "normal" | "warning" | "critical";
};

const defaultGradient = "from-slate-500 to-slate-700";

export function MetricCard({ 
  label, 
  value, 
  change, 
  trend = "flat", 
  icon, 
  iconGradient,
  attention = "normal" 
}: MetricCardProps) {
  const gradient = iconGradient || defaultGradient;
  
  // Attention-based styling
  const attentionStyles = {
    normal: {
      card: "border-border/50 bg-card",
      ring: "",
    },
    warning: {
      card: "border-amber-200/60 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-950/20",
      ring: "ring-1 ring-amber-200/50 dark:ring-amber-800/30",
    },
    critical: {
      card: "border-red-200/60 bg-red-50/30 dark:border-red-800/40 dark:bg-red-950/20",
      ring: "ring-1 ring-red-200/50 dark:ring-red-800/30",
    },
  };

  const styles = attentionStyles[attention];
  
  return (
    <Card className={`${styles.card} ${styles.ring} transition-all duration-200 hover:shadow-md hover:shadow-primary/5`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div 
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10`}
          >
            {icon}
          </div>
          
          {/* Value & Label */}
          <div className="flex-1 text-right">
            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {value}
            </div>
            <div className="mt-0.5 text-sm font-medium text-muted-foreground">
              {label}
            </div>
          </div>
        </div>
        
        {/* Change indicator */}
        {change && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              trend === "up" 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                : trend === "down" 
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                  : "bg-muted text-muted-foreground"
            }`}>
              {trend === "up" && <ArrowTrendingUpIcon className="h-3.5 w-3.5" />}
              {trend === "down" && <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
              {trend === "flat" && <MinusIcon className="h-3.5 w-3.5" />}
              {change}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

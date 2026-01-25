import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

type SectionTileProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  badge?: string;
  iconGradient?: string;
  stat?: { value: string; label: string };
};

// Default gradient if none specified
const defaultGradient = "from-primary to-purple-600";

export function SectionTile({ title, description, href, icon, badge, iconGradient, stat }: SectionTileProps) {
  const t = useTranslations('admin.dashboard');
  const gradient = iconGradient || defaultGradient;
  
  return (
    <Link href={href} className="group h-full">
      <Card className="h-full border-border/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          {/* Header: Icon + Badge */}
          <div className="flex items-start justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-primary/20`}>
              {icon}
            </div>
            {badge && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {badge}
              </span>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          
          {/* Optional stat */}
          {stat && (
            <div className="border-t border-border/50 pt-3">
              <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          )}
          
          {/* Footer action */}
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            {t('sectionTile.open')}
            <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

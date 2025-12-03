import Link from "next/link";
import type { QuickLinkItem } from "../types";
import { Card, CardContent } from "@/components/ui";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

type QuickLinksProps = {
  items: QuickLinkItem[];
};

const defaultGradient = "from-primary to-purple-600";

export function QuickLinks({ items }: QuickLinksProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const gradient = item.iconGradient || defaultGradient;
        return (
          <Link key={item.id} href={item.href} className="group h-full">
            <Card className="relative h-full overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
              {/* Subtle gradient overlay on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
              
              <CardContent className="relative flex h-full flex-col gap-4 p-5">
                {/* Icon with gradient */}
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105`}>
                  {item.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 space-y-1.5">
                  <p className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                
                {/* Action indicator */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
                  <span>Open</span>
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

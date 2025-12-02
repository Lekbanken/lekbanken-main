import Link from "next/link";
import type { QuickLinkItem } from "../types";
import { Card, CardContent } from "@/components/ui";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

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
            <Card className="h-full border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                  {item.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  Open
                  <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

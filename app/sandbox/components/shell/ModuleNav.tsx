'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SwatchIcon,
  SparklesIcon,
  CubeIcon,
  PhotoIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const modules = [
  { id: 'typography', name: 'Typography', href: '/sandbox/typography', icon: DocumentTextIcon },
  { id: 'icons', name: 'Icon & Logo', href: '/sandbox/design-system/icons', icon: SparklesIcon },
  { id: 'colors', name: 'Colors', href: '/sandbox/colors', icon: SwatchIcon },
  { id: 'gamification', name: 'Gamification', href: '/sandbox/gamification', icon: PhotoIcon },
  { id: 'buttons', name: 'Buttons', href: '/sandbox/buttons', icon: CursorArrowRaysIcon },
  { id: 'inputs', name: 'Inputs', href: '/sandbox/inputs', icon: RectangleStackIcon },
  { id: 'layouts', name: 'Layouts', href: '/sandbox/layouts', icon: Squares2X2Icon },
  { id: 'spacing', name: 'Spacing', href: '/sandbox/spacing', icon: CubeIcon },
];

interface ModuleNavProps {
  onClose?: () => void;
}

export function ModuleNav({ onClose }: ModuleNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <SparklesIcon className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold text-foreground">UI Sandbox</span>
      </div>

      <ul role="list" className="flex flex-1 flex-col gap-1 p-3">
        <li className="mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Modules
          </span>
        </li>
        {modules.map((mod) => {
          const isActive = pathname === mod.href || pathname.startsWith(mod.href + '/');
          return (
            <li key={mod.id}>
              <Link
                href={mod.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <mod.icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {mod.name}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border p-3">
        <Link
          href="/sandbox"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Squares2X2Icon className="h-5 w-5" />
          Overview
        </Link>
      </div>
    </nav>
  );
}

export { modules };

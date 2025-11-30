'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { 
  adminMainNavItems, 
  adminSecondaryNavItems, 
  adminSettingsNavItems,
  type AdminNavItem 
} from './admin-nav-items'

function NavSection({ 
  title, 
  items 
}: { 
  title?: string
  items: AdminNavItem[] 
}) {
  const pathname = usePathname()

  return (
    <div>
      {title && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge variant="error" size="sm">{item.badge}</Badge>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function AdminSidebar() {
  return (
    <aside className="hidden h-full w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur lg:block">
      {/* Header */}
      <div className="border-b border-border p-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3 4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Lekbanken</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-6 p-4">
        <NavSection items={adminMainNavItems} />
        <NavSection title="Verktyg" items={adminSecondaryNavItems} />
        <NavSection title="System" items={adminSettingsNavItems} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <Link 
          href="/app" 
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Tillbaka till appen
        </Link>
      </div>
    </aside>
  )
}

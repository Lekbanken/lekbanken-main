'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  adminNavConfig,
  tenantAdminNavConfig,
  type AdminNavGroupConfig,
  type AdminNavItemConfig,
} from "@/app/admin/components/admin-nav-config";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { ActingAsTenantBadge } from "@/components/admin/ActingAsTenantBanner";
import {
  ChevronDoubleLeftIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

type AdminSidebarProps = {
  variant?: "desktop" | "mobile";
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

/**
 * Filter nav items based on RBAC permissions
 */
function useFilteredNavGroups(): AdminNavGroupConfig[] {
  const { can, isSystemAdmin, isTenantAdmin, currentTenantId } = useRbac();
  
  return useMemo(() => {
    // Determine which config to use as base
    const baseConfig = currentTenantId && !isSystemAdmin 
      ? tenantAdminNavConfig 
      : adminNavConfig;
    
    return baseConfig
      .filter((group) => {
        // Hide system-admin-only groups for non-system-admins
        if (group.systemAdminOnly && !isSystemAdmin) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // System admin only items
          if (item.systemAdminOnly && !isSystemAdmin) return false;
          // Tenant admin only items (hide for system admin without tenant context)
          if (item.tenantAdminOnly && !currentTenantId) return false;
          // Permission check
          if (item.permission && !can(item.permission)) return false;
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0); // Remove empty groups
  }, [can, isSystemAdmin, isTenantAdmin, currentTenantId]);
}

function NavSection({ 
  title, 
  items, 
  onNavigate,
  collapsed = false 
}: { 
  title?: string; 
  items: AdminNavItemConfig[]; 
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <div>
      {title && !collapsed && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
      )}
      {title && collapsed && (
        <div className="mx-auto mb-2 h-px w-8 bg-slate-700" />
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? "bg-primary/15 text-primary" 
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-primary" />
              )}
              <span className={`flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-slate-400 group-hover:text-white"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="error" size="sm" className="bg-red-500 text-white">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarContent({ 
  onNavigate, 
  collapsed = false,
  onToggleCollapse 
}: { 
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const filteredGroups = useFilteredNavGroups();
  const { isSystemAdmin, currentTenantId } = useRbac();
  const showActingAsBanner = isSystemAdmin && currentTenantId;

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo area */}
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-sm font-bold text-white shadow-lg shadow-primary/25">
            L
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white">Lekbanken</p>
              <p className="text-[11px] font-medium text-slate-500">Admin Panel</p>
            </div>
          )}
        </Link>
      </div>

      {/* Acting as tenant badge (for system admins) */}
      {showActingAsBanner && !collapsed && (
        <div className="px-3 pt-3">
          <ActingAsTenantBadge />
        </div>
      )}

      {/* Navigation - now using filtered groups */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        {filteredGroups.map((group, index) => (
          <NavSection
            key={group.id}
            title={index > 0 ? group.title : undefined} // First group has no title
            items={group.items}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/app"
          onClick={onNavigate}
          title={collapsed ? "Tillbaka till appen" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white ${collapsed ? "justify-center" : ""}`}
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          {!collapsed && <span>Tillbaka till appen</span>}
        </Link>
        
        {/* Collapse toggle (desktop only) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300 ${collapsed ? "justify-center" : ""}`}
          >
            <ChevronDoubleLeftIcon className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span className="text-xs">Minimera</span>}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminSidebar({ variant = "desktop", open = false, onClose, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  if (variant === "mobile") {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0">
          <SidebarContent onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside 
      className={`hidden h-screen flex-shrink-0 transition-all duration-250 ease-in-out lg:block ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="sticky top-0 h-screen">
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </div>
    </aside>
  );
}

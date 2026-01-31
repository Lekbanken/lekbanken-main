'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  UserCircleIcon,
  UserIcon,
  AtSymbolIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ChevronLeftIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface ProfileNavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionKey?: string;
}

const navItems: ProfileNavItem[] = [
  {
    id: 'overview',
    labelKey: 'nav.overview',
    href: '/app/profile',
    icon: UserCircleIcon,
    descriptionKey: 'nav.overviewDesc',
  },
  {
    id: 'general',
    labelKey: 'nav.general',
    href: '/app/profile/general',
    icon: UserIcon,
    descriptionKey: 'nav.generalDesc',
  },
  {
    id: 'account',
    labelKey: 'nav.account',
    href: '/app/profile/account',
    icon: AtSymbolIcon,
    descriptionKey: 'nav.accountDesc',
  },
  {
    id: 'security',
    labelKey: 'nav.security',
    href: '/app/profile/security',
    icon: ShieldCheckIcon,
    descriptionKey: 'nav.securityDesc',
  },
  {
    id: 'privacy',
    labelKey: 'nav.privacy',
    href: '/app/profile/privacy',
    icon: LockClosedIcon,
    descriptionKey: 'nav.privacyDesc',
  },
  {
    id: 'preferences',
    labelKey: 'nav.preferences',
    href: '/app/profile/preferences',
    icon: Cog6ToothIcon,
    descriptionKey: 'nav.preferencesDesc',
  },
  {
    id: 'friends',
    labelKey: 'nav.friends',
    href: '/app/profile/friends',
    icon: UsersIcon,
    descriptionKey: 'nav.friendsDesc',
  },
  {
    id: 'organizations',
    labelKey: 'nav.organizations',
    href: '/app/profile/organizations',
    icon: BuildingOfficeIcon,
    descriptionKey: 'nav.organizationsDesc',
  },
  {
    id: 'activity',
    labelKey: 'nav.activity',
    href: '/app/profile/activity',
    icon: ClockIcon,
    descriptionKey: 'nav.activityDesc',
  },
];

interface ProfileNavigationProps {
  className?: string;
}

export function ProfileNavigation({ className }: ProfileNavigationProps) {
  const pathname = usePathname();
  const t = useTranslations('app.profile');

  const isActive = (href: string) => {
    if (href === '/app/profile') {
      return pathname === '/app/profile';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {/* Back to App */}
      <Link
        href="/app"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors mb-4"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {t('nav.backToApp')}
      </Link>

      {/* Navigation Items */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-primary')} />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile navigation for profile pages
 */
export function ProfileMobileNav() {
  const pathname = usePathname();
  const t = useTranslations('app.profile');

  const currentItem = navItems.find((item) => {
    if (item.href === '/app/profile') {
      return pathname === '/app/profile';
    }
    return pathname.startsWith(item.href);
  }) || navItems[0];

  const Icon = currentItem.icon;

  return (
    <div className="lg:hidden mb-6">
      {/* Current Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/app"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">
            {t(currentItem.labelKey)}
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          const active = pathname === item.href || 
            (item.href !== '/app/profile' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <ItemIcon className="h-4 w-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileNavigation;

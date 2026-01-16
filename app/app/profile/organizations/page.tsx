'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { createBrowserClient } from '@/lib/supabase/client';
import { ProfileService, type OrganizationMembership } from '@/lib/profile';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  CalendarIcon,
  ChevronRightIcon,
  PlusIcon,
  ShieldCheckIcon,
  CogIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const getRoleLabels = (t: (key: string) => string): Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> => ({
  owner: { label: t('sections.organizations.roles.owner'), variant: 'success' },
  admin: { label: t('sections.organizations.roles.admin'), variant: 'warning' },
  editor: { label: t('sections.organizations.roles.editor'), variant: 'default' },
  member: { label: t('sections.organizations.roles.member'), variant: 'secondary' },
});

const orgTypeIcons: Record<string, React.ElementType> = {
  school: AcademicCapIcon,
  company: BuildingOffice2Icon,
  team: UserGroupIcon,
  default: BuildingOffice2Icon,
};

export default function OrganizationsPage() {
  const t = useTranslations('app.profile');
  const { user } = useAuth();
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);
  const roleLabels = useMemo(() => getRoleLabels(t), [t]);

  // Initialize supabase client only in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createBrowserClient());
    }
  }, []);

  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMemberships = async () => {
      if (!user?.id || !supabase) return;

      setIsLoading(true);
      try {
        const profileService = new ProfileService(supabase);
        const profile = await profileService.getCompleteProfile(user.id);

        if (profile?.organizations) {
          setMemberships(profile.organizations);
        }
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemberships();
  }, [user?.id, supabase]);

  const ownedOrgs = memberships.filter((m) => m.role === 'owner');
  const adminOrgs = memberships.filter((m) => m.role === 'admin');
  const memberOrgs = memberships.filter((m) => m.role === 'member' || m.role === 'editor');

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BuildingOffice2Icon className="h-6 w-6 text-primary" />
            {t('sections.organizations.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('sections.organizations.description')}
          </p>
        </div>

        <Link href="/app/organizations/join">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('sections.organizations.joinOrg')}
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BuildingOffice2Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{memberships.length}</p>
                <p className="text-sm text-muted-foreground">{t('sections.organizations.stats.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{ownedOrgs.length + adminOrgs.length}</p>
                <p className="text-sm text-muted-foreground">{t('sections.organizations.stats.adminRoles')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserGroupIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {memberships.filter((m) => m.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('sections.organizations.stats.activeMemberships')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Organizations */}
      {memberships.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BuildingOffice2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('sections.organizations.noOrgs')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('sections.organizations.noOrgsDesc')}
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/app/organizations/join">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('sections.organizations.joinOrg')}
                  </Button>
                </Link>
                <Link href="/app/organizations/create">
                  <Button variant="outline">
                    {t('sections.organizations.createOrg')}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations I Own/Admin */}
      {(ownedOrgs.length > 0 || adminOrgs.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              {t('sections.organizations.managedOrgs.title')}
            </CardTitle>
            <CardDescription>
              {t('sections.organizations.managedOrgs.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...ownedOrgs, ...adminOrgs].map((membership) => {
              const OrgIcon = orgTypeIcons.default;
              const role = roleLabels[membership.role];

              return (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/app/organizations/${membership.tenant.slug}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {membership.tenant.logo_url ? (
                        <Image
                          src={membership.tenant.logo_url}
                          alt={membership.tenant.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <OrgIcon className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        {membership.tenant.name}
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {t('sections.organizations.joinedAt', { date: new Date(membership.created_at).toLocaleDateString('sv-SE') })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/organizations/${membership.tenant.slug}/settings`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <CogIcon className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Organizations I'm a Member Of */}
      {memberOrgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              {t('sections.organizations.memberships.title')}
            </CardTitle>
            <CardDescription>
              {t('sections.organizations.memberships.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberOrgs.map((membership) => {
              const OrgIcon = orgTypeIcons.default;
              const role = roleLabels[membership.role];

              return (
                <Link
                  key={membership.id}
                  href={`/app/organizations/${membership.tenant.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      {membership.tenant.logo_url ? (
                        <Image
                          src={membership.tenant.logo_url}
                          alt={membership.tenant.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <OrgIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        {membership.tenant.name}
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {t('sections.organizations.joinedAt', { date: new Date(membership.created_at).toLocaleDateString('sv-SE') })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.organizations.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/app/organizations/create">
              <Button variant="outline" className="w-full justify-start">
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('sections.organizations.createOrg')}
              </Button>
            </Link>
            <Link href="/app/organizations/join">
              <Button variant="outline" className="w-full justify-start">
                <UserGroupIcon className="h-4 w-4 mr-2" />
                {t('sections.organizations.joinViaCode')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { ProfileService, type OrganizationMembership } from '@/lib/profile';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase';
import { useProfileQuery } from '@/hooks/useProfileQuery';
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
  const { user, isLoading: authLoading } = useAuth();
  const { supabase, error: supabaseError, isInitializing } = useBrowserSupabase();
  const roleLabels = useMemo(() => getRoleLabels(t), [t]);

  // Create stable profileService instance
  const profileService = useMemo(
    () => (supabase ? new ProfileService(supabase) : null),
    [supabase]
  );

  // Use the new single-flight hook for fetching
  const {
    data: memberships,
    status,
    error: loadError,
    isLoading,
    isTimeout,
    retry,
  } = useProfileQuery<OrganizationMembership[]>(
    `organizations-${user?.id}`,
    async () => {
      if (!profileService || !user?.id) {
        throw new Error('Not ready');
      }
      return profileService.getOrganizationMemberships(user.id);
    },
    { userId: user?.id, profileService },
    {
      skip: authLoading || isInitializing || !supabase || !user?.id,
      timeout: 10000,
    }
  );

  const stillLoading = isLoading || authLoading || isInitializing;

  const membershipsList = memberships ?? [];

  const ownedOrgs = membershipsList.filter((m) => m.role === 'owner');
  const adminOrgs = membershipsList.filter((m) => m.role === 'admin');
  const memberOrgs = membershipsList.filter((m) => m.role === 'member' || m.role === 'editor');

  if (!authLoading && supabaseError) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="error" title="Kunde inte ladda organisationer">
          <p>Det gick inte att initiera anslutningen till databasen.</p>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs text-foreground">
              {supabaseError.message}
            </pre>
          )}
        </Alert>
        <Button onClick={() => window.location.reload()} variant="outline">
          Ladda om
        </Button>
      </div>
    );
  }

  if (stillLoading) {
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
        {isTimeout && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-muted-foreground">
              Det här tar ovanligt lång tid. Kolla Console/Network för vilken request som fastnat och prova att ladda om sidan.
            </p>
            <div className="flex gap-2">
              <Button onClick={retry} variant="outline" size="sm">
                Försök igen
              </Button>
              <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
                Ladda om
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === 'error' || status === 'timeout') {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="error" title="Kunde inte ladda organisationer">
          <p>{loadError || 'Ett oväntat fel inträffade.'}</p>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={retry} variant="outline">
            Försök igen
          </Button>
          <Button onClick={() => window.location.reload()} variant="ghost">
            Ladda om
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BuildingOffice2Icon className="h-6 w-6 text-primary" />
          {t('sections.organizations.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('sections.organizations.description')}
        </p>
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
                <p className="text-2xl font-bold text-foreground">{membershipsList.length}</p>
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
                  {membershipsList.filter((m) => m.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">{t('sections.organizations.stats.activeMemberships')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Organizations */}
      {membershipsList.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BuildingOffice2Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('sections.organizations.noOrgs')}
              </h3>
              <p className="text-muted-foreground">
                {t('sections.organizations.noOrgsDesc')}
              </p>
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
    </div>
  );
}

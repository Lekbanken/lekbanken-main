'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDate } from '@/lib/i18n/format-utils';
import {
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input, Select } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { TenantDomain } from "../../types";

type OrganisationDomainsSectionProps = {
  tenantId: string;
  domains: TenantDomain[];
  slug: string | null;
  onRefresh: () => void;
  expanded?: boolean;
};

const statusConfig: Record<TenantDomain['status'], { label: string; icon: typeof CheckCircleIcon; color: string }> = {
  active: { label: 'Aktiv', icon: CheckCircleIcon, color: 'text-emerald-600' },
  pending: { label: 'Väntar', icon: ClockIcon, color: 'text-amber-600' },
  suspended: { label: 'Avstängd', icon: ExclamationCircleIcon, color: 'text-red-600' },
};

export function OrganisationDomainsSection({
  tenantId,
  domains,
  slug,
  onRefresh,
  expanded = false,
}: OrganisationDomainsSectionProps) {
  const t = useTranslations('admin.organisations.domains');
  const { success, error: toastError } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [newKind, setNewKind] = useState<'subdomain' | 'custom'>('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDomain = async () => {
    if (!newHostname.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          hostname: newHostname.toLowerCase().trim(),
          kind: newKind,
          status: 'pending',
        });
      
      if (error) throw error;
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'domain_added',
        payload: { hostname: newHostname },
      });
      
      success('Domän tillagd');
      setIsAddDialogOpen(false);
      setNewHostname('');
      onRefresh();
    } catch (err) {
      toastError('Kunde inte lägga till domän');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDomain = async (domain: TenantDomain) => {
    if (!confirm(`Är du säker på att du vill ta bort ${domain.hostname}?`)) return;
    
    try {
      const { error } = await supabase
        .from('tenant_domains')
        .delete()
        .eq('id', domain.id);
      
      if (error) throw error;
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'domain_removed',
        payload: { hostname: domain.hostname },
      });
      
      success('Domän borttagen');
      onRefresh();
    } catch (err) {
      toastError('Kunde inte ta bort domän');
      console.error(err);
    }
  };

  const handleStatusChange = async (domain: TenantDomain, newStatus: TenantDomain['status']) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'active' && !domain.verifiedAt) {
        updates.verified_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('tenant_domains')
        .update(updates)
        .eq('id', domain.id);
      
      if (error) throw error;
      
      // Log audit event
      await supabase.from('tenant_audit_logs').insert({
        tenant_id: tenantId,
        event_type: 'domain_status_changed',
        payload: { hostname: domain.hostname, from: domain.status, to: newStatus },
      });
      
      success('Status uppdaterad');
      onRefresh();
    } catch (err) {
      toastError('Kunde inte uppdatera status');
      console.error(err);
    }
  };

  const platformDomain = slug ? `${slug}.lekbanken.no` : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <GlobeAltIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-1" />
          {t('add')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform subdomain info */}
        {platformDomain && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/40">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">{platformDomain}</p>
                <p className="text-xs text-muted-foreground">{t('platformDomain')}</p>
              </div>
            </div>
            <a
              href={`https://${platformDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Custom domains list */}
        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('noCustomDomain')}
          </p>
        ) : (
          <div className="space-y-2">
            {domains.map((domain) => {
              const config = statusConfig[domain.status];
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <p className="text-sm font-medium">{domain.hostname}</p>
                      <p className="text-xs text-muted-foreground">
                        {domain.kind === 'custom' ? 'Egen domän' : 'Subdomän'}
                        {domain.verifiedAt && ` • Verifierad ${formatDate(domain.verifiedAt)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {expanded && (
                      <Select
                        value={domain.status}
                        onChange={(e) => handleStatusChange(domain, e.target.value as TenantDomain['status'])}
                        options={[
                          { value: 'pending', label: 'Väntar' },
                          { value: 'active', label: 'Aktiv' },
                          { value: 'suspended', label: 'Avstängd' },
                        ]}
                        className="w-32"
                      />
                    )}
                    <a
                      href={`https://${domain.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDomain(domain)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline how-to guide */}
        {expanded && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
              📖 {t('howToTitle')}
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>{t('step1')}<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">example.com → cname.vercel-dns.com</code></li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
              <li>{t('step4')}</li>
            </ol>
          </div>
        )}
      </CardContent>

      {/* Add Domain Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addDomainTitle')}</DialogTitle>
            <DialogDescription>
              {t('addDomainDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Hostname</label>
              <Input
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
                placeholder="app.example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Typ</label>
              <Select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as 'subdomain' | 'custom')}
                options={[
                  { value: 'custom', label: 'Egen domän (CNAME)' },
                  { value: 'subdomain', label: 'Subdomän av lekbanken.no' },
                ]}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAddDomain} disabled={isSubmitting || !newHostname.trim()}>
              {isSubmitting ? 'Lägger till...' : 'Lägg till'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

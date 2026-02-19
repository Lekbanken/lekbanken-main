'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminDataTable,
  AdminTableToolbar,
  AdminPagination,
} from '@/components/admin/shared';
import { Button, Badge, EmptyState, Select } from '@/components/ui';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// Status values mirror backend invoices table
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled';

export interface Invoice {
  id: string;
  name: string;
  amount_total: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  invoice_number: string | null;
  stripe_invoice_id: string | null;
  notes: string | null;
}

interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  outstanding: number;
}

type StatusFilter = 'all' | InvoiceStatus;

type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

interface Payment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
  paid: <CheckCircleIcon className="h-4 w-4" />,
  sent: <ClockIcon className="h-4 w-4" />,
  issued: <DocumentTextIcon className="h-4 w-4" />,
  overdue: <ExclamationTriangleIcon className="h-4 w-4" />,
  draft: <DocumentTextIcon className="h-4 w-4" />,
  canceled: <ExclamationTriangleIcon className="h-4 w-4" />,
};

const statusVariants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  sent: 'secondary',
  issued: 'secondary',
  overdue: 'destructive',
  draft: 'outline',
  canceled: 'outline',
};

export default function InvoicesPage() {
  const t = useTranslations('admin.billing.invoices');
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const statusConfig = useMemo(() => ({
    paid: { label: t('status.paid'), variant: statusVariants.paid, icon: statusIcons.paid },
    sent: { label: t('status.sent'), variant: statusVariants.sent, icon: statusIcons.sent },
    issued: { label: t('status.issued'), variant: statusVariants.issued, icon: statusIcons.issued },
    overdue: { label: t('status.overdue'), variant: statusVariants.overdue, icon: statusIcons.overdue },
    draft: { label: t('status.draft'), variant: statusVariants.draft, icon: statusIcons.draft },
    canceled: { label: t('status.canceled'), variant: statusVariants.canceled, icon: statusIcons.canceled },
  }), [t]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({ name: '', amount: '', provider: '', reference: '' });

  const calculateStats = useMemo(
    () => (list: Invoice[]): InvoiceStats => {
      const paid = list.filter((i) => i.status === 'paid');
      const overdue = list.filter((i) => i.status === 'overdue');
      const pendingStatuses: InvoiceStatus[] = ['sent', 'issued', 'draft'];
      const pending = list.filter((i) => pendingStatuses.includes(i.status));
      return {
        total: list.length,
        paid: paid.length,
        pending: pending.length,
        overdue: overdue.length,
        totalRevenue: paid.reduce((sum, i) => sum + (i.amount_total || 0), 0),
        outstanding: [...pending, ...overdue].reduce((sum, i) => sum + (i.amount_total || 0), 0),
      };
    },
    []
  );

  async function fetchInvoices() {
    if (!currentTenant) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices`);
      if (!res.ok) throw new Error('Failed to load invoices');
      const json = await res.json();
      const list: Invoice[] = json.invoices ?? [];
      setInvoices(list);
      setStats(calculateStats(list));
    } catch (err) {
      console.error('Error loading invoices:', err);
      setInvoices([]);
      setStats({ total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, outstanding: 0 });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id]);

  useEffect(() => {
    if (selectedInvoiceId) {
      void fetchPayments(selectedInvoiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoiceId]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!invoice.name.toLowerCase().includes(query) && !(invoice.invoice_number || '').toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownload = (invoice: Invoice) => {
    if (invoice.invoice_number) {
      alert(`Laddar ner faktura ${invoice.invoice_number} (simulerat).`);
    } else {
      alert('Ingen PDF kopplad ännu.');
    }
  };

  const fetchPayments = async (invoiceId: string) => {
    if (!currentTenant) return;
    setIsLoadingPayments(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices/${invoiceId}/payments`);
      if (!res.ok) throw new Error('Failed to load payments');
      const json = await res.json();
      setPayments(json.payments ?? []);
    } catch (err) {
      console.error('Error loading payments:', err);
      setPaymentError('Kunde inte ladda betalningar');
      setPayments([]);
    }
    setIsLoadingPayments(false);
  };

  const handleSelectInvoicePayments = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleUpdatePaymentStatus = async (paymentId: string, status: PaymentStatus) => {
    if (!currentTenant || !selectedInvoiceId) return;
    try {
      const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices/${selectedInvoiceId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update payment');
      await fetchPayments(selectedInvoiceId);
    } catch (err) {
      console.error('Error updating payment:', err);
      setPaymentError('Kunde inte uppdatera betalning');
    }
  };

  const handleCreatePayment = async () => {
    if (!currentTenant || !selectedInvoiceId) return;
    if (!newPayment.name || !newPayment.amount) {
      alert('Ange namn och belopp');
      return;
    }
    const amount = parseFloat(newPayment.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Ogiltigt belopp');
      return;
    }
    try {
      const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices/${selectedInvoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPayment.name,
          amount,
          provider: newPayment.provider || null,
          transaction_reference: newPayment.reference || null,
          status: 'pending',
        }),
      });
      if (!res.ok) throw new Error('Failed to create payment');
      setNewPayment({ name: '', amount: '', provider: '', reference: '' });
      await fetchPayments(selectedInvoiceId);
      await fetchInvoices();
    } catch (err) {
      console.error('Error creating payment:', err);
      setPaymentError('Kunde inte skapa betalning');
    }
  };

  const handleCreateStripeInvoice = async () => {
    if (!currentTenant) return;
    const name = prompt('Titel (t.ex. Lekbanken abonnemang)');
    const amountStr = prompt('Belopp (t.ex. 499.00)');
      const due = prompt('Förfallodatum (YYYY-MM-DD, valfritt)');
    if (!name || !amountStr) return;
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Ogiltigt belopp');
      return;
    }
    const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, due_date: due && due.trim().length > 0 ? due : undefined }),
    });
    if (!res.ok) {
      alert('Misslyckades att skapa Stripe-faktura');
      return;
    }
    await fetchInvoices();
  };

  const handleCreateManualInvoice = async () => {
    if (!currentTenant) return;
    const name = prompt('Titel (ex. Manuell faktura)');
    const amountStr = prompt('Belopp (t.ex. 499.00)');
      const due = prompt('Förfallodatum (YYYY-MM-DD, valfritt)');
    if (!name || !amountStr) return;
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Ogiltigt belopp');
      return;
    }
    const res = await fetch(`/api/billing/tenants/${currentTenant.id}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount, due_date: due && due.trim().length > 0 ? due : undefined }),
    });
    if (!res.ok) {
      alert('Misslyckades att skapa manuell faktura');
      return;
    }
    await fetchInvoices();
  };

  const handleEnsureStripeCustomer = async () => {
    if (!currentTenant) return;
    const name = prompt('Kundnamn (valfritt)');
    const email = prompt('Fakturamejl (valfritt)');
    const res = await fetch(`/api/billing/tenants/${currentTenant.id}/stripe-customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || undefined, email: email || undefined }),
    });
    if (!res.ok) {
      alert('Misslyckades att skapa/hämta Stripe-kund');
      return;
    }
    const json = await res.json();
    alert(`Stripe customer: ${json.customer_id}`);
  };

  const columns = [
    {
      header: t('table.invoice'),
      accessor: (row: Invoice) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.invoice_number ?? ''}</p>
        </div>
      ),
    },
    {
      header: t('table.status'),
      accessor: (row: Invoice) => {
        const config = statusConfig[row.status];
        return (
          <Badge variant={config.variant} size="sm" className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: t('table.amount'),
      accessor: (row: Invoice) => (
        <span className="font-medium">
          {(row.amount_total ?? 0).toLocaleString('sv-SE')} {row.currency}
        </span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: t('table.dueDate'),
      accessor: (row: Invoice) => {
        const isOverdue = row.status === 'overdue';
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {new Date(row.due_date).toLocaleDateString('sv-SE')}
          </span>
        );
      },
      hideBelow: 'md' as const,
    },
    {
      header: '',
      accessor: (row: Invoice) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row);
            }}
            title={t('downloadPdf')}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectInvoicePayments(row.id);
            }}
          >
            {t('table.payments')}
          </Button>
        </div>
      ),
      align: 'right' as const,
      width: 'w-16',
    },
  ];

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">{t('notLoggedIn')}</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.billing'), href: '/admin/billing' },
          { label: t('breadcrumbs.invoices') },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEnsureStripeCustomer}>
              {t('buttons.createStripeCustomer')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateManualInvoice}>
              {t('buttons.manualInvoice')}
            </Button>
            <Button size="sm" onClick={handleCreateStripeInvoice}>
              {t('buttons.sendViaStripe')}
            </Button>
          </div>
        }
      />

      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label={t('stats.totalRevenue')}
          value={stats ? `${stats.totalRevenue.toLocaleString('sv-SE')} SEK` : '-'}
          icon={<span className="text-base">💰</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.outstanding')}
          value={stats ? `${stats.outstanding.toLocaleString('sv-SE')} SEK` : '-'}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.paid')}
          value={stats?.paid ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label={t('stats.overdue')}
          value={stats?.overdue ?? 0}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconColor="red"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      <AdminTableToolbar
        searchPlaceholder={t('search')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'all', label: t('filter.all') },
              { value: 'paid', label: t('filter.paid') },
              { value: 'sent', label: t('filter.sent') },
              { value: 'issued', label: t('filter.issued') },
              { value: 'overdue', label: t('filter.overdue') },
              { value: 'draft', label: t('filter.draft') },
              { value: 'canceled', label: t('filter.canceled') },
            ]}
          />
        }
      />

      <AdminDataTable
        data={paginatedInvoices}
        columns={columns}
        keyAccessor="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<DocumentTextIcon className="h-8 w-8" />}
            title={t('emptyTitle')}
            description={searchQuery ? t('noResultsFor', { query: searchQuery }) : t('emptyDescription')}
            action={searchQuery ? { label: t('clearSearch'), onClick: () => setSearchQuery('') } : undefined}
          />
        }
        className="mb-4"
      />

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredInvoices.length}
        itemsPerPage={itemsPerPage}
      />

      {selectedInvoiceId && (
        <div className="mt-6 space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('paymentsForInvoice')}</p>
              <p className="font-semibold">{selectedInvoiceId}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoiceId(null)}>
              {t('close')}
            </Button>
          </div>

          {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}

          <div className="grid gap-3">
            {isLoadingPayments ? (
              <p className="text-sm text-muted-foreground">{t('loadingPayments')}</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noPaymentsRegistered')}</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.amount.toLocaleString('sv-SE')} {p.currency} · {p.provider || t('unknownProvider')}</p>
                    {p.transaction_reference && (
                      <p className="text-xs text-muted-foreground">{t('paymentRef', { reference: p.transaction_reference })}</p>
                    )}
                    {p.paid_at && (
                      <p className="text-xs text-muted-foreground">{t('paidAt', { date: new Date(p.paid_at).toLocaleString('sv-SE') })}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={p.status}
                      onChange={(e) => handleUpdatePaymentStatus(p.id, e.target.value as PaymentStatus)}
                      options={[
                        { value: 'pending', label: t('paymentStatus.pending') },
                        { value: 'confirmed', label: t('paymentStatus.confirmed') },
                        { value: 'failed', label: t('paymentStatus.failed') },
                        { value: 'refunded', label: t('paymentStatus.refunded') },
                      ]}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleUpdatePaymentStatus(p.id, 'confirmed')}>
                      {t('markAsPaid')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-md border border-dashed border-border p-3">
            <p className="mb-3 font-semibold">{t('addPayment')}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="payment-name" className="text-sm font-medium">{t('form.name')}</label>
                <input
                  id="payment-name"
                  value={newPayment.name}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t('form.namePlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-amount" className="text-sm font-medium">{t('form.amount')}</label>
                <input
                  id="payment-amount"
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder={t('form.amountPlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-provider" className="text-sm font-medium">{t('form.provider')}</label>
                <input
                  id="payment-provider"
                  value={newPayment.provider}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, provider: e.target.value }))}
                  placeholder={t('form.providerPlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="payment-ref" className="text-sm font-medium">{t('form.reference')}</label>
                <input
                  id="payment-ref"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder={t('form.referencePlaceholder')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={handleCreatePayment}>{t('savePayment')}</Button>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}

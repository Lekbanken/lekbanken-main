'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminDataTable,
  AdminTableToolbar,
  AdminPagination,
} from '@/components/admin/shared';
import { Button, Badge, EmptyState } from '@/components/ui';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// Types
interface Invoice {
  id: string;
  invoiceNumber: string;
  organisationId: string;
  organisationName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft' | 'void';
  dueDate: string;
  paidDate: string | null;
  description: string;
}

interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalRevenue: number;
  outstanding: number;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue' | 'draft' | 'void';

// Mock data generator
function generateMockInvoices(): Invoice[] {
  const orgs = [
    'Stockholms Skolor', 'Göteborgs Fritid', 'Malmö Förskolor', 'Uppsala Kommun',
    'Lunds Aktiviteter', 'Västerås Barn', 'Örebro Fritid', 'Linköpings Skolor',
    'Helsingborgs Skolor', 'Norrköpings Kommun', 'Jönköpings Fritid', 'Umeå Skolor',
  ];

  const statuses: Invoice['status'][] = ['paid', 'paid', 'paid', 'paid', 'pending', 'pending', 'overdue'];
  const amounts = [990, 2490, 4990, 1490, 2990, 7490];

  return orgs.map((org, i) => {
    const status = statuses[i % statuses.length];
    const amount = amounts[i % amounts.length];
    const dueDate = new Date(Date.now() + (status === 'overdue' ? -7 : 14) * 24 * 60 * 60 * 1000);
    const paidDate = status === 'paid' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null;

    return {
      id: `inv-${i}`,
      invoiceNumber: `LB-2024-${String(1000 + i).padStart(4, '0')}`,
      organisationId: `org-${i}`,
      organisationName: org,
      amount,
      currency: 'SEK',
      status,
      dueDate: dueDate.toISOString(),
      paidDate: paidDate?.toISOString() ?? null,
      description: `Lekbanken prenumeration - ${['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni'][i % 6]} 2024`,
    };
  });
}

function calculateStats(invoices: Invoice[]): InvoiceStats {
  const paid = invoices.filter(i => i.status === 'paid');
  const pending = invoices.filter(i => i.status === 'pending');
  const overdue = invoices.filter(i => i.status === 'overdue');
  
  return {
    total: invoices.length,
    paid: paid.length,
    pending: pending.length,
    overdue: overdue.length,
    totalRevenue: paid.reduce((sum, i) => sum + i.amount, 0),
    outstanding: [...pending, ...overdue].reduce((sum, i) => sum + i.amount, 0),
  };
}

const statusConfig: Record<Invoice['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  paid: { label: 'Betald', variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  pending: { label: 'Väntande', variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  overdue: { label: 'Förfallen', variant: 'destructive', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  draft: { label: 'Utkast', variant: 'outline', icon: <DocumentTextIcon className="h-4 w-4" /> },
  void: { label: 'Makulerad', variant: 'outline', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
};

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Try to load from Supabase
      try {
        if (currentTenant) {
          const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('tenant_id', currentTenant.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (data && data.length > 0) {
            console.log('Loaded invoices from Supabase:', data.length);
          }
        }
      } catch (err) {
        console.error('Error loading invoices:', err);
      }

      // Fall back to mock data
      const mockData = generateMockInvoices();
      setInvoices(mockData);
      setStats(calculateStats(mockData));
      setIsLoading(false);
    };

    loadData();
  }, [currentTenant]);

  // Filter data
  const filteredInvoices = invoices.filter((invoice) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!invoice.organisationName.toLowerCase().includes(query) &&
          !invoice.invoiceNumber.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownload = (invoice: Invoice) => {
    // In production, this would generate/download a PDF
    alert(`Laddar ner faktura ${invoice.invoiceNumber}...`);
  };

  // Table columns
  const columns = [
    {
      header: 'Fakturanummer',
      accessor: (row: Invoice) => (
        <div>
          <p className="font-medium text-foreground">{row.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">{row.organisationName}</p>
        </div>
      ),
    },
    {
      header: 'Beskrivning',
      accessor: (row: Invoice) => (
        <span className="text-sm text-muted-foreground">{row.description}</span>
      ),
      hideBelow: 'lg' as const,
    },
    {
      header: 'Status',
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
      header: 'Belopp',
      accessor: (row: Invoice) => (
        <span className="font-medium">
          {row.amount.toLocaleString('sv-SE')} {row.currency}
        </span>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: 'Förfallodatum',
      accessor: (row: Invoice) => {
        const isOverdue = row.status === 'overdue';
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {new Date(row.dueDate).toLocaleDateString('sv-SE')}
          </span>
        );
      },
      hideBelow: 'md' as const,
    },
    {
      header: '',
      accessor: (row: Invoice) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleDownload(row); }}
          title="Ladda ner PDF"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
        </Button>
      ),
      align: 'right' as const,
      width: 'w-16',
    },
  ];

  if (!user) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Fakturor"
        description="Visa och hantera fakturor och betalningar"
        icon={<DocumentTextIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Fakturering', href: '/admin/billing' },
          { label: 'Fakturor' },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/billing')} className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt intäkter"
          value={stats ? `${stats.totalRevenue.toLocaleString('sv-SE')} SEK` : '-'}
          icon={<span className="text-base">💰</span>}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Utestående"
          value={stats ? `${stats.outstanding.toLocaleString('sv-SE')} SEK` : '-'}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Betalda"
          value={stats?.paid ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Förfallna"
          value={stats?.overdue ?? 0}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconColor="red"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filters */}
      <AdminTableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Sök fakturanummer eller organisation..."
        className="mb-4"
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Alla statusar</option>
            <option value="paid">Betalda</option>
            <option value="pending">Väntande</option>
            <option value="overdue">Förfallna</option>
            <option value="draft">Utkast</option>
            <option value="void">Makulerade</option>
          </select>
        }
      />

      {/* Table */}
      <AdminDataTable
        data={paginatedInvoices}
        columns={columns}
        keyAccessor="id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<DocumentTextIcon className="h-8 w-8" />}
            title="Inga fakturor"
            description={searchQuery ? `Inga resultat för "${searchQuery}"` : 'Det finns inga fakturor att visa.'}
            action={searchQuery ? { label: 'Rensa sökning', onClick: () => setSearchQuery('') } : undefined}
          />
        }
        className="mb-4"
      />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredInvoices.length}
        itemsPerPage={itemsPerPage}
      />
    </AdminPageLayout>
  );
}

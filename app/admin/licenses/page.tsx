'use client';

import { useEffect, useState } from 'react';
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
import {
  Button,
  Badge,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from '@/components/ui';
import {
  KeyIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// Types
interface License {
  id: string;
  organisationId: string;
  organisationName: string;
  product: string;
  plan: string;
  status: 'active' | 'expired' | 'trial' | 'suspended';
  seats: number;
  usedSeats: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  trial: number;
  totalSeats: number;
  usedSeats: number;
}

type StatusFilter = 'all' | 'active' | 'expired' | 'trial' | 'suspended';
type ProductFilter = 'all' | 'basic' | 'pro' | 'enterprise';

// Mock data
function generateMockLicenses(): License[] {
  const orgs = [
    { id: 'org-1', name: 'Stockholms Skolor' },
    { id: 'org-2', name: 'Göteborgs Fritid' },
    { id: 'org-3', name: 'Malmö Förskolor' },
    { id: 'org-4', name: 'Uppsala Kommun' },
    { id: 'org-5', name: 'Lunds Aktiviteter' },
    { id: 'org-6', name: 'Västerås Barn' },
    { id: 'org-7', name: 'Örebro Fritid' },
    { id: 'org-8', name: 'Linköpings Skolor' },
  ];

  const products = ['Lekbanken Basic', 'Lekbanken Pro', 'Lekbanken Enterprise'];
  const plans = ['Månadsvis', 'Årsvis', 'Flerårsavtal'];
  const statuses: License['status'][] = ['active', 'active', 'active', 'trial', 'expired', 'suspended'];

  return orgs.map((org, i) => {
    const status = statuses[i % statuses.length];
    const seats = [25, 50, 100, 250][i % 4];
    const usedSeats = Math.floor(seats * (0.3 + Math.random() * 0.6));
    const startDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    return {
      id: `license-${i}`,
      organisationId: org.id,
      organisationName: org.name,
      product: products[i % products.length],
      plan: plans[i % plans.length],
      status,
      seats,
      usedSeats,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: status === 'active' && Math.random() > 0.3,
    };
  });
}

function calculateStats(licenses: License[]): LicenseStats {
  return {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    trial: licenses.filter(l => l.status === 'trial').length,
    totalSeats: licenses.reduce((sum, l) => sum + l.seats, 0),
    usedSeats: licenses.reduce((sum, l) => sum + l.usedSeats, 0),
  };
}

const statusConfig: Record<License['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  active: { label: 'Aktiv', variant: 'default', icon: <CheckCircleIcon className="h-4 w-4" /> },
  trial: { label: 'Testperiod', variant: 'secondary', icon: <ClockIcon className="h-4 w-4" /> },
  expired: { label: 'Utgången', variant: 'destructive', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  suspended: { label: 'Pausad', variant: 'outline', icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
};

export default function LicensesPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // State
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Try to load from Supabase
      try {
        if (currentTenant) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('id, name, subscription_tier, subscription_status, created_at')
            .limit(50);

          if (tenantData && tenantData.length > 0) {
            const mappedLicenses: License[] = tenantData.map((t) => ({
              id: t.id,
              organisationId: t.id,
              organisationName: t.name,
              product: `Lekbanken ${t.subscription_tier || 'Basic'}`,
              plan: 'Årsvis',
              status: (t.subscription_status === 'active' ? 'active' : 'expired') as License['status'],
              seats: 50,
              usedSeats: Math.floor(Math.random() * 40) + 5,
              startDate: t.created_at,
              endDate: new Date(new Date(t.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              autoRenew: true,
            }));
            setLicenses(mappedLicenses);
            setStats(calculateStats(mappedLicenses));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading licenses from Supabase:', err);
      }

      // Fall back to mock data
      const mockData = generateMockLicenses();
      setLicenses(mockData);
      setStats(calculateStats(mockData));
      setIsLoading(false);
    };

    loadData();
  }, [currentTenant]);

  // Filter data
  const filteredLicenses = licenses.filter((license) => {
    if (searchQuery && !license.organisationName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && license.status !== statusFilter) return false;
    if (productFilter !== 'all') {
      const productMap: Record<string, string> = {
        basic: 'Basic',
        pro: 'Pro',
        enterprise: 'Enterprise',
      };
      if (!license.product.includes(productMap[productFilter])) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLicenses.length / itemsPerPage);
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleView = (license: License) => {
    setSelectedLicense(license);
    setIsViewModalOpen(true);
  };

  const handleEdit = (license: License) => {
    setSelectedLicense(license);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    // In real implementation, save to Supabase
    setIsEditModalOpen(false);
    setSelectedLicense(null);
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  // Table columns
  const columns = [
    {
      header: 'Organisation',
      accessor: (row: License) => (
        <div>
          <p className="font-medium text-foreground">{row.organisationName}</p>
          <p className="text-xs text-muted-foreground">{row.product}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      accessor: (row: License) => row.plan,
      hideBelow: 'md' as const,
    },
    {
      header: 'Status',
      accessor: (row: License) => {
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
      header: 'Platser',
      accessor: (row: License) => (
        <div className="text-right">
          <span className="font-medium">{row.usedSeats}</span>
          <span className="text-muted-foreground"> / {row.seats}</span>
        </div>
      ),
      align: 'right' as const,
      hideBelow: 'sm' as const,
    },
    {
      header: 'Giltig t.o.m.',
      accessor: (row: License) => new Date(row.endDate).toLocaleDateString('sv-SE'),
      hideBelow: 'lg' as const,
    },
    {
      header: 'Åtgärder',
      accessor: (row: License) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(row); }}>
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
      align: 'right' as const,
      width: 'w-24',
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
        title="Licenser"
        description="Hantera licensavtal och prenumerationer"
        icon={<KeyIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Licenser' },
        ]}
        actions={
          <Button onClick={handleCreate} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Ny licens
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt licenser"
          value={stats?.total ?? 0}
          icon={<KeyIcon className="h-5 w-5" />}
          iconColor="primary"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Aktiva"
          value={stats?.active ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Testperiod"
          value={stats?.trial ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Platser (använt/totalt)"
          value={`${stats?.usedSeats ?? 0} / ${stats?.totalSeats ?? 0}`}
          icon={<span className="text-base">👥</span>}
          iconColor="blue"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filters */}
      <AdminTableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Sök organisation..."
        className="mb-4"
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Alla statusar</option>
              <option value="active">Aktiva</option>
              <option value="trial">Testperiod</option>
              <option value="expired">Utgångna</option>
              <option value="suspended">Pausade</option>
            </select>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value as ProductFilter)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Alla produkter</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </>
        }
      />

      {/* Table */}
      <AdminDataTable
        data={paginatedLicenses}
        columns={columns}
        keyAccessor="id"
        isLoading={isLoading}
        onRowClick={handleView}
        emptyState={
          <EmptyState
            icon={<KeyIcon className="h-8 w-8" />}
            title="Inga licenser"
            description={searchQuery ? `Inga resultat för "${searchQuery}"` : 'Det finns inga licenser att visa.'}
            action={searchQuery ? { label: 'Rensa sökning', onClick: () => setSearchQuery('') } : { label: 'Skapa licens', onClick: handleCreate }}
          />
        }
        className="mb-4"
      />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredLicenses.length}
        itemsPerPage={itemsPerPage}
      />

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Licensdetaljer</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Organisation</p>
                  <p className="font-medium">{selectedLicense.organisationName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedLicense.status].variant}>
                    {statusConfig[selectedLicense.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Produkt</p>
                  <p className="font-medium">{selectedLicense.product}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium">{selectedLicense.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platser</p>
                  <p className="font-medium">{selectedLicense.usedSeats} / {selectedLicense.seats}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auto-förnyelse</p>
                  <p className="font-medium">{selectedLicense.autoRenew ? 'Ja' : 'Nej'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Startdatum</p>
                  <p className="font-medium">{new Date(selectedLicense.startDate).toLocaleDateString('sv-SE')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slutdatum</p>
                  <p className="font-medium">{new Date(selectedLicense.endDate).toLocaleDateString('sv-SE')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Stäng</Button>
            <Button onClick={() => { setIsViewModalOpen(false); handleEdit(selectedLicense!); }}>Redigera</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera licens</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Organisation</label>
                <Input value={selectedLicense.organisationName} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Antal platser</label>
                <Input type="number" defaultValue={selectedLicense.seats} />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  defaultValue={selectedLicense.status}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Aktiv</option>
                  <option value="trial">Testperiod</option>
                  <option value="suspended">Pausad</option>
                  <option value="expired">Utgången</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Avbryt</Button>
            <Button onClick={handleSaveEdit}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa ny licens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organisation</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Välj organisation...</option>
                <option value="org-1">Stockholms Skolor</option>
                <option value="org-2">Göteborgs Fritid</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Produkt</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="basic">Lekbanken Basic</option>
                <option value="pro">Lekbanken Pro</option>
                <option value="enterprise">Lekbanken Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="monthly">Månadsvis</option>
                <option value="yearly">Årsvis</option>
                <option value="multi">Flerårsavtal</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Antal platser</label>
              <Input type="number" defaultValue={25} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Avbryt</Button>
            <Button onClick={() => setIsCreateModalOpen(false)}>Skapa licens</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}

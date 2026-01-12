'use client';

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import {
  CubeIcon,
  KeyIcon,
  FolderIcon,
  PlusIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  EmptyState,
  useToast,
  Tabs,
  TabPanel,
} from "@/components/ui";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";

// Tab components
import { ProductsTab, LicensesTab, PurposesTab } from "./components/hub";

export type ProductHubTab = "products" | "licenses" | "purposes";

export type ProductHubStats = {
  totalProducts: number;
  activeProducts: number;
  totalLicenses: number;
  activeLicenses: number;
  totalPurposes: number;
  mainPurposes: number;
};

const defaultStats: ProductHubStats = {
  totalProducts: 0,
  activeProducts: 0,
  totalLicenses: 0,
  activeLicenses: 0,
  totalPurposes: 0,
  mainPurposes: 0,
};

export function ProductHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin.products');
  const { can, isLoading: rbacLoading } = useRbac();
  const _toast = useToast(); // Reserved for future toast notifications

  // Get initial tab from URL or default to "products"
  const tabFromUrl = searchParams.get("tab") as ProductHubTab | null;
  const [activeTab, setActiveTab] = useState<ProductHubTab>(
    tabFromUrl && ["products", "licenses", "purposes"].includes(tabFromUrl)
      ? tabFromUrl
      : "products"
  );

  const [stats, setStats] = useState<ProductHubStats>(defaultStats);
  const [_isLoadingStats, setIsLoadingStats] = useState(true);

  const canViewProducts = can("admin.products.list");
  const canCreateProduct = can("admin.products.create");

  // Sync tab with URL
  useEffect(() => {
    const newTab = searchParams.get("tab") as ProductHubTab | null;
    if (newTab && ["products", "licenses", "purposes"].includes(newTab)) {
      setActiveTab(newTab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    const tab = value as ProductHubTab;
    setActiveTab(tab);
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "products") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const newUrl = params.toString() ? `/admin/products?${params.toString()}` : "/admin/products";
    router.replace(newUrl, { scroll: false });
  };

  // Load stats from all three domains
  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const [productsRes, purposesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/purposes"),
        ]);

        let totalProducts = 0;
        let activeProducts = 0;
        let totalPurposes = 0;
        let mainPurposes = 0;

        if (productsRes.ok) {
          const data = await productsRes.json();
          const products = data.products || [];
          totalProducts = products.length;
          activeProducts = products.filter((p: { status: string }) => p.status === "active").length;
        }

        if (purposesRes.ok) {
          const data = await purposesRes.json();
          const purposes = data.purposes || [];
          totalPurposes = purposes.length;
          mainPurposes = purposes.filter((p: { type: string }) => p.type === "main").length;
        }

        // TODO: Load licenses from appropriate API when available
        const totalLicenses = 0;
        const activeLicenses = 0;

        if (isMounted) {
          setStats({
            totalProducts,
            activeProducts,
            totalLicenses,
            activeLicenses,
            totalPurposes,
            mainPurposes,
          });
        }
      } catch (err) {
        console.error("Failed to load product hub stats", err);
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
        }
      }
    };

    void loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  if (rbacLoading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: t('breadcrumbs.admin'), href: "/admin" }, { label: t('title') }]} />
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
          </div>
        </div>
      </AdminPageLayout>
    );
  }

  if (!canViewProducts) {
    return (
      <AdminPageLayout>
        <EmptyState
          title={t('accessDenied')}
          description={t('noPermissionProducts')}
          action={{ label: t('goToDashboard'), onClick: () => router.push("/admin") }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: "/admin" },
          { label: t('breadcrumbs.productsAndContent') },
          { label: t('breadcrumbs.products') },
        ]}
      />

      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<CubeIcon className="h-6 w-6" />}
        actions={
          canCreateProduct && (
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              {t('createProduct')}
            </Button>
          )
        }
      />

      {/* Summary Stats */}
      <AdminStatGrid cols={5} className="mb-6">
        <AdminStatCard
          label={t('stats.products')}
          value={stats.totalProducts}
          icon={<CubeIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label={t('stats.activeProducts')}
          value={stats.activeProducts}
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label={t('stats.licenses')}
          value={stats.totalLicenses}
          icon={<KeyIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label={t('stats.purposes')}
          value={stats.totalPurposes}
          icon={<FolderIcon className="h-5 w-5" />}
          iconColor="purple"
        />
        <AdminStatCard
          label={t('stats.mainPurposes')}
          value={stats.mainPurposes}
          icon={<ArchiveBoxIcon className="h-5 w-5" />}
          iconColor="amber"
        />
      </AdminStatGrid>

      {/* Tabs */}
      <div className="space-y-4">
        <Tabs
          tabs={[
            { id: "products", label: t('tabs.products'), icon: <CubeIcon className="h-4 w-4" /> },
            { id: "licenses", label: t('tabs.licenses'), icon: <KeyIcon className="h-4 w-4" /> },
            { id: "purposes", label: t('tabs.purposes'), icon: <FolderIcon className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => handleTabChange(tabId)}
          variant="default"
        />

        <TabPanel id="products" activeTab={activeTab} className="space-y-4">
          <ProductsTab />
        </TabPanel>

        <TabPanel id="licenses" activeTab={activeTab} className="space-y-4">
          <LicensesTab />
        </TabPanel>

        <TabPanel id="purposes" activeTab={activeTab} className="space-y-4">
          <PurposesTab />
        </TabPanel>
      </div>
    </AdminPageLayout>
  );
}

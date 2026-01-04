'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  CardContent,
  Badge,
  EmptyState,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
// import { supabase } from "@/lib/supabase/client"; // Commented for mock data

type LicenseStatus = "active" | "expired" | "trial" | "suspended";

type LicenseListItem = {
  id: string;
  organisationName: string;
  organisationId: string | null;
  product: string;
  productId: string | null;
  plan: string;
  status: LicenseStatus;
  seats: number;
  usedSeats: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
};

const statusConfig: Record<LicenseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Aktiv", variant: "default", icon: <CheckCircleIcon className="h-4 w-4" /> },
  trial: { label: "Provperiod", variant: "outline", icon: <ClockIcon className="h-4 w-4" /> },
  expired: { label: "Utgången", variant: "destructive", icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
  suspended: { label: "Pausad", variant: "secondary", icon: <ExclamationTriangleIcon className="h-4 w-4" /> },
};

// Mock data for now - will be replaced with real API
const mockLicenses: LicenseListItem[] = [
  {
    id: "lic-1",
    organisationName: "Lekbanken AB",
    organisationId: "org-1",
    product: "Lekbanken Pro",
    productId: "prod-1",
    plan: "Årsplan",
    status: "active",
    seats: 50,
    usedSeats: 42,
    startDate: "2025-01-01",
    endDate: "2026-01-01",
    autoRenew: true,
  },
  {
    id: "lic-2",
    organisationName: "Förskolan Äpplet",
    organisationId: "org-2",
    product: "Lekbanken Bas",
    productId: "prod-2",
    plan: "Månadsplan",
    status: "trial",
    seats: 10,
    usedSeats: 3,
    startDate: "2025-06-01",
    endDate: "2025-07-01",
    autoRenew: false,
  },
  {
    id: "lic-3",
    organisationName: "Utbildningscentrum Nord",
    organisationId: "org-3",
    product: "Lekbanken Enterprise",
    productId: "prod-3",
    plan: "Årsplan",
    status: "expired",
    seats: 100,
    usedSeats: 87,
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    autoRenew: false,
  },
];

export function LicensesTab() {
  const router = useRouter();
  const { can } = useRbac();
  const _toast = useToast(); // Reserved for future toast notifications

  const [licenses, setLicenses] = useState<LicenseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canCreate = can("admin.billing.manage");
  const canEdit = can("admin.billing.manage");
  const canDelete = can("admin.billing.manage");

  useEffect(() => {
    let isMounted = true;

    const loadLicenses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Replace with real API when available
        // For now, use mock data
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (isMounted) setLicenses(mockLicenses);
      } catch (err) {
        console.error("Failed to load licenses", err);
        if (isMounted) setError("Kunde inte ladda licenser.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadLicenses();
    return () => { isMounted = false; };
  }, []);

  const filteredLicenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return licenses;
    return licenses.filter((lic) =>
      [lic.organisationName, lic.product, lic.plan, lic.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [licenses, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            Försök igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Sök licenser..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Ny licens
          </Button>
        )}
      </div>

      {/* License grid */}
      {filteredLicenses.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Inga matchande licenser" : "Inga licenser ännu"}
          description={searchQuery ? "Justera sökningen för att se fler." : "Skapa din första licens."}
          action={!searchQuery && canCreate ? { label: "Skapa licens", onClick: () => {} } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLicenses.map((license) => {
            const statusInfo = statusConfig[license.status];
            const seatUsage = license.seats > 0 ? Math.round((license.usedSeats / license.seats) * 100) : 0;
            return (
              <Card
                key={license.id}
                className="group relative rounded-2xl border border-border/60 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                        <KeyIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{license.organisationName}</h3>
                        <p className="text-xs text-muted-foreground">{license.product}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                          Visa detaljer
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem>
                            <PencilSquareIcon className="mr-2 h-4 w-4" />
                            Redigera
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive">
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Avsluta licens
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* License details */}
                  <div className="mb-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium">{license.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platser</span>
                      <span className="font-medium">{license.usedSeats} / {license.seats}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          seatUsage > 90 ? "bg-red-500" : seatUsage > 70 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${seatUsage}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Utgår</span>
                      <span className="font-medium">{new Date(license.endDate).toLocaleDateString("sv-SE")}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusInfo.variant} className="gap-1">
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                    {license.autoRenew && (
                      <Badge variant="outline">Auto-förnyelse</Badge>
                    )}
                    {license.productId && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => router.push(`/admin/products?tab=products&highlight=${license.productId}`)}
                      >
                        → Produkt
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

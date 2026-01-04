"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  CreditCardIcon,
  PauseCircleIcon,
  PlayIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from "@/components/ui";
import type { AdminOrganisationListItem, OrganisationListStatus } from "../../types";
import { tenantStatusLabels } from "../../types";

type OrganisationListItemProps = {
  organisation: AdminOrganisationListItem;
  canEdit: boolean;
  canDelete: boolean;
  canManageBilling: boolean;
  onStatusChange?: (organisationId: string, status: OrganisationListStatus) => Promise<void>;
  onRemove?: (organisationId: string) => Promise<void>;
};

const statusVariants: Record<OrganisationListStatus, "success" | "warning" | "error" | "secondary" | "accent"> = {
  active: "success",
  trial: "warning",
  demo: "accent",
  suspended: "error",
  archived: "secondary",
  inactive: "secondary",
};

const subscriptionStatusLabels: Record<string, string> = {
  active: "Aktiv",
  trial: "Provperiod",
  trialing: "Provperiod",
  past_due: "Förfallen",
  canceled: "Avslutad",
  paused: "Pausad",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("sv-SE");
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getBillingLabel(organisation: AdminOrganisationListItem) {
  if (organisation.billing.plan) return organisation.billing.plan;
  if (organisation.billing.status) {
    return subscriptionStatusLabels[organisation.billing.status] ?? organisation.billing.status;
  }
  return organisation.billing.connected ? "Billing kopplad" : "Ingen billing";
}

function getBillingVariant(organisation: AdminOrganisationListItem) {
  if (!organisation.billing.connected) return "secondary";
  const status = organisation.billing.status ?? "";
  if (status === "active") return "success";
  if (status === "trialing") return "warning";
  if (status === "past_due") return "error";
  if (status === "canceled" || status === "paused") return "secondary";
  return "accent";
}

export function OrganisationListItem({
  organisation,
  canEdit,
  canDelete,
  canManageBilling,
  onStatusChange,
  onRemove,
}: OrganisationListItemProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [removeOpen, setRemoveOpen] = useState(false);
  const isInactive = ["suspended", "archived", "inactive"].includes(organisation.status);

  const handleRowClick = () => {
    router.push(`/admin/organisations/${organisation.id}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(organisation.id);
      success("UUID kopierad");
    } catch (err) {
      error("Kunde inte kopiera UUID");
      console.error(err);
    }
  };

  const shortId = organisation.id.slice(0, 8);
  const domainLabel = organisation.domain
    ? `${organisation.domain.hostname} (${organisation.domain.status})`
    : "Ingen domän";

  const hasContactName = Boolean(organisation.contactName);
  const contactLine =
    organisation.contactName || organisation.contactEmail || organisation.contactPhone || "—";
  const showContactPhone =
    Boolean(organisation.contactPhone) && organisation.contactPhone !== contactLine;

  return (
    <Card className="group border-border/60 transition-all hover:border-border/80 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div
              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
              role="button"
              tabIndex={0}
              onClick={handleRowClick}
              aria-label={`Öppna ${organisation.name}`}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleRowClick();
              }}
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                {organisation.branding.logoUrl ? (
                  <Image
                    src={organisation.branding.logoUrl}
                    alt={organisation.name}
                    fill
                    sizes="48px"
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <span>{getInitials(organisation.name)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{organisation.name}</h3>
                  <Badge variant={statusVariants[organisation.status]} size="sm">
                    {tenantStatusLabels[organisation.status]}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{organisation.slug || "—"}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="font-mono">{shortId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    aria-label={`Kopiera UUID för ${organisation.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCopy();
                    }}
                  >
                    Kopiera
                  </Button>
                  <span className="text-muted-foreground/60">•</span>
                  <span>Skapad {formatDate(organisation.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Snabbåtgärder</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/organisations/${organisation.id}`}>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      Visa organisation
                    </Link>
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/organisations/${organisation.id}?tab=overview`}>
                        <PencilSquareIcon className="h-4 w-4" />
                        Redigera
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/organisations/${organisation.id}?tab=members`}>
                      <UsersIcon className="h-4 w-4" />
                      Hantera medlemmar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/organisations/${organisation.id}?tab=overview#billing`}>
                      <CreditCardIcon className="h-4 w-4" />
                      Hantera billing
                    </Link>
                  </DropdownMenuItem>
                  {canManageBilling && organisation.billing.customerId && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://dashboard.stripe.com/customers/${organisation.billing.customerId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Öppna Stripe
                      </a>
                    </DropdownMenuItem>
                  )}
                  {canEdit && onStatusChange && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          void onStatusChange(organisation.id, isInactive ? "active" : "suspended")
                        }
                        className={isInactive ? "text-emerald-600" : "text-amber-600"}
                      >
                        {isInactive ? (
                          <>
                            <PlayIcon className="h-4 w-4" />
                            Återaktivera
                          </>
                        ) : (
                          <>
                            <PauseCircleIcon className="h-4 w-4" />
                            Stäng av
                          </>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  {canDelete && onRemove && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        onSelect={() => setRemoveOpen(true)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Ta bort organisation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getBillingVariant(organisation)} size="sm">
              {getBillingLabel(organisation)}
            </Badge>
            <Badge variant="outline" size="sm">
              {organisation.language?.toUpperCase() ?? "—"}
            </Badge>
            {organisation.domain ? (
              <Badge
                variant={organisation.domain.status === "active" ? "success" : "warning"}
                size="sm"
              >
                Domän {organisation.domain.status === "active" ? "aktiv" : "väntande"}
              </Badge>
            ) : (
              <Badge variant="secondary" size="sm">
                Ingen domän
              </Badge>
            )}
          </div>

          <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Kontakt</p>
              <p className="mt-1 text-sm text-foreground">{contactLine}</p>
              {organisation.contactEmail && hasContactName && (
                <p className="text-xs text-muted-foreground">{organisation.contactEmail}</p>
              )}
              {showContactPhone && (
                <p className="text-xs text-muted-foreground">{organisation.contactPhone}</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Medlemmar</p>
              <p className="mt-1 text-sm text-foreground">
                {organisation.membersCount ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Billing</p>
              <p className="mt-1 text-sm text-foreground">
                {organisation.billing.status
                  ? subscriptionStatusLabels[organisation.billing.status] ?? organisation.billing.status
                  : organisation.billing.connected
                    ? "Kopplad"
                    : "Ingen billing"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Domän</p>
              <p className="mt-1 text-sm text-foreground">{domainLabel}</p>
            </div>
          </div>
        </div>
      </CardContent>

      {canDelete && onRemove && (
        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent variant="destructive">
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort organisation?</AlertDialogTitle>
              <AlertDialogDescription>
                Detta går inte att ångra. Organisationen och kopplade data kan
                försvinna permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onRemove && void onRemove(organisation.id)}
              >
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}

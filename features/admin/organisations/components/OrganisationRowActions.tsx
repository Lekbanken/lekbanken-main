'use client';

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import type { OrganisationAdminItem, OrganisationStatus } from "../types";
import {
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  PlayIcon,
  PauseCircleIcon,
  UsersIcon,
  CreditCardIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type OrganisationRowActionsProps = {
  organisation: OrganisationAdminItem;
  onEdit: () => void;
  onStatusChange: (organisationId: string, status: OrganisationStatus) => void;
  onRemove: (organisationId: string) => void;
};

export function OrganisationRowActions({
  organisation,
  onEdit,
  onStatusChange,
  onRemove,
}: OrganisationRowActionsProps) {
  const toggleStatus = () => {
    const next = organisation.status === "active" ? "inactive" : "active";
    onStatusChange(organisation.id, next);
  };

  const isActive = organisation.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Open organisation actions"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onEdit}>
          <PencilSquareIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          Edit organisation
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={toggleStatus}
          className={isActive ? "text-amber-600 focus:text-amber-600" : "text-emerald-600 focus:text-emerald-600"}
        >
          {isActive ? (
            <>
              <PauseCircleIcon className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <PlayIcon className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild className="text-primary focus:text-primary">
          <Link href={`/admin/users?orgId=${organisation.id}`}>
            <UsersIcon className="mr-2 h-4 w-4" />
            View members {organisation.membersCount !== null && `(${organisation.membersCount})`}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href={`/admin/billing?orgId=${organisation.id}`}>
            <CreditCardIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            View subscription
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem destructive onClick={() => onRemove(organisation.id)}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Remove organisation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

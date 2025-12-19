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
import type { ProductAdminItem, ProductStatus } from "../types";
import {
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  PlayIcon,
  PauseCircleIcon,
  KeyIcon,
  DocumentTextIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type ProductRowActionsProps = {
  product: ProductAdminItem;
  onEdit: () => void;
  onStatusChange: (productId: string, status: ProductStatus) => void;
  onRemove: (productId: string) => void;
};

export function ProductRowActions({ product, onEdit, onStatusChange, onRemove }: ProductRowActionsProps) {
  const toggleStatus = () => {
    const next = product.status === "active" ? "inactive" : "active";
    onStatusChange(product.id, next);
  };

  const isActive = product.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Open product actions"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={onEdit}>
          <PencilSquareIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          Edit product
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onEdit}>
          <KeyIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          Manage capabilities
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
          <Link href={`/admin/licenses?productId=${product.id}`}>
            <DocumentTextIcon className="mr-2 h-4 w-4" />
            View licenses
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem destructive onClick={() => onRemove(product.id)}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Remove product
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

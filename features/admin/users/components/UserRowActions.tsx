'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { UserAdminItem, UserStatus } from "../types";
import {
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  UserMinusIcon,
  UserPlusIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type UserRowActionsProps = {
  user: UserAdminItem;
  onEdit: () => void;
  onStatusChange: (userId: string, status: UserStatus) => void;
  onRemove: (userId: string) => void;
  onResendInvite: (user: UserAdminItem) => void;
};

export function UserRowActions({
  user,
  onEdit,
  onStatusChange,
  onRemove,
  onResendInvite,
}: UserRowActionsProps) {
  const toggleStatus = () => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    onStatusChange(user.id, nextStatus);
  };

  const isActive = user.status === "active";
  const isInvited = user.status === "invited";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Open user actions"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onEdit}>
          <PencilSquareIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          Edit user
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={toggleStatus}
          className={isActive ? "text-amber-600 focus:text-amber-600" : "text-emerald-600 focus:text-emerald-600"}
        >
          {isActive ? (
            <>
              <UserMinusIcon className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        
        {isInvited && (
          <DropdownMenuItem onClick={() => onResendInvite(user)} className="text-primary focus:text-primary">
            <PaperAirplaneIcon className="mr-2 h-4 w-4" />
            Resend invite
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem destructive onClick={() => onRemove(user.id)}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Remove from org
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

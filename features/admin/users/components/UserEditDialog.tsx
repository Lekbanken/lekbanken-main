'use client';

import type { FormEvent} from "react";
import { useEffect, useState } from "react";
import { PencilSquareIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
} from "@/components/ui";
import type { UserAdminItem, UserRole, UserStatus} from "../types";
import { roleLabels, statusLabels } from "../types";

type UserEditDialogProps = {
  open: boolean;
  user: UserAdminItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name?: string | null; roles: UserRole[]; status: UserStatus }) => void;
};

const availableRoles: UserRole[] = ["owner", "admin", "editor", "member"];

// Role badge styles for checkboxes (only for the roles we use in the UI)
const roleBadgeStyles: Partial<Record<UserRole, { bg: string; border: string; checked: string }>> = {
  owner: { bg: "bg-amber-500/5", border: "border-amber-500/20", checked: "bg-amber-500/15 border-amber-500/40" },
  admin: { bg: "bg-primary/5", border: "border-primary/20", checked: "bg-primary/15 border-primary/40" },
  editor: { bg: "bg-cyan-500/5", border: "border-cyan-500/20", checked: "bg-cyan-500/15 border-cyan-500/40" },
  member: { bg: "bg-muted/50", border: "border-border", checked: "bg-muted border-border" },
};

export function UserEditDialog({ open, user, onOpenChange, onSubmit }: UserEditDialogProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "active");
  const [roles, setRoles] = useState<UserRole[]>(user?.roles ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setStatus(user?.status ?? "active");
    setRoles(user?.roles ?? []);
  }, [user]);

  const handleToggleRole = (role: UserRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((value) => value !== role) : [...prev, role],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      onSubmit({
        name: name.trim() || null,
        roles: roles.length ? roles : user.roles,
        status,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <PencilSquareIcon className="h-4 w-4 text-primary" />
            </div>
            Edit user
          </DialogTitle>
          <DialogDescription>Update profile details, roles, and account status.</DialogDescription>
        </DialogHeader>

        {user ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="user-name">
                Name
              </label>
              <Input
                id="user-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="user-email">
                Email <span className="text-muted-foreground">(read-only)</span>
              </label>
              <div className="relative">
                <Input 
                  id="user-email" 
                  value={user.email} 
                  disabled 
                  className="bg-muted pr-10"
                />
                <LockClosedIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Roles</p>
              <div className="grid grid-cols-2 gap-2">
                {availableRoles.map((role) => {
                  const isChecked = roles.includes(role);
                  const style = roleBadgeStyles[role] ?? {
                    bg: "bg-muted/50",
                    border: "border-border",
                    checked: "bg-muted border-border",
                  };
                  return (
                    <label
                      key={role}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        isChecked ? style.checked : `${style.bg} ${style.border} hover:bg-muted/50`
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRole(role)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className={isChecked ? "font-medium" : ""}>{roleLabels[role]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="user-status">
                Status
              </label>
              <Select
                id="user-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatus)}
                options={[
                  { value: "active", label: `● ${statusLabels.active}` },
                  { value: "invited", label: `✉ ${statusLabels.invited}` },
                  { value: "inactive", label: `○ ${statusLabels.inactive}` },
                ]}
                placeholder="Choose status"
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Select a user to edit.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

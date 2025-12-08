'use client';

import { FormEvent, useState } from "react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
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
  Textarea,
} from "@/components/ui";
import { UserRole, roleLabels } from "../types";

type UserInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (payload: { email: string; name?: string; role: UserRole; organisationName?: string; message?: string }) => void;
  defaultOrganisation?: string;
};

const inviteRoles: UserRole[] = ["owner", "admin", "editor", "member"];

export function UserInviteDialog({ open, onOpenChange, onInvite, defaultOrganisation }: UserInviteDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [organisation, setOrganisation] = useState(defaultOrganisation ?? "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    try {
      onInvite({
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        organisationName: organisation || undefined,
        message: message.trim() || undefined,
      });
      // Reset form
      setEmail("");
      setName("");
      setRole("member");
      setMessage("");
      setOrganisation(defaultOrganisation ?? "");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <EnvelopeIcon className="h-4 w-4 text-primary" />
            </div>
            Invite user
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organisation with the appropriate role.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-name" className="text-sm font-medium text-foreground">
              Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                Role <span className="text-destructive">*</span>
              </label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                options={inviteRoles.map((value) => ({ value, label: roleLabels[value] }))}
                placeholder="Select role"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-org" className="text-sm font-medium text-foreground">
                Organisation
              </label>
              <Input
                id="invite-org"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                placeholder="Organisation name"
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-message" className="text-sm font-medium text-foreground">
              Personal message <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="invite-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add a short welcome message for the invitee..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!email || isSubmitting} className="gap-2">
              <EnvelopeIcon className="h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

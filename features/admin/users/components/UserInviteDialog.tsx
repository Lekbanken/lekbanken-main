'use client';

import type { FormEvent} from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
import type { UserRole} from "../types";
import { roleLabels } from "../types";

type UserInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (payload: { email: string; name?: string; role: UserRole; organisationName?: string; message?: string }) => void;
  defaultOrganisation?: string;
};

const inviteRoles: UserRole[] = ["owner", "admin", "editor", "member"];

export function UserInviteDialog({ open, onOpenChange, onInvite, defaultOrganisation }: UserInviteDialogProps) {
  const t = useTranslations('admin.users.invite');
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
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
              {t('emailLabel')} <span className="text-destructive">{t('required')}</span>
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('emailPlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-name" className="text-sm font-medium text-foreground">
              {t('nameLabel')} <span className="text-muted-foreground">{t('nameOptional')}</span>
            </label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
                {t('roleLabel')} <span className="text-destructive">{t('required')}</span>
              </label>
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                options={inviteRoles.map((value) => ({ value, label: roleLabels[value] }))}
                placeholder={t('rolePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-org" className="text-sm font-medium text-foreground">
                {t('organisationLabel')}
              </label>
              <Input
                id="invite-org"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                placeholder={t('organisationPlaceholder')}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-message" className="text-sm font-medium text-foreground">
              {t('messageLabel')} <span className="text-muted-foreground">{t('messageOptional')}</span>
            </label>
            <Textarea
              id="invite-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!email || isSubmitting} className="gap-2">
              <EnvelopeIcon className="h-4 w-4" />
              {isSubmitting ? t('sending') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

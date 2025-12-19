'use client';

import type { FormEvent} from "react";
import { useEffect, useState } from "react";
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
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { OrganisationAdminItem, OrganisationStatus} from "../types";
import { statusLabels } from "../types";

type OrganisationEditDialogProps = {
  open: boolean;
  organisation: OrganisationAdminItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (organisation: OrganisationAdminItem) => void;
};

export function OrganisationEditDialog({ open, organisation, onOpenChange, onSubmit }: OrganisationEditDialogProps) {
  const [name, setName] = useState(organisation?.name ?? "");
  const [slug, setSlug] = useState(organisation?.slug ?? "");
  const [contactName, setContactName] = useState(organisation?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(organisation?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(organisation?.contactPhone ?? "");
  const [status, setStatus] = useState<OrganisationStatus>(organisation?.status ?? "active");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setName(organisation?.name ?? "");
      setSlug(organisation?.slug ?? "");
      setContactName(organisation?.contactName ?? "");
      setContactEmail(organisation?.contactEmail ?? "");
      setContactPhone(organisation?.contactPhone ?? "");
      setStatus(organisation?.status ?? "active");
    });
    return () => cancelAnimationFrame(frame);
  }, [organisation]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organisation) return;
    onSubmit({
      ...organisation,
      name: name.trim() || organisation.name,
      slug: slug.trim() || organisation.slug,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || organisation.contactEmail,
      contactPhone: contactPhone.trim() || null,
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <PencilSquareIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Edit organisation</DialogTitle>
          <DialogDescription>
            {organisation ? `Update details for ${organisation.name}` : "Update organisation details and status."}
          </DialogDescription>
        </DialogHeader>

        {organisation ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="org-name">
                Organisation name <span className="text-destructive">*</span>
              </label>
              <Input
                id="org-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="org-contact-name">
                  Contact person
                </label>
                <Input
                  id="org-contact-name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="org-contact-email">
                  Contact email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="org-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="org-phone">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  id="org-phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="+46 ..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="org-status">
                  Status
                </label>
                <Select
                  id="org-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrganisationStatus)}
                  options={[
                    { value: "active", label: statusLabels.active },
                    { value: "inactive", label: statusLabels.inactive },
                  ]}
                  placeholder="Status"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="org-slug">
                  Slug <span className="text-muted-foreground font-normal">(valfritt)</span>
                </label>
                <Input
                  id="org-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="organisation-ab"
                />
                <p className="text-xs text-muted-foreground">Lämna tomt för auto-slug.</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Select an organisation to edit.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

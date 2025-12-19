'use client';

import type { FormEvent} from "react";
import { useState } from "react";
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
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import type { OrganisationAdminItem, OrganisationStatus} from "../types";
import { statusLabels } from "../types";

type OrganisationCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (organisation: Omit<OrganisationAdminItem, "id">) => void;
};

export function OrganisationCreateDialog({ open, onOpenChange, onCreate }: OrganisationCreateDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<OrganisationStatus>("active");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !contactEmail) return;
    onCreate({
      name: name.trim(),
      slug: slug.trim() || null,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || null,
      status,
      membersCount: 0,
      subscriptionPlan: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    setName("");
    setSlug("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setStatus("active");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <BuildingOffice2Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Create organisation</DialogTitle>
          <DialogDescription>Add a new organisation and set its primary contact.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="create-org-name">
              Organisation name <span className="text-destructive">*</span>
            </label>
            <Input
              id="create-org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Organisation AB"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-contact-name">
                Contact person
              </label>
              <Input
                id="create-contact-name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-contact-email">
                Contact email <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-contact-email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-contact-phone">
                Phone <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="create-contact-phone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+46 ..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-status">
                Status
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="create-slug">
                  Slug <span className="text-muted-foreground font-normal">(valfritt)</span>
                </label>
                <Input
                  id="create-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="organisation-ab"
                />
                <p className="text-xs text-muted-foreground">Lämna tomt för auto-slug.</p>
              </div>
              </label>
              <Select
                id="create-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as OrganisationStatus)}
                options={[
                  { value: "active", label: statusLabels.active },
                  { value: "inactive", label: statusLabels.inactive },
                ]}
                placeholder="Status"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create organisation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

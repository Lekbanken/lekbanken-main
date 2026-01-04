'use client';

import type { FormEvent } from "react";
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
import type { OrganisationCreatePayload, OrganisationListStatus } from "../types";
import { tenantStatusLabels } from "../types";

type OrganisationCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (organisation: OrganisationCreatePayload) => Promise<void>;
};

const statusOptions: { value: OrganisationListStatus; label: string }[] = [
  { value: "active", label: tenantStatusLabels.active },
  { value: "trial", label: tenantStatusLabels.trial },
  { value: "demo", label: tenantStatusLabels.demo },
  { value: "inactive", label: tenantStatusLabels.inactive },
];

export function OrganisationCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: OrganisationCreateDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<OrganisationListStatus>("active");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setSlug("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setStatus("active");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !contactEmail.trim()) return;

    setIsSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        slug: slug.trim() || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        status,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <BuildingOffice2Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Skapa organisation</DialogTitle>
          <DialogDescription>
            Lägg till en ny organisation och ange kontaktuppgifter.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="create-org-name">
              Organisationsnamn <span className="text-destructive">*</span>
            </label>
            <Input
              id="create-org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Organisation AB"
              required
            />
          </div>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-contact-name">
                Kontaktperson
              </label>
              <Input
                id="create-contact-name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Namn"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="create-contact-email">
                Kontaktmail <span className="text-destructive">*</span>
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
                Telefon <span className="text-muted-foreground font-normal">(valfritt)</span>
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
              </label>
              <Select
                id="create-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as OrganisationListStatus)}
                options={statusOptions}
                placeholder="Välj status"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isSaving}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Skapar..." : "Skapa organisation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

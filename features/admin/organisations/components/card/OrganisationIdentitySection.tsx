'use client';

import { useState } from "react";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input, Select } from "@/components/ui";
import type { OrganisationDetail, TenantStatus } from "../../types";
import { tenantStatusLabels, tenantTypeLabels } from "../../types";

type OrganisationIdentitySectionProps = {
  organisation: OrganisationDetail;
  onUpdate: (updates: Partial<OrganisationDetail>) => Promise<void>;
  onStatusChange: (status: TenantStatus) => Promise<void>;
};

export function OrganisationIdentitySection({
  organisation,
  onUpdate,
  onStatusChange,
}: OrganisationIdentitySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(organisation.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ name });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(organisation.name);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min sedan`;
    if (diffHours < 24) return `${diffHours}h sedan`;
    if (diffDays < 7) return `${diffDays}d sedan`;
    return formatDate(dateString);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Grundinformation</CardTitle>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
              <CheckIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Organisationsnamn</label>
          {isEditing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          ) : (
            <p className="text-sm font-medium">{organisation.name}</p>
          )}
        </div>

        {/* Slug - Read only */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Slug <span className="text-muted-foreground/60">(kan ej ändras)</span>
          </label>
          <p className="text-sm font-mono">{organisation.slug || '-'}</p>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select
            value={organisation.status}
            onChange={(e) => onStatusChange(e.target.value as TenantStatus)}
            options={Object.entries(tenantStatusLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            className="mt-1 w-full"
          />
        </div>

        {/* Type - Read only for now */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Typ</label>
          <p className="text-sm">{tenantTypeLabels[organisation.type]}</p>
        </div>

        {/* Created */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Skapad</label>
            <p className="text-sm">{formatDate(organisation.createdAt)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senast uppdaterad</label>
            <p className="text-sm">{formatRelativeTime(organisation.updatedAt)}</p>
          </div>
        </div>

        {/* Trial info if applicable */}
        {organisation.status === 'trial' && organisation.trialEndsAt && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Provperiod slutar: <strong>{formatDate(organisation.trialEndsAt)}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

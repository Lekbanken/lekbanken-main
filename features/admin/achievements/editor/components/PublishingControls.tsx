'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, XMarkIcon, LinkIcon } from "@heroicons/react/24/outline";
import { Badge, Switch } from "@/components/ui";
import type { AchievementItem, ProfileFrameSyncConfig } from "../../types";

type PublishingControlsProps = {
  value: AchievementItem;
  onChange: (next: Partial<AchievementItem>) => void;
};

export function PublishingControls({ value, onChange }: PublishingControlsProps) {
  const t = useTranslations('admin.achievements.publishing');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const frame = value.profileFrameSync ?? { enabled: false };

  const roleOptions = [
    { value: "owner", label: t('roles.owner') },
    { value: "admin", label: t('roles.admin') },
    { value: "editor", label: t('roles.editor') },
    { value: "member", label: t('roles.member') },
  ];

  const orgOptions = [
    { value: "org-1", label: "Organization Alpha" },
    { value: "org-2", label: "Beta School" },
    { value: "org-3", label: "Gamma Learning" },
  ];

  const handleStatusChange = (status: "draft" | "published") => {
    onChange({ status });
  };

  const handleAddRole = (role: string) => {
    const current = value.publishedRoles ?? [];
    if (!current.includes(role)) {
      onChange({ publishedRoles: [...current, role] });
    }
    setShowRoleDropdown(false);
  };

  const handleRemoveRole = (role: string) => {
    onChange({ publishedRoles: (value.publishedRoles ?? []).filter((r) => r !== role) });
  };

  const handleAddOrg = (org: string) => {
    const current = value.availableForOrgs ?? [];
    if (!current.includes(org)) {
      onChange({ availableForOrgs: [...current, org] });
    }
    setShowOrgDropdown(false);
  };

  const handleRemoveOrg = (org: string) => {
    onChange({ availableForOrgs: (value.availableForOrgs ?? []).filter((o) => o !== org) });
  };

  return (
    <div className="space-y-5">
      {/* Status Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('status')}</label>
        <div className="flex rounded-lg border border-border/60 bg-muted/20 p-1">
          <button
            onClick={() => handleStatusChange("draft")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              value.status === "draft"
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('draft')}
          </button>
          <button
            onClick={() => handleStatusChange("published")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              value.status === "published"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('published')}
          </button>
        </div>
      </div>

      {/* Roles that can publish */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('rolesCanPublish')}</label>
        <div className="flex flex-wrap gap-2">
          {(value.publishedRoles ?? []).map((role) => {
            const roleLabel = roleOptions.find((r) => r.value === role)?.label || role;
            return (
              <Badge key={role} variant="primary" size="sm" className="gap-1 pr-1">
                {roleLabel}
                <button
                  onClick={() => handleRemoveRole(role)}
                  className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          
          {/* Add Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs 
                         text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
              {t('addRole')}
            </button>
            
            {showRoleDropdown && (
              <div className="absolute left-0 top-full mt-1 z-10 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
                {roleOptions
                  .filter((r) => !(value.publishedRoles ?? []).includes(r.value))
                  .map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleAddRole(role.value)}
                      className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                    >
                      {role.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Organizations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('availableForOrgs')}</label>
        <div className="flex flex-wrap gap-2">
          {(value.availableForOrgs ?? []).map((org) => {
            const orgLabel = orgOptions.find((o) => o.value === org)?.label || org;
            return (
              <Badge key={org} variant="secondary" size="sm" className="gap-1 pr-1">
                {orgLabel}
                <button
                  onClick={() => handleRemoveOrg(org)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted transition-colors"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          
          {/* Add Org Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs 
                         text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <PlusIcon className="h-3 w-3" />
              {t('addOrg')}
            </button>
            
            {showOrgDropdown && (
              <div className="absolute left-0 top-full mt-1 z-10 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                {orgOptions
                  .filter((o) => !(value.availableForOrgs ?? []).includes(o.value))
                  .map((org) => (
                    <button
                      key={org.value}
                      onClick={() => handleAddOrg(org.value)}
                      className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                    >
                      {org.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Frame Sync */}
      <div 
        className={`
          flex items-center justify-between rounded-xl border px-4 py-3 transition-colors
          ${frame.enabled 
            ? 'border-accent/30 bg-accent/10' 
            : 'border-border/60 bg-muted/20'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            frame.enabled ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
          }`}>
            <LinkIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{t('profileFrameSync.title')}</p>
            <p className={`text-xs ${frame.enabled ? 'text-accent' : 'text-muted-foreground'}`}>
              {frame.enabled
                ? t('profileFrameSync.syncedDescription') 
                : t('profileFrameSync.disabled')
              }
            </p>
          </div>
        </div>
        <Switch
          id="profile-frame-sync"
          checked={frame.enabled}
          onCheckedChange={(checked) => onChange({ profileFrameSync: { ...frame, enabled: checked } })}
        />
      </div>

      {frame.enabled && (
        <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
          <label className="text-xs text-muted-foreground">
            {t('profileFrameSync.durationLabel')}
            <input
              type="number"
              min={1}
              placeholder="7"
              value={frame.durationDays ?? ""}
              onChange={(e) =>
                onChange({
                  profileFrameSync: {
                    ...frame,
                    durationDays: e.target.value ? Number(e.target.value) : null,
                  },
                })
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2 text-sm text-foreground">
            {(
              [
                { key: "useBase", labelKey: "profileFrameSync.useBase" as const },
                { key: "useBackground", labelKey: "profileFrameSync.useBackground" as const },
                { key: "useForeground", labelKey: "profileFrameSync.useForeground" as const },
                { key: "useSymbol", labelKey: "profileFrameSync.useSymbol" as const },
              ] as Array<{ key: Extract<keyof ProfileFrameSyncConfig, "useBase" | "useBackground" | "useForeground" | "useSymbol">; labelKey: string }>
            ).map((item) => (
              <label
                key={item.key}
                className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={frame[item.key] ?? false}
                  onChange={(e) =>
                    onChange({
                      profileFrameSync: {
                        ...frame,
                        [item.key]: e.target.checked,
                      },
                    })
                  }
                />
                {t(item.labelKey)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

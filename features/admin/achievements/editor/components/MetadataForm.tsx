'use client';

import { useTranslations } from 'next-intl';
import { Input, Textarea, Select } from "@/components/ui";
import type { AchievementItem } from "../../types";

type MetadataFormProps = {
  value: AchievementItem;
  onChange: (next: Partial<AchievementItem>) => void;
};

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  const t = useTranslations('admin.achievements.metadata');

  const roleOptions = [
    { value: "admin", label: t('roles.admin') },
    { value: "creator", label: t('roles.creator') },
    { value: "org_admin", label: t('roles.org_admin') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-title">
            {t('title')}
          </label>
          <Input
            id="achv-title"
            value={value.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t('titlePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-subtitle">
            {t('subtitle')}
          </label>
          <Input
            id="achv-subtitle"
            value={value.subtitle ?? ""}
            onChange={(event) => onChange({ subtitle: event.target.value })}
            placeholder={t('subtitlePlaceholder')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="achv-description">
          {t('description')}
        </label>
        <Textarea
          id="achv-description"
          value={value.description ?? ""}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-reward">
            {t('rewardCoins')}
          </label>
          <Input
            id="achv-reward"
            type="number"
            value={value.rewardCoins ?? 0}
            onChange={(event) => onChange({ rewardCoins: Number(event.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-status">
            {t('status')}
          </label>
          <Select
            id="achv-status"
            value={value.status || "draft"}
            onChange={(event) => onChange({ status: event.target.value as AchievementItem["status"] })}
            options={[
              { value: "draft", label: t('statusDraft') },
              { value: "published", label: t('statusPublished') },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-roles">
            {t('publishingRoles')}
          </label>
          <Select
            id="achv-roles"
            value=""
            onChange={(event) => {
              const role = event.target.value;
              if (!role) return;
              const next = Array.from(new Set([...(value.publishedRoles ?? []), role]));
              onChange({ publishedRoles: next });
            }}
            options={[{ value: "", label: t('addRole') }, ...roleOptions]}
          />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(value.publishedRoles ?? []).map((role) => (
              <span key={role} className="rounded-full border border-border px-2 py-1">
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-orgs">
            {t('availableForOrgs')}
          </label>
          <Input
            id="achv-orgs"
            value={(value.availableForOrgs || []).join(",")}
            onChange={(event) =>
              onChange({ availableForOrgs: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
            }
            placeholder={t('orgsPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

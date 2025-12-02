'use client';

import { Input, Textarea, Select } from "@/components/ui";
import { AchievementItem } from "../../types";

type MetadataFormProps = {
  value: AchievementItem;
  onChange: (next: Partial<AchievementItem>) => void;
};

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "creator", label: "Creator" },
  { value: "org_admin", label: "Org admin" },
];

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-title">
            Title
          </label>
          <Input
            id="achv-title"
            value={value.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Badge title"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-subtitle">
            Subtitle
          </label>
          <Input
            id="achv-subtitle"
            value={value.subtitle ?? ""}
            onChange={(event) => onChange({ subtitle: event.target.value })}
            placeholder="Short subtitle"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="achv-description">
          Description
        </label>
        <Textarea
          id="achv-description"
          value={value.description ?? ""}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Describe how to earn this achievement."
          rows={3}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-reward">
            Reward (coins)
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
            Status
          </label>
          <Select
            id="achv-status"
            value={value.status || "draft"}
            onChange={(event) => onChange({ status: event.target.value as AchievementItem["status"] })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-roles">
            Publishing roles
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
            options={[{ value: "", label: "Add role" }, ...roleOptions]}
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
            Available for organisations (IDs, comma-separated)
          </label>
          <Input
            id="achv-orgs"
            value={(value.availableForOrgs || []).join(",")}
            onChange={(event) =>
              onChange({ availableForOrgs: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
            }
            placeholder="org-1, org-2"
          />
        </div>
      </div>
    </div>
  );
}

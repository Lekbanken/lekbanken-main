'use client';

import { Switch } from "@/components/ui";

type ProfileFrameSyncProps = {
  value: boolean;
  onChange: (value: boolean) => void;
};

export function ProfileFrameSync({ value, onChange }: ProfileFrameSyncProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">Profile frame sync</p>
        <p className="text-xs text-muted-foreground">
          When enabled, earned badge also updates the user’s profile frame with matching elements.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="profile-frame-sync" checked={value} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

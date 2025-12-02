"use client";

import { useState } from "react";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  GlobeAltIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { Switch } from "@/components/ui/switch";
import { LanguageSelector } from "./components/LanguageSelector";
import { LogoutButton } from "./components/LogoutButton";
import { ProfileHeader } from "./components/ProfileHeader";
import { SettingsItem } from "./components/SettingsItem";
import { SettingsList } from "./components/SettingsList";
import type { SettingsState, UserSummary } from "./types";

const mockUser: UserSummary = {
  name: "Alex Coach",
  email: "alex@lekbanken.se",
  coins: 2450,
  achievements: 18,
};

export function ProfilePage() {
  const [settings, setSettings] = useState<SettingsState>({ language: "sv", notifications: true });

  return (
    <div className="space-y-6 pb-32">
      {/* Page Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Profil</p>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ditt konto</h1>
      </header>

      {/* Profile Header with Avatar */}
      <ProfileHeader user={mockUser} />

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Section */}
        <SettingsList title="Konto">
          <SettingsItem
            label="Redigera profil"
            description="Namn och avatar"
            icon={<UserIcon className="h-5 w-5" />}
            iconClassName="bg-primary/10 text-primary"
            href="/app/profile/edit"
          />
          <SettingsItem
            label="E-postadress"
            description={mockUser.email}
            icon={<EnvelopeIcon className="h-5 w-5" />}
            iconClassName="bg-primary/10 text-primary"
          />
          <SettingsItem
            label="Byt lösenord"
            description="Uppdatera ditt lösenord"
            icon={<LockClosedIcon className="h-5 w-5" />}
            iconClassName="bg-primary/10 text-primary"
          />
        </SettingsList>

        {/* App Settings Section */}
        <SettingsList title="Inställningar">
          <SettingsItem
            label="Språk"
            icon={<GlobeAltIcon className="h-5 w-5" />}
            iconClassName="bg-emerald-500/10 text-emerald-600"
            showChevron={false}
            action={
              <LanguageSelector
                value={settings.language}
                onChange={(value) => setSettings((prev) => ({ ...prev, language: value }))}
              />
            }
          />
          <SettingsItem
            label="Notifikationer"
            description="Påminnelser och tips"
            icon={<BellIcon className="h-5 w-5" />}
            iconClassName="bg-emerald-500/10 text-emerald-600"
            showChevron={false}
            onClick={() => setSettings((prev) => ({ ...prev, notifications: !prev.notifications }))}
            action={
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifications: checked }))}
              />
            }
          />
        </SettingsList>

        {/* Help & Support Section */}
        <SettingsList title="Hjälp & support">
          <SettingsItem
            label="Vanliga frågor"
            description="Hitta svar snabbt"
            icon={<QuestionMarkCircleIcon className="h-5 w-5" />}
            iconClassName="bg-amber-500/10 text-amber-600"
            href="/app/support"
          />
          <SettingsItem
            label="Kontakta oss"
            description="Vi hjälper dig gärna"
            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            iconClassName="bg-amber-500/10 text-amber-600"
            href="/app/support/contact"
          />
        </SettingsList>

        {/* Quick Actions Section */}
        <SettingsList title="Genvägar">
          <SettingsItem
            label="Mina achievements"
            description="Se dina prestationer"
            icon={<TrophyIcon className="h-5 w-5" />}
            iconClassName="bg-sky-500/10 text-sky-600"
            href="/app/profile/achievements"
          />
          <SettingsItem
            label="Sessionsplaneraren"
            description="Planera och kör sessioner"
            icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
            iconClassName="bg-sky-500/10 text-sky-600"
            href="/app/planner"
          />
        </SettingsList>

        {/* Logout */}
        <div className="pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

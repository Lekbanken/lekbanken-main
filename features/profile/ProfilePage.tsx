"use client";

import { useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/lib/context/PreferencesContext";
import { useAuth } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./components/LogoutButton";

type ThemePreference = "light" | "dark" | "system";

const languageOptions = [
  { value: "NO", label: "Norsk" },
  { value: "SE", label: "Svenska" },
  { value: "EN", label: "English" },
];

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Follow system" },
];

const avatarPresets = [
  { id: "aurora", label: "Aurora", src: "/avatars/avatar-aurora.svg" },
  { id: "blush", label: "Blush", src: "/avatars/avatar-blush.svg" },
  { id: "cobalt", label: "Cobalt", src: "/avatars/avatar-cobalt.svg" },
  { id: "forest", label: "Forest", src: "/avatars/avatar-forest.svg" },
  { id: "sunrise", label: "Sunrise", src: "/avatars/avatar-sunrise.svg" },
  { id: "wave", label: "Wave", src: "/avatars/avatar-wave.svg" },
];

export function ProfilePage() {
  const { user, userProfile, updateProfile } = useAuth();
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    showThemeToggleInHeader,
    setShowThemeToggleInHeader,
  } = usePreferences();

  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const email = user?.email || "";

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || email.split("@")[0] || "");
      setAvatar(userProfile.avatar_url || null);
    }
  }, [email, userProfile]);

  const initials = useMemo(() => {
    if (fullName.trim().length === 0 && email) return email[0]?.toUpperCase() || "?";
    return fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  }, [email, fullName]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await updateProfile({ full_name: fullName, avatar_url: avatar });
      setStatusMessage("Profilen är uppdaterad.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Kunde inte spara profiljusteringar.");
    } finally {
      setSavingProfile(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleAvatarSelect = (src: string | null) => {
    setAvatar(src);
  };

  return (
    <div className="space-y-6 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={avatar || undefined} name={fullName || email || initials} size="lg" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Profil</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{fullName || "Din profil"}</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Personuppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="fullName">
              Namn
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">E-post</label>
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {email || "Ingen e-post tillgänglig"}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Sparar..." : "Spara ändringar"}
            </Button>
            {statusMessage && (
              <span className="text-sm font-medium text-success-foreground">{statusMessage}</span>
            )}
            {errorMessage && <span className="text-sm font-medium text-destructive">{errorMessage}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profilbild</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {avatarPresets.map((preset) => {
              const active = avatar === preset.src;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAvatarSelect(preset.src)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-primary/5",
                    active && "border-primary bg-primary/5 shadow-sm",
                  )}
                >
                  <Avatar src={preset.src} name={preset.label} size="sm" />
                  <div className="text-sm font-semibold text-foreground">{preset.label}</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleAvatarSelect(null)}>
              Ta bort bild
            </Button>
            <p className="text-sm text-muted-foreground">
              Använd initialer om du inte vill visa en bild.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferenser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Select
                label="Språk"
                options={languageOptions}
                value={language}
                onChange={(e) => void setLanguage(e.target.value as typeof language)}
              />
            </div>
            <div>
              <Select
                label="Tema"
                options={themeOptions}
                value={theme}
                onChange={(e) => void setTheme(e.target.value as ThemePreference)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Visa tema-omkopplare i headern</p>
              <p className="text-xs text-muted-foreground">
                Styr om snabb-knappen för ljust/mörkt läge syns högst upp.
              </p>
            </div>
            <Switch checked={showThemeToggleInHeader} onCheckedChange={(val) => void setShowThemeToggleInHeader(val)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">Konto</p>
        <LogoutButton />
      </div>
    </div>
  );
}

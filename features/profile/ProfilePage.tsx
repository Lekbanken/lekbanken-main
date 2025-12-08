"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/lib/context/PreferencesContext";
import { useAuth } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";
import { avatarPresets } from "./avatarPresets";
import { LogoutButton } from "./components/LogoutButton";

type ThemePreference = "light" | "dark" | "system";

type SessionInfo = {
  id: string;
  supabase_session_id: string | null;
  ip: string | null;
  user_agent: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
};

type DeviceInfo = {
  id: string;
  device_fingerprint: string | null;
  user_agent: string | null;
  device_type: string | null;
  ip_last: string | null;
  last_seen_at: string | null;
};

type MfaStatus = {
  factors: unknown[];
  totp: unknown;
  user_mfa: unknown;
};

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
  const [sessions, setSessions] = useState<
    SessionInfo[]
  >([]);
  const [devices, setDevices] = useState<
    DeviceInfo[]
  >([]);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [mfaEnroll, setMfaEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

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

  const loadSecurityData = useCallback(async () => {
    setLoadingSecurity(true);
    setSecurityError(null);
    try {
      const [sessionsRes, devicesRes, mfaRes] = await Promise.all([
        fetch("/api/accounts/sessions"),
        fetch("/api/accounts/devices"),
        fetch("/api/accounts/auth/mfa/status"),
      ]);

      if (!sessionsRes.ok) throw new Error("Kunde inte ladda sessioner");
      if (!devicesRes.ok) throw new Error("Kunde inte ladda enheter");
      if (!mfaRes.ok) throw new Error("Kunde inte ladda MFA-status");

      const sessionsJson = (await sessionsRes.json()) as { sessions: SessionInfo[] };
      const devicesJson = (await devicesRes.json()) as { devices: DeviceInfo[] };
      const mfaJson = (await mfaRes.json()) as Partial<MfaStatus>;

      setSessions(sessionsJson.sessions ?? []);
      setDevices(devicesJson.devices ?? []);
      setMfaStatus({
        factors: mfaJson.factors ?? [],
        totp: mfaJson.totp ?? null,
        user_mfa: mfaJson.user_mfa ?? null,
      });
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "Kunde inte ladda säkerhetsdata");
    } finally {
      setLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  const handleRevokeSession = async (sessionId: string | null | undefined) => {
    if (!sessionId) return;
    await fetch("/api/accounts/sessions/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    void loadSecurityData();
  };

  const handleRemoveDevice = async (deviceId: string) => {
    await fetch("/api/accounts/devices/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    });
    void loadSecurityData();
  };

  const handleStartMfa = async () => {
    const res = await fetch("/api/accounts/auth/mfa/enroll", { method: "POST" });
    if (!res.ok) {
      setSecurityError("Kunde inte starta MFA-registrering");
      return;
    }
    const json = await res.json();
    setMfaEnroll({
      factorId: json.factorId,
      qr: json.totp?.qr_code ?? "",
      secret: json.totp?.secret ?? "",
    });
    setSecurityError(null);
  };

  const handleDisableMfa = async (factorId: string) => {
    await fetch("/api/accounts/auth/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factor_id: factorId }),
    });
    void loadSecurityData();
    setMfaEnroll(null);
    setMfaCode("");
    setRecoveryCodes(null);
  };

  const handleVerifyMfa = async () => {
    if (!mfaEnroll?.factorId || !mfaCode) return;
    const res = await fetch("/api/accounts/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factor_id: mfaEnroll.factorId, code: mfaCode }),
    });
    if (!res.ok) {
      setSecurityError("Verifiering misslyckades");
      return;
    }
    setMfaEnroll(null);
    setMfaCode("");
    setRecoveryCodes(null);
    await loadSecurityData();
  };

  const handleRecoveryCodes = async () => {
    const res = await fetch("/api/accounts/auth/mfa/recovery-codes", { method: "POST" });
    if (!res.ok) {
      setSecurityError("Kunde inte generera recovery-koder");
      return;
    }
    const json = await res.json();
    setRecoveryCodes(json.recovery_codes ?? []);
  };

  return (
    <div className="space-y-6 pb-32">
      <header className="flex items-center gap-3">
        <Avatar src={avatar || undefined} name={fullName || email || initials} size="lg" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Profil</p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{fullName || "Din profil"}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
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
          <CardTitle>Säkerhet & MFA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {securityError && <div className="text-sm text-destructive">{securityError}</div>}
          {loadingSecurity ? (
            <div className="text-sm text-muted-foreground">Laddar...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">MFA-status</p>
                  <p className="text-xs text-muted-foreground">
                    {mfaStatus?.user_mfa?.enrolled_at ? "Aktiverad" : "Inte aktiverad"}
                  </p>
                </div>
                  {mfaStatus?.user_mfa?.enrolled_at && mfaStatus.totp?.id ? (
                    <Button variant="outline" onClick={() => void handleDisableMfa(mfaStatus.totp.id)}>
                      Stäng av
                    </Button>
                  ) : (
                    <Button onClick={() => void handleStartMfa()}>Aktivera MFA</Button>
                  )}
              </div>
              {mfaStatus?.user_mfa?.enrolled_at && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void handleRecoveryCodes()}>
                    Visa recovery-koder
                  </Button>
                </div>
              )}
              {mfaEnroll && (
                <div className="mt-3 space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Steg 1: Skanna QR eller ange hemlighet</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {mfaEnroll.qr && <img src={mfaEnroll.qr} alt="MFA QR" className="mt-2 h-32 w-32" />}
                    <div className="mt-2 rounded bg-muted px-2 py-1 text-xs font-mono break-all">{mfaEnroll.secret}</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Steg 2: Ange kod</p>
                    <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123 456" />
                    <div className="flex gap-2">
                      <Button onClick={() => void handleVerifyMfa()} disabled={!mfaCode}>
                        Verifiera
                      </Button>
                      <Button variant="ghost" onClick={() => { setMfaEnroll(null); setMfaCode(""); }}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {recoveryCodes && (
                <div className="mt-3 space-y-2 rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-semibold text-foreground">Recovery-koder</p>
                  <p className="text-xs text-muted-foreground">Spara dessa på en säker plats. De visas bara nu.</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {recoveryCodes.map((code) => (
                      <div key={code} className="rounded bg-muted px-2 py-1">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktiva sessioner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">Inga sessioner hittades.</p>}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="text-sm">
                <div className="font-semibold text-foreground">{session.user_agent || "Okänd enhet"}</div>
                <div className="text-muted-foreground">
                  {session.ip || "—"} • Senast: {session.last_seen_at ? new Date(session.last_seen_at).toLocaleString() : "okänt"}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRevokeSession(session.supabase_session_id)}
                disabled={!!session.revoked_at}
              >
                {session.revoked_at ? "Revokerad" : "Logga ut"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enheter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {devices.length === 0 && <p className="text-sm text-muted-foreground">Inga enheter registrerade.</p>}
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="text-sm">
                <div className="font-semibold text-foreground">{device.device_type || "Enhet"}</div>
                <div className="text-muted-foreground">
                  {device.user_agent || "Okänd UA"} • {device.ip_last || "—"} • Senast:{" "}
                  {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "okänt"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleRemoveDevice(device.id)}>
                Ta bort
              </Button>
            </div>
          ))}
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth';
import { Button, Card, CardContent, Input } from '@/components/ui';
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export default function EditProfilePage() {
  const { user, userProfile } = useAuth();
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save - in production, call updateProfile service
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/app/profile"
          className="rounded-full p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Profil
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Redigera profil
          </h1>
        </div>
      </header>

      {/* Avatar Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl font-bold text-primary">
                {fullName.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-white shadow-lg hover:bg-primary/90 transition-colors"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Tryck för att byta profilbild
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Section */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Namn
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              E-postadress
            </label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              E-postadressen kan inte ändras här.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
        size="lg"
      >
        {isSaving ? (
          'Sparar...'
        ) : saved ? (
          <>
            <CheckIcon className="h-5 w-5 mr-2" />
            Sparat!
          </>
        ) : (
          'Spara ändringar'
        )}
      </Button>

      {saved && (
        <p className="text-center text-sm text-emerald-600">
          Dina ändringar har sparats!
        </p>
      )}
    </div>
  );
}

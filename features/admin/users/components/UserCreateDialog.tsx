'use client';

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { UserPlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
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
  Checkbox,
} from '@/components/ui';
import { createUser, getTenantsForUserCreation } from '../userActions.server';
import { membershipRoleLabels } from '../types';

type UserCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (userId: string) => void;
};

// Database-compatible tenant role type (excludes "viewer" which isn't in DB)
type DbTenantRole = 'owner' | 'admin' | 'editor' | 'member';

// Only include roles that exist in the database tenant_role_enum
const tenantRoles: DbTenantRole[] = ['owner', 'admin', 'editor', 'member'];

const globalRoleOptions = [
  { value: 'member', label: 'Standard (member)' },
  { value: 'private_user', label: 'Privat användare' },
  { value: 'system_admin', label: 'Systemadmin' },
];

export function UserCreateDialog({ open, onOpenChange, onSuccess }: UserCreateDialogProps) {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantRole, setTenantRole] = useState<DbTenantRole>('member');
  const [globalRole, setGlobalRole] = useState<'system_admin' | 'private_user' | 'member'>('member');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Load tenants when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingTenants(true);
      getTenantsForUserCreation()
        .then((result) => {
          if (result.error) {
            console.error('Failed to load tenants:', result.error);
          }
          setTenants(result.tenants);
        })
        .finally(() => {
          setIsLoadingTenants(false);
        });
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createUser({
        email: email.trim(),
        password,
        fullName: fullName.trim() || undefined,
        autoConfirm,
        tenantId: selectedTenantId || undefined,
        tenantRole: selectedTenantId ? tenantRole : undefined,
        globalRole,
      });

      if (!result.success) {
        setError(result.error || 'Kunde inte skapa användare');
        return;
      }

      // Reset form
      resetForm();
      onOpenChange(false);
      onSuccess?.(result.userId!);
    } catch {
      setError('Ett oväntat fel uppstod');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setFullName('');
    setAutoConfirm(true);
    setSelectedTenantId('');
    setTenantRole('member');
    setGlobalRole('member');
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let generated = '';
    for (let i = 0; i < 16; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UserPlusIcon className="h-4 w-4 text-primary" />
            </div>
            Skapa ny användare
          </DialogTitle>
          <DialogDescription>
            Skapa en ny användare med e-post och lösenord. Användaren kan direkt logga in utan e-postverifiering.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="create-email" className="text-sm font-medium text-foreground">
              E-post <span className="text-destructive">*</span>
            </label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="create-password" className="text-sm font-medium text-foreground">
              Lösenord <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minst 6 tecken"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                Generera
              </Button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="create-name" className="text-sm font-medium text-foreground">
              Namn <span className="text-muted-foreground">(valfritt)</span>
            </label>
            <Input
              id="create-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Förnamn Efternamn"
            />
          </div>

          {/* Auto Confirm */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-autoconfirm"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
            />
            <label htmlFor="create-autoconfirm" className="text-sm text-foreground cursor-pointer">
              Hoppa över e-postverifiering (auto-confirm)
            </label>
          </div>

          {/* Global Role */}
          <div className="space-y-1.5">
            <label htmlFor="create-global-role" className="text-sm font-medium text-foreground">
              Global roll
            </label>
            <Select
              id="create-global-role"
              value={globalRole}
              onChange={(event) =>
                setGlobalRole(event.target.value as 'system_admin' | 'private_user' | 'member')
              }
              options={globalRoleOptions}
            />
            <p className="text-xs text-muted-foreground">
              De flesta användare ska ha &quot;Standard&quot;. Endast superanvändare ska ha &quot;Systemadmin&quot;.
            </p>
          </div>

          {/* Tenant Assignment */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Organisationstillhörighet (valfritt)</h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="create-tenant" className="text-sm font-medium text-foreground">
                  Organisation
                </label>
                <Select
                  id="create-tenant"
                  value={selectedTenantId}
                  onChange={(event) => setSelectedTenantId(event.target.value)}
                  options={[
                    { value: '', label: 'Ingen organisation' },
                    ...tenants.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                  disabled={isLoadingTenants}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="create-tenant-role" className="text-sm font-medium text-foreground">
                  Roll i organisation
                </label>
                <Select
                  id="create-tenant-role"
                  value={tenantRole}
                  onChange={(event) => setTenantRole(event.target.value as DbTenantRole)}
                  options={tenantRoles.map((role) => ({
                    value: role,
                    label: membershipRoleLabels[role],
                  }))}
                  disabled={!selectedTenantId}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!email || !password || isSubmitting} className="gap-2">
              <UserPlusIcon className="h-4 w-4" />
              {isSubmitting ? 'Skapar...' : 'Skapa användare'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

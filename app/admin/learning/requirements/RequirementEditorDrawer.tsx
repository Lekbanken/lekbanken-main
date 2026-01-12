'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import type { LearningRequirementRow, TenantOption } from '@/app/actions/learning-admin';
import { createRequirementAdmin, updateRequirementAdmin, listCoursesForSelector } from '@/app/actions/learning-admin';

interface RequirementEditorDrawerProps {
  open: boolean;
  requirement: LearningRequirementRow | null; // null = create mode (edit not supported in Phase 1)
  tenants: TenantOption[];
  isSystemAdmin: boolean;
  currentTenantId?: string;
  onClose: () => void;
  onSave: () => void;
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
  tenant_id: string | null;
}

export function RequirementEditorDrawer({
  open,
  requirement,
  tenants,
  isSystemAdmin,
  currentTenantId,
  onClose,
  onSave,
}: RequirementEditorDrawerProps) {
  const t = useTranslations('admin.learning.requirements.editor');
  const isEditing = !!requirement;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Static arrays using useMemo to access translations
  const REQUIREMENT_TYPES = useMemo(() => [
    { value: 'game_unlock', label: t('types.gameUnlock'), description: t('types.gameUnlockDesc') },
    { value: 'role_unlock', label: t('types.roleUnlock'), description: t('types.roleUnlockDesc') },
    { value: 'activity_unlock', label: t('types.activityUnlock'), description: t('types.activityUnlockDesc') },
    { value: 'onboarding_required', label: t('types.onboarding'), description: t('types.onboardingDesc') },
  ], [t]);

  const TARGET_KINDS = useMemo(() => [
    { value: 'game', label: t('targetKinds.game') },
    { value: 'role', label: t('targetKinds.role') },
    { value: 'activity', label: t('targetKinds.activity') },
    { value: 'feature', label: t('targetKinds.feature') },
  ], [t]);

  const SCOPE_OPTIONS = useMemo(() => [
    { value: 'global', label: t('scope.global'), description: t('scope.globalDesc') },
    { value: 'tenant', label: t('scope.tenant'), description: t('scope.tenantDesc') },
  ], [t]);

  // Form state
  const [requirementType, setRequirementType] = useState<string>('game_unlock');
  const [targetKind, setTargetKind] = useState<string>('game');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [requiredCourseId, setRequiredCourseId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scope, setScope] = useState<'global' | 'tenant'>('tenant');
  const [tenantId, setTenantId] = useState<string>('');

  // Reset form when drawer opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (requirement) {
        // Edit mode (limited support in Phase 1)
        setRequirementType(requirement.requirement_type);
        const target = requirement.target_ref as { kind?: string; id?: string; name?: string };
        setTargetKind(target?.kind || 'game');
        setTargetId(target?.id || '');
        setTargetName(target?.name || '');
        setRequiredCourseId(requirement.required_course_id);
        setIsActive(requirement.is_active);
        setScope(requirement.tenant_id === null ? 'global' : 'tenant');
        setTenantId(requirement.tenant_id || currentTenantId || '');
      } else {
        // Create mode
        setRequirementType('game_unlock');
        setTargetKind('game');
        setTargetId('');
        setTargetName('');
        setRequiredCourseId('');
        setIsActive(true);
        setScope(isSystemAdmin ? 'global' : 'tenant');
        setTenantId(currentTenantId || (tenants[0]?.id ?? ''));
      }
      setError(null);
    }
  }, [open, requirement, isSystemAdmin, currentTenantId, tenants]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load courses when drawer opens or tenant changes
  useEffect(() => {
    if (open) {
      const effectiveTenantId = scope === 'global' ? null : tenantId;
      listCoursesForSelector(effectiveTenantId).then(({ courses }) => {
        setCourses(courses);
      });
    }
  }, [open, scope, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!targetId.trim()) {
      setError(t('errors.targetIdRequired'));
      return;
    }
    if (!requiredCourseId) {
      setError(t('errors.selectCourse'));
      return;
    }
    if (scope === 'tenant' && !tenantId) {
      setError(t('errors.selectOrganization'));
      return;
    }

    const formData = {
      requirement_type: requirementType as 'role_unlock' | 'activity_unlock' | 'game_unlock' | 'onboarding_required',
      target_ref: {
        kind: targetKind as 'game' | 'role' | 'activity' | 'feature',
        id: targetId.trim(),
        name: targetName.trim() || undefined,
      },
      required_course_id: requiredCourseId,
      required_status: 'completed' as const,
      priority: 0,
      is_active: isActive,
      scope,
      tenant_id: scope === 'tenant' ? tenantId : null,
    };

    startTransition(async () => {
      try {
        if (isEditing && requirement) {
          // Update mode
          const result = await updateRequirementAdmin({
            id: requirement.id,
            requirement_type: requirementType as 'role_unlock' | 'activity_unlock' | 'game_unlock' | 'onboarding_required',
            target_ref: {
              kind: targetKind as 'game' | 'role' | 'activity' | 'feature',
              id: targetId.trim(),
              name: targetName.trim() || undefined,
            },
            required_course_id: requiredCourseId,
            is_active: isActive,
          });
          if (!result.success) {
            setError(result.error || t('errors.updateFailed'));
            return;
          }
        } else {
          // Create mode
          const result = await createRequirementAdmin(formData);
          if (!result.success) {
            setError(result.error || t('errors.createFailed'));
            return;
          }
        }
        onSave();
      } catch (err) {
        setError(t('errors.unexpected'));
        console.error(err);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('title.edit') : t('title.create')}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? t('description.edit')
              : t('description.create')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Requirement Type */}
          <div className="space-y-2">
            <Label htmlFor="requirementType">{t('labels.requirementType')} *</Label>
            <select
              id="requirementType"
              value={requirementType}
              onChange={(e) => setRequirementType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {REQUIREMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {REQUIREMENT_TYPES.find(rt => rt.value === requirementType)?.description}
            </p>
          </div>

          {/* Target Kind */}
          <div className="space-y-2">
            <Label htmlFor="targetKind">{t('labels.targetKind')} *</Label>
            <select
              id="targetKind"
              value={targetKind}
              onChange={(e) => setTargetKind(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {TARGET_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target ID */}
          <div className="space-y-2">
            <Label htmlFor="targetId">{t('labels.targetId')} *</Label>
            <Input
              id="targetId"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={t('placeholders.targetId')}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('hints.targetId')}
            </p>
          </div>

          {/* Target Name */}
          <div className="space-y-2">
            <Label htmlFor="targetName">{t('labels.displayName')}</Label>
            <Input
              id="targetName"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder={t('placeholders.displayName')}
            />
            <p className="text-xs text-muted-foreground">
              {t('hints.displayName')}
            </p>
          </div>

          {/* Scope - only for system admin, locked when editing */}
          {isSystemAdmin && (
            <div className="space-y-2">
              <Label>{t('labels.scope')} *</Label>
              {isEditing ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm">
                    {scope === 'global' ? t('scope.global') : `${t('scope.tenant')}: ${tenants.find(tn => tn.id === tenantId)?.name || tenantId}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('hints.scopeLocked')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {SCOPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        scope === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="scope"
                        value={option.value}
                        checked={scope === option.value}
                        onChange={(e) => setScope(e.target.value as 'global' | 'tenant')}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tenant selector - only when creating */}
          {scope === 'tenant' && isSystemAdmin && !isEditing && (
            <div className="space-y-2">
              <Label htmlFor="tenant">{t('labels.organization')} *</Label>
              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">{t('placeholders.selectOrganization')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tenant display for non-system admin */}
          {!isSystemAdmin && currentTenantId && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                {t('hints.creatingForOrg')} <strong>{tenants.find(tn => tn.id === currentTenantId)?.name || t('hints.yourOrganization')}</strong>
              </p>
            </div>
          )}

          {/* Required Course */}
          <div className="space-y-2">
            <Label htmlFor="course">{t('labels.requiredCourse')} *</Label>
            <select
              id="course"
              value={requiredCourseId}
              onChange={(e) => setRequiredCourseId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            >
              <option value="">{t('placeholders.selectCourse')}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {course.tenant_id === null ? `(${t('scope.global')})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Kursen som måste slutföras för att uppfylla kravet.
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Aktivt krav
            </Label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <SheetFooter className="flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending || !targetId || !requiredCourseId}>
              {isPending ? 'Sparar...' : isEditing ? 'Uppdatera' : 'Skapa'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

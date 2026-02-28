'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  useToast,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui/select';
import type { CreateCategoryInput } from './types';

// ---------------------------------------------------------------------------
// Minimal client-side slugify (mirrors server logic for preview only)
// ---------------------------------------------------------------------------

function previewSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/&/g, '-och-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CategoryCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  bundleOptions?: SelectOption[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryCreateDialog({ open, onOpenChange, onSuccess, bundleOptions = [] }: CategoryCreateDialogProps) {
  const t = useTranslations('admin.categories');
  const toast = useToast();

  const [name, setName] = useState('');
  const [slugOverride, setSlugOverride] = useState('');
  const [descriptionShort, setDescriptionShort] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [bundleProductId, setBundleProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveSlug = slugOverride.trim() || previewSlug(name);

  const reset = () => {
    setName('');
    setSlugOverride('');
    setDescriptionShort('');
    setIconKey('');
    setSortOrder(0);
    setIsPublic(true);
    setBundleProductId('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    const payload: CreateCategoryInput = { name: name.trim() };
    if (slugOverride.trim()) payload.slug = slugOverride.trim().toLowerCase();
    if (descriptionShort.trim()) payload.description_short = descriptionShort.trim();
    if (iconKey.trim()) payload.icon_key = iconKey.trim();
    payload.sort_order = sortOrder;
    payload.is_public = isPublic;
    if (bundleProductId.trim()) payload.bundle_product_id = bundleProductId.trim();

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error ?? 'Create failed');
      }

      toast.success(t('createSuccessDescription'), t('createSuccess'));
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unknown error',
        t('createError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name (required) */}
          <div className="grid gap-1.5">
            <label htmlFor="cat-name" className="text-sm font-medium">
              {t('colName')} *
            </label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createNamePlaceholder')}
              autoFocus
            />
          </div>

          {/* Slug (optional override) */}
          <div className="grid gap-1.5">
            <label htmlFor="cat-slug" className="text-sm font-medium">
              {t('colSlug')}
            </label>
            <Input
              id="cat-slug"
              value={slugOverride}
              onChange={(e) => setSlugOverride(e.target.value)}
              placeholder={effectiveSlug || t('createSlugPlaceholder')}
              className="font-mono text-sm"
            />
            {name.trim() && !slugOverride.trim() && (
              <p className="text-xs text-muted-foreground">
                {t('createSlugPreview')}: <span className="font-mono">{effectiveSlug}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label htmlFor="cat-desc" className="text-sm font-medium">
              {t('colDescription')}
            </label>
            <Input
              id="cat-desc"
              value={descriptionShort}
              onChange={(e) => setDescriptionShort(e.target.value)}
              placeholder={t('createDescPlaceholder')}
            />
          </div>

          {/* Icon key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="cat-icon" className="text-sm font-medium">
                {t('colIcon')}
              </label>
              <Input
                id="cat-icon"
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
                placeholder="TrophyIcon"
                className="text-sm"
              />
            </div>

            {/* Sort order */}
            <div className="grid gap-1.5">
              <label htmlFor="cat-order" className="text-sm font-medium">
                {t('colOrder')}
              </label>
              <Input
                id="cat-order"
                type="number"
                value={sortOrder}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSortOrder(Number.isFinite(n) ? n : 0);
                }}
                className="text-sm"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
            <input
              id="cat-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="cat-public" className="text-sm">
              {t('createPublicLabel')}
            </label>
          </div>

          {/* Bundle product id */}
          <div className="grid gap-1.5">
            <label htmlFor="cat-bundle" className="text-sm font-medium">
              {t('colBundle')}
            </label>
            {bundleOptions.length > 0 ? (
              <Select
                options={bundleOptions}
                value={bundleProductId}
                onChange={(e) => setBundleProductId(e.target.value)}
                placeholder={t('bundleNone')}
                className="text-sm"
              />
            ) : (
              <Input
                id="cat-bundle"
                value={bundleProductId}
                onChange={(e) => setBundleProductId(e.target.value)}
                placeholder="UUID"
                className="font-mono text-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            {t('createCancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? t('createSubmitting') : t('createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

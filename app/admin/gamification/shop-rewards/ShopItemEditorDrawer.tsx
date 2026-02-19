'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import type { CurrencyOption, ShopItemRow } from '@/app/actions/shop-rewards-admin';
import { createShopItem, updateShopItem } from '@/app/actions/shop-rewards-admin';

interface ShopItemEditorDrawerProps {
  open: boolean;
  item: ShopItemRow | null;
  tenantId: string;
  currencies: CurrencyOption[];
  onClose: () => void;
  onSave: () => void;
}

type CategoryValue = 'cosmetic' | 'powerup' | 'bundle' | 'season_pass';

const parseCategory = (value: string): { base: CategoryValue; subtype: string } => {
  const [baseRaw, subtype = ''] = value.split(':');
  const base = ['cosmetic', 'powerup', 'bundle', 'season_pass'].includes(baseRaw)
    ? (baseRaw as CategoryValue)
    : 'cosmetic';
  return { base, subtype };
};

export function ShopItemEditorDrawer({
  open,
  item,
  tenantId,
  currencies,
  onClose,
  onSave,
}: ShopItemEditorDrawerProps) {
  const t = useTranslations('admin.gamification.shopRewards.editor');
  const isEditing = !!item;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => [
      {
        value: 'cosmetic',
        label: t('categories.cosmetic.label'),
        description: t('categories.cosmetic.description'),
      },
      {
        value: 'powerup',
        label: t('categories.powerup.label'),
        description: t('categories.powerup.description'),
      },
      {
        value: 'bundle',
        label: t('categories.bundle.label'),
        description: t('categories.bundle.description'),
        disabled: true,
      },
      {
        value: 'season_pass',
        label: t('categories.seasonPass.label'),
        description: t('categories.seasonPass.description'),
        disabled: true,
      },
    ],
    [t]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryValue>('cosmetic');
  const [categorySubtype, setCategorySubtype] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [quantityLimit, setQuantityLimit] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const subtypes = useMemo(() => {
    if (category === 'cosmetic') {
      return [
        { value: 'avatar', label: t('subtypes.avatar') },
        { value: 'avatar_frame', label: t('subtypes.avatarFrame') },
        { value: 'background', label: t('subtypes.background') },
        { value: 'title', label: t('subtypes.title') },
        { value: 'badge', label: t('subtypes.badge') },
      ];
    }

    if (category === 'powerup') {
      return [
        { value: 'hint', label: t('subtypes.hint') },
        { value: 'skip', label: t('subtypes.skip') },
        { value: 'time_extend', label: t('subtypes.timeExtend') },
        { value: 'double_xp', label: t('subtypes.doubleXp') },
        { value: 'shield', label: t('subtypes.shield') },
      ];
    }

    return [];
  }, [category, t]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    if (item) {
      const parsedCategory = parseCategory(item.category);
      setName(item.name ?? '');
      setDescription(item.description ?? '');
      setCategory(parsedCategory.base);
      setCategorySubtype(parsedCategory.subtype);
      setImageUrl(item.image_url ?? '');
      setPrice(item.price ? String(item.price) : '');
      setCurrencyId(item.currency_id ?? '');
      setQuantityLimit(item.quantity_limit ? String(item.quantity_limit) : '');
      setSortOrder(item.sort_order !== undefined && item.sort_order !== null ? String(item.sort_order) : '0');
      setIsAvailable(item.is_available ?? true);
      setIsFeatured(item.is_featured ?? false);
    } else {
      setName('');
      setDescription('');
      setCategory('cosmetic');
      setCategorySubtype('');
      setImageUrl('');
      setPrice('');
      setCurrencyId(currencies[0]?.id ?? '');
      setQuantityLimit('');
      setSortOrder('0');
      setIsAvailable(true);
      setIsFeatured(false);
    }

    setError(null);
  }, [open, item, currencies]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('errors.nameRequired'));
      return;
    }

    if (!currencyId) {
      setError(t('errors.currencyRequired'));
      return;
    }

    const priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError(t('errors.invalidPrice'));
      return;
    }

    const quantityLimitValue = quantityLimit ? Number(quantityLimit) : null;
    if (quantityLimitValue !== null && (!Number.isFinite(quantityLimitValue) || quantityLimitValue < 1)) {
      setError(t('errors.invalidPrice'));
      return;
    }

    const sortOrderValue = Number(sortOrder);
    const parsedSortOrder = Number.isFinite(sortOrderValue) ? Math.trunc(sortOrderValue) : 0;
    const categoryValue = categorySubtype ? `${category}:${categorySubtype}` : category;

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      category: categoryValue as CategoryValue,
      image_url: imageUrl.trim() || null,
      price: priceValue,
      currency_id: currencyId,
      quantity_limit: quantityLimitValue,
      is_available: isAvailable,
      is_featured: isFeatured,
      sort_order: parsedSortOrder,
    };

    startTransition(async () => {
      try {
        if (isEditing && item) {
          const result = await updateShopItem(tenantId, item.id, payload);
          if (!result.success) {
            setError(result.error || t('errors.updateFailed'));
            return;
          }
        } else {
          const result = await createShopItem(tenantId, payload);
          if (!result.success) {
            setError(result.error || t('errors.createFailed'));
            return;
          }
        }

        onSave();
      } catch (err) {
        console.error(err);
        setError(t('errors.unexpected'));
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? t('title.edit') : t('title.create')}</SheetTitle>
          <SheetDescription>{isEditing ? t('description.edit') : t('description.create')}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fields.name.label')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fields.name.placeholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('fields.description.label')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.description.placeholder')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('fields.category.label')}</Label>
            <div className="grid gap-2">
              {categoryOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    category === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  } ${option.disabled ? 'opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={option.value}
                    checked={category === option.value}
                    onChange={(e) => {
                      setCategory(e.target.value as CategoryValue);
                      setCategorySubtype('');
                    }}
                    disabled={option.disabled}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {subtypes.length > 0 && (
            <div className="space-y-2">
              <Select
                id="subtype"
                label={t('fields.subtype.label')}
                value={categorySubtype}
                onChange={(e) => setCategorySubtype(e.target.value)}
                placeholder={t('fields.subtype.placeholder')}
                options={subtypes.map((st) => ({ value: st.value, label: st.label }))}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="imageUrl">{t('fields.imageUrl.label')}</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('fields.imageUrl.placeholder')}
            />
            {imageUrl && (
              <div className="mt-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={t('fields.imageUrl.previewAlt')}
                  className="h-20 w-20 rounded-lg object-cover border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('fields.price.label')}</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('fields.price.placeholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Select
                id="currency"
                label={t('fields.currency.label')}
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                placeholder={t('fields.currency.placeholder')}
                options={currencies.map((c) => ({ value: c.id, label: c.symbol ? `${c.symbol} ${c.name}` : c.name }))}
                className="w-full"
              />
            </div>
          </div>

          {currencies.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {t('warnings.noCurrency')}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantityLimit">{t('fields.quantityLimit.label')}</Label>
            <Input
              id="quantityLimit"
              type="number"
              min="1"
              value={quantityLimit}
              onChange={(e) => setQuantityLimit(e.target.value)}
              placeholder={t('fields.quantityLimit.placeholder')}
            />
            <p className="text-sm text-muted-foreground">{t('fields.quantityLimit.helper')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">{t('fields.sortOrder.label')}</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder={t('fields.sortOrder.placeholder')}
            />
            <p className="text-sm text-muted-foreground">{t('fields.sortOrder.helper')}</p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('toggles.available.title')}</p>
                <p className="text-sm text-muted-foreground">{t('toggles.available.description')}</p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                aria-label={t('toggles.available.title')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('toggles.featured.title')}</p>
                <p className="text-sm text-muted-foreground">{t('toggles.featured.description')}</p>
              </div>
              <Switch
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                aria-label={t('toggles.featured.title')}
              />
            </div>
          </div>

          {isEditing && item && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 font-medium">{t('stats.title')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('stats.sold')}</p>
                  <p className="font-medium">{item.quantity_sold}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('stats.remaining')}</p>
                  <p className="font-medium">
                    {item.quantity_limit
                      ? `${item.quantity_limit - item.quantity_sold} / ${item.quantity_limit}`
                      : '∞'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <SheetFooter className="flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !name || !currencyId || currencies.length === 0}>
              {isPending ? t('actions.saving') : isEditing ? t('actions.update') : t('actions.create')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

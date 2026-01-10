'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import type { ShopItemRow, CurrencyOption } from '@/app/actions/shop-rewards-admin';
import { createShopItem, updateShopItem } from '@/app/actions/shop-rewards-admin';

interface ShopItemEditorDrawerProps {
  open: boolean;
  item: ShopItemRow | null;
  tenantId: string;
  currencies: CurrencyOption[];
  onClose: () => void;
  onSave: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'cosmetic', label: 'Kosmetisk', description: 'Avatarer, ramar, bakgrunder m.m.' },
  { value: 'powerup', label: 'Power-up', description: 'Spelhjälpmedel och boosts' },
  { value: 'bundle', label: 'Paket', description: 'Kombination av flera items (Fas 2)' },
  { value: 'season_pass', label: 'Season Pass', description: 'Säsongspass med belöningar (Fas 2)' },
] as const;

const COSMETIC_SUBTYPES = [
  { value: 'cosmetic:avatar', label: 'Avatar' },
  { value: 'cosmetic:avatar_frame', label: 'Avatarram' },
  { value: 'cosmetic:background', label: 'Bakgrund' },
  { value: 'cosmetic:title', label: 'Titel' },
  { value: 'cosmetic:badge', label: 'Märke' },
];

const POWERUP_SUBTYPES = [
  { value: 'powerup:hint', label: 'Ledtråd' },
  { value: 'powerup:skip', label: 'Hoppa över' },
  { value: 'powerup:time_extend', label: 'Förläng tid' },
  { value: 'powerup:double_xp', label: 'Dubblad XP' },
  { value: 'powerup:shield', label: 'Sköld' },
];

export function ShopItemEditorDrawer({
  open,
  item,
  tenantId,
  currencies,
  onClose,
  onSave,
}: ShopItemEditorDrawerProps) {
  const isEditing = !!item;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Compute initial values from item prop
  const getInitialCategory = () => {
    if (!item) return 'cosmetic';
    const [mainCat] = item.category.split(':');
    return mainCat;
  };

  const getInitialSubtype = () => {
    if (!item) return '';
    const [, subType] = item.category.split(':');
    return subType ? item.category : '';
  };

  // Form state - reset when item changes using key on Sheet
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(getInitialCategory());
  const [categorySubtype, setCategorySubtype] = useState(getInitialSubtype());
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [price, setPrice] = useState(item ? String(item.price) : '');
  const [currencyId, setCurrencyId] = useState(item?.currency_id ?? currencies[0]?.id ?? '');
  const [quantityLimit, setQuantityLimit] = useState(item?.quantity_limit ? String(item.quantity_limit) : '');
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [isFeatured, setIsFeatured] = useState(item?.is_featured ?? false);
  const [sortOrder, setSortOrder] = useState(item ? String(item.sort_order) : '0');

  // Get subtypes based on main category
  const getSubtypes = () => {
    if (category === 'cosmetic') return COSMETIC_SUBTYPES;
    if (category === 'powerup') return POWERUP_SUBTYPES;
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Namn krävs');
      return;
    }

    if (!currencyId) {
      setError('Välj en valuta');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Ogiltigt pris');
      return;
    }

    // Use subtype if selected, otherwise main category
    const finalCategory = categorySubtype || category;

    const formData = {
      name: name.trim(),
      description: description.trim() || null,
      category: finalCategory as 'cosmetic' | 'powerup' | 'bundle' | 'season_pass',
      image_url: imageUrl.trim() || null,
      price: priceNum,
      currency_id: currencyId,
      quantity_limit: quantityLimit ? parseInt(quantityLimit, 10) : null,
      is_available: isAvailable,
      is_featured: isFeatured,
      sort_order: parseInt(sortOrder, 10) || 0,
    };

    startTransition(async () => {
      try {
        if (isEditing && item) {
          const result = await updateShopItem(tenantId, item.id, formData);
          if (!result.success) {
            setError(result.error || 'Kunde inte uppdatera item');
            return;
          }
        } else {
          const result = await createShopItem(tenantId, formData);
          if (!result.success) {
            setError(result.error || 'Kunde inte skapa item');
            return;
          }
        }
        onSave();
        onClose();
      } catch (err) {
        setError('Ett oväntat fel uppstod');
        console.error(err);
      }
    });
  };

  const subtypes = getSubtypes();

  // Use key to force remount when item changes, which resets all state
  const formKey = item?.id ?? 'new';

  return (
    <Sheet key={formKey} open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Redigera shop item' : 'Skapa nytt shop item'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Uppdatera shop item-inställningar nedan.'
              : 'Fyll i informationen nedan för att skapa ett nytt shop item.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Gyllene avatar"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv detta shop item..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Kategori *</Label>
            <div className="grid gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    category === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  } ${option.value === 'bundle' || option.value === 'season_pass' ? 'opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={option.value}
                    checked={category === option.value}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setCategorySubtype('');
                    }}
                    disabled={option.value === 'bundle' || option.value === 'season_pass'}
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

          {/* Subtype (for cosmetic/powerup) */}
          {subtypes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subtype">Undertyp</Label>
              <select
                id="subtype"
                value={categorySubtype}
                onChange={(e) => setCategorySubtype(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Välj undertyp (valfri)</option>
                {subtypes.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Bild-URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
            />
            {imageUrl && (
              <div className="mt-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Pris *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Valuta *</Label>
              <select
                id="currency"
                value={currencyId}
                onChange={(e) => setCurrencyId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Välj valuta</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.symbol ? `${c.symbol} ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currencies.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              ⚠️ Ingen valuta finns. Skapa en valuta först under Gamification → Valuta.
            </div>
          )}

          {/* Quantity Limit */}
          <div className="space-y-2">
            <Label htmlFor="quantityLimit">Begränsad upplaga</Label>
            <Input
              id="quantityLimit"
              type="number"
              min="1"
              value={quantityLimit}
              onChange={(e) => setQuantityLimit(e.target.value)}
              placeholder="Lämna tomt för obegränsad"
            />
            <p className="text-sm text-muted-foreground">
              Om ifyllt begränsas totalt antal som kan köpas av alla användare.
            </p>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sorteringsordning</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Lägre nummer visas först i shopen.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tillgänglig</p>
                <p className="text-sm text-muted-foreground">
                  Visa i shopen för deltagare
                </p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                aria-label="Tillgänglig"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Framhävd</p>
                <p className="text-sm text-muted-foreground">
                  Visa i featured-sektion
                </p>
              </div>
              <Switch
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                aria-label="Framhävd"
              />
            </div>
          </div>

          {/* Stats (edit mode only) */}
          {isEditing && item && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Försäljningsstatistik</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sålda</p>
                  <p className="font-medium">{item.quantity_sold}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kvar</p>
                  <p className="font-medium">
                    {item.quantity_limit
                      ? `${item.quantity_limit - item.quantity_sold} / ${item.quantity_limit}`
                      : '∞'}
                  </p>
                </div>
              </div>
            </div>
          )}

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
            <Button type="submit" disabled={isPending || !name || !currencyId || currencies.length === 0}>
              {isPending ? 'Sparar...' : isEditing ? 'Uppdatera' : 'Skapa'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

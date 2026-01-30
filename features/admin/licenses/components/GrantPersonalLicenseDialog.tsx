'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, Input, Label, useToast, Select } from '@/components/ui';
import { UserIcon, KeyIcon } from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface GrantPersonalLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GrantPersonalLicenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: GrantPersonalLicenseDialogProps) {
  const t = useTranslations('admin.licenses.grantDialog');
  const { error: toastError } = useToast();

  // Form state
  const [userEmail, setUserEmail] = useState('');
  const [productId, setProductId] = useState('');
  const [quantitySeats, setQuantitySeats] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Products list
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch products on open
  useEffect(() => {
    if (open && products.length === 0) {
      setIsLoadingProducts(true);
      fetch('/api/admin/products/search?status=active&limit=100')
        .then((res) => res.json())
        .then((data) => {
          setProducts(data.products || []);
        })
        .catch((err) => {
          console.error('[GrantDialog] Failed to load products:', err);
        })
        .finally(() => {
          setIsLoadingProducts(false);
        });
    }
  }, [open, products.length]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setUserEmail('');
      setProductId('');
      setQuantitySeats('1');
      setNotes('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail.trim() || !productId) {
      toastError(t('validation.required'));
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
      toastError(t('validation.invalidEmail'));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/licenses/grant-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          productId,
          quantitySeats: parseInt(quantitySeats, 10) || 1,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to grant license');
      }

      onSuccess();
    } catch (err) {
      console.error('[GrantDialog] Submit error:', err);
      toastError(err instanceof Error ? err.message : 'Failed to grant license');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* User Email */}
          <div className="space-y-2">
            <Label htmlFor="userEmail">{t('userEmail')}</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="userEmail"
                type="email"
                placeholder={t('userEmailPlaceholder')}
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('userEmailHint')}</p>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label htmlFor="product">{t('product')}</Label>
            <Select
              id="product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              options={[
                { value: '', label: isLoadingProducts ? t('loadingProducts') : t('selectProduct'), disabled: true },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
              required
            />
          </div>

          {/* Quantity Seats */}
          <div className="space-y-2">
            <Label htmlFor="seats">{t('seats')}</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="100"
              value={quantitySeats}
              onChange={(e) => setQuantitySeats(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('seatsHint')}</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Input
              id="notes"
              placeholder={t('notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !userEmail || !productId}>
              {isSubmitting ? t('granting') : t('grant')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

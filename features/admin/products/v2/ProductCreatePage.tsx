'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  CubeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Slug preview helper (mirrors server-side slugify)
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
// Component
// ---------------------------------------------------------------------------

export function ProductCreatePage() {
  const t = useTranslations('admin.products.v2.create');
  const router = useRouter();
  const toast = useToast();

  // Form state
  const [name, setName] = useState('');
  const [productKey, setProductKey] = useState('');
  const [productKeyTouched, setProductKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('platform');
  const [categorySlug, setCategorySlug] = useState('');
  const [status, setStatus] = useState('active');

  // Category options from API
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Product key collision state
  const [existingProduct, setExistingProduct] = useState<{
    id: string;
    name: string;
    product_key: string;
    is_bundle: boolean;
    status: string;
  } | null>(null);
  const [checkingKey, setCheckingKey] = useState(false);

  // Auto-generate product_key from name if user hasn't manually edited it
  // Append -bundle suffix when Type=Bundle to prevent key collisions
  useEffect(() => {
    if (!productKeyTouched && name.trim()) {
      const base = previewSlug(name);
      setProductKey(category === 'bundle' ? `${base}-bundle` : base);
    }
  }, [name, productKeyTouched, category]);

  // Preflight: check product_key availability (debounced)
  useEffect(() => {
    const trimmedKey = productKey.trim().toLowerCase();
    if (!trimmedKey || trimmedKey.length < 2) {
      setExistingProduct(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingKey(true);
      try {
        const res = await fetch(`/api/admin/products/exists?product_key=${encodeURIComponent(trimmedKey)}`);
        if (res.ok) {
          const json = await res.json();
          setExistingProduct(json.exists ? json.product : null);
        }
      } catch {
        // Silently fail
      } finally {
        setCheckingKey(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [productKey]);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        if (!res.ok) return;
        const json = await res.json();
        const opts: SelectOption[] = [
          { value: '', label: t('noCategorySlug') },
          ...(json.categories ?? []).map((c: { slug: string; name: string }) => ({
            value: c.slug,
            label: c.name,
          })),
        ];
        setCategoryOptions(opts);
      } catch {
        // Silently fail
      }
    }
    void loadCategories();
  }, [t]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !productKey.trim()) return;
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        product_key: productKey.trim().toLowerCase(),
        category: category.trim() || 'platform',
        description: description.trim() || null,
        status,
        is_bundle: category === 'bundle',
        capabilities: [],
      };
      if (categorySlug) {
        payload.category_slug = categorySlug;
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        const msg = errBody.error ?? errBody.errors?.join(', ') ?? 'Create failed';
        throw new Error(msg);
      }

      const json = await res.json();
      toast.success(t('successDescription'), t('success'));
      // Navigate to the new product's detail page
      router.push(`/admin/products/${json.product.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error', t('error'));
    } finally {
      setSubmitting(false);
    }
  }, [name, productKey, category, categorySlug, description, status, router, toast, t]);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/admin' },
          { label: t('breadcrumbs.products'), href: '/admin/products' },
          { label: t('breadcrumbs.new') },
        ]}
      />

      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<CubeIcon className="h-8 w-8 text-primary" />}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t('back')}
          </Button>
        }
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('formTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              {/* Name */}
              <div className="grid gap-1.5">
                <label htmlFor="product-name" className="text-sm font-medium">
                  {t('nameLabel')} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  autoFocus
                  required
                />
              </div>

              {/* Product Key */}
              <div className="grid gap-1.5">
                <label htmlFor="product-key" className="text-sm font-medium">
                  {t('keyLabel')} <span className="text-destructive">*</span>
                </label>
                <Input
                  id="product-key"
                  value={productKey}
                  onChange={(e) => {
                    setProductKeyTouched(true);
                    setProductKey(e.target.value);
                  }}
                  placeholder={t('keyPlaceholder')}
                  className={`font-mono text-sm ${existingProduct ? 'border-destructive' : ''}`}
                  required
                />
                {checkingKey && (
                  <p className="text-xs text-muted-foreground">{t('keyChecking')}</p>
                )}
                {existingProduct && !checkingKey && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">{t('keyExists')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('keyExistsDetail', {
                        name: existingProduct.name,
                        type: existingProduct.is_bundle ? 'Bundle' : t('keyExistsProduct'),
                        status: existingProduct.status,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/products/${existingProduct.id}`)}
                      >
                        {t('keyExistsOpen')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProductKeyTouched(true);
                          setProductKey(`${productKey.trim()}-bundle`);
                        }}
                      >
                        {t('keyExistsSuggest', { key: `${productKey.trim()}-bundle` })}
                      </Button>
                    </div>
                  </div>
                )}
                {!existingProduct && !checkingKey && productKey.trim().length >= 2 && (
                  <p className="text-xs text-emerald-600">{t('keyAvailable')}</p>
                )}
                {!existingProduct && !checkingKey && productKey.trim().length < 2 && (
                  <p className="text-xs text-muted-foreground">{t('keyHelp')}</p>
                )}
              </div>

              {/* Type + Status row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="product-category" className="text-sm font-medium">
                    {t('typeLabel')}
                  </label>
                  <Select
                    id="product-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'platform', label: 'Platform' },
                      { value: 'addon', label: 'Add-on' },
                      { value: 'bundle', label: 'Bundle' },
                    ]}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="product-status" className="text-sm font-medium">
                    {t('statusLabel')}
                  </label>
                  <Select
                    id="product-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[
                      { value: 'active', label: t('statusActive') },
                      { value: 'inactive', label: t('statusInactive') },
                    ]}
                  />
                </div>
              </div>

              {/* Category slug */}
              {categoryOptions.length > 0 && (
                <div className="grid gap-1.5">
                  <label htmlFor="product-category-slug" className="text-sm font-medium">
                    {t('categorySlugLabel')}
                  </label>
                  <Select
                    id="product-category-slug"
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    options={categoryOptions}
                  />
                  <p className="text-xs text-muted-foreground">{t('categorySlugHelp')}</p>
                </div>
              )}

              {/* Bundle info note */}
              {category === 'bundle' && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{t('bundleLabel')}</p>
                  <p className="mt-0.5 text-xs">{t('bundleHelp')}</p>
                </div>
              )}

              {/* Description */}
              <div className="grid gap-1.5">
                <label htmlFor="product-description" className="text-sm font-medium">
                  {t('descriptionLabel')}
                </label>
                <Textarea
                  id="product-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push('/admin/products')}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitting || !name.trim() || !productKey.trim() || !!existingProduct}>
                  {submitting ? t('creating') : t('submit')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}

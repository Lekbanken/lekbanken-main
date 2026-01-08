/**
 * Product Price Management Component
 * 
 * Handles creating, editing, and deleting product prices.
 * Syncs prices to Stripe automatically.
 * 
 * Sprint 5 enhancements:
 * - Currency grouping with collapsible sections
 * - Default price confirmation modal
 * - Tax behavior change warnings
 * - Trial period validation for recurring prices only
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui';

// =============================================================================
// TYPES
// =============================================================================

interface ProductPrice {
  id: string;
  product_id: string;
  stripe_price_id: string | null;
  amount: number;
  currency: 'NOK' | 'SEK' | 'EUR';
  interval: 'month' | 'year' | 'one_time';
  interval_count: number;
  tax_behavior: string;
  billing_model: string;
  nickname: string | null;
  lookup_key: string | null;
  trial_period_days: number;
  is_default: boolean;
  active: boolean;
}

interface PriceManagerProps {
  productId: string;
  productName: string;
  stripeProductId: string | null;
  prices: ProductPrice[];
  onPricesChanged?: () => void;
}

// =============================================================================
// IMPORTS FROM CENTRALIZED CONSTANTS
// =============================================================================

import {
  CURRENCIES,
  INTERVALS,
  TAX_BEHAVIORS,
  formatCurrency,
  getIntervalLabel,
} from '@/lib/constants/billing';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PriceManager({
  productId,
  productName,
  stripeProductId,
  prices,
  onPricesChanged,
}: PriceManagerProps) {
  const { success, error: toastError } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedCurrencies, setCollapsedCurrencies] = useState<Set<string>>(new Set());
  const [confirmDefaultChange, setConfirmDefaultChange] = useState<{
    priceId: string;
    currentDefault: ProductPrice | null;
    newPrice: ProductPrice;
  } | null>(null);
  
  // Group prices by currency
  const activePrices = prices.filter(p => p.active);
  const archivedPrices = prices.filter(p => !p.active);
  
  const pricesByCurrency = useMemo(() => {
    const grouped: Record<string, ProductPrice[]> = {};
    for (const price of activePrices) {
      const key = price.currency;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(price);
    }
    // Sort each group by interval (month first, then year, then one_time)
    const intervalOrder = { month: 0, year: 1, one_time: 2 };
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => intervalOrder[a.interval] - intervalOrder[b.interval]);
    }
    return grouped;
  }, [activePrices]);
  
  const currencyOrder = ['NOK', 'SEK', 'EUR'];
  const sortedCurrencies = Object.keys(pricesByCurrency).sort(
    (a, b) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b)
  );
  
  const toggleCurrencyCollapse = useCallback((currency: string) => {
    setCollapsedCurrencies(prev => {
      const next = new Set(prev);
      if (next.has(currency)) {
        next.delete(currency);
      } else {
        next.add(currency);
      }
      return next;
    });
  }, []);
  
  const handleDeletePrice = useCallback(async (priceId: string) => {
    if (!confirm('Är du säker på att du vill arkivera detta pris?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/prices/${priceId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete price');
      }
      
      success('Priset arkiverat');
      onPricesChanged?.();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Kunde inte arkivera priset');
    } finally {
      setIsLoading(false);
    }
  }, [productId, success, toastError, onPricesChanged]);
  
  const handleSetDefault = useCallback(async (priceId: string) => {
    setIsLoading(true);
    setConfirmDefaultChange(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/prices/${priceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set default');
      }
      
      success('Standardpris uppdaterat');
      onPricesChanged?.();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Kunde inte uppdatera standardpris');
    } finally {
      setIsLoading(false);
    }
  }, [productId, success, toastError, onPricesChanged]);
  
  const handleSetDefaultClick = useCallback((price: ProductPrice) => {
    // Find current default for this currency/interval
    const currentDefault = activePrices.find(
      p => p.is_default && p.currency === price.currency && p.interval === price.interval && p.id !== price.id
    );
    
    if (currentDefault) {
      // Show confirmation dialog
      setConfirmDefaultChange({ priceId: price.id, currentDefault, newPrice: price });
    } else {
      // No existing default, just set it
      handleSetDefault(price.id);
    }
  }, [activePrices, handleSetDefault]);
  
  return (
    <div className="space-y-6">
      {/* Default Price Confirmation Dialog */}
      {confirmDefaultChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Byt standardpris?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Det finns redan ett standardpris för {confirmDefaultChange.currentDefault?.currency}{' '}
              ({getIntervalLabel(confirmDefaultChange.currentDefault?.interval || 'month')}):
            </p>
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm">
                <strong>Nuvarande:</strong>{' '}
                {formatCurrency(confirmDefaultChange.currentDefault?.amount || 0, confirmDefaultChange.currentDefault?.currency || 'SEK')}
                {confirmDefaultChange.currentDefault?.nickname && (
                  <span className="text-muted-foreground"> ({confirmDefaultChange.currentDefault.nickname})</span>
                )}
              </p>
              <p className="text-sm mt-1">
                <strong>Nytt:</strong>{' '}
                {formatCurrency(confirmDefaultChange.newPrice.amount, confirmDefaultChange.newPrice.currency)}
                {confirmDefaultChange.newPrice.nickname && (
                  <span className="text-muted-foreground"> ({confirmDefaultChange.newPrice.nickname})</span>
                )}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDefaultChange(null)}>
                Avbryt
              </Button>
              <Button size="sm" onClick={() => handleSetDefault(confirmDefaultChange.priceId)}>
                Byt standardpris
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Active Prices - Grouped by Currency */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4" />
            Aktiva priser ({activePrices.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isLoading}
          >
            {showAddForm ? (
              <>
                <XMarkIcon className="mr-1 h-4 w-4" />
                Avbryt
              </>
            ) : (
              <>
                <PlusIcon className="mr-1 h-4 w-4" />
                Lägg till pris
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Add Price Form */}
          {showAddForm && (
            <AddPriceForm
              productId={productId}
              productName={productName}
              stripeProductId={stripeProductId}
              onSuccess={() => {
                setShowAddForm(false);
                onPricesChanged?.();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}
          
          {/* Prices List - Grouped by Currency */}
          {activePrices.length === 0 && !showAddForm ? (
            <div className="py-8 text-center text-muted-foreground">
              <CurrencyDollarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga priser konfigurerade</p>
              <p className="text-xs mt-1">Lägg till ett pris för att kunna synka till Stripe</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {sortedCurrencies.map((currency) => {
                const currencyPrices = pricesByCurrency[currency];
                const isCollapsed = collapsedCurrencies.has(currency);
                const currencyInfo = CURRENCIES.find(c => c.value === currency);
                
                return (
                  <div key={currency} className="border border-border rounded-lg overflow-hidden">
                    {/* Currency Header */}
                    <button
                      onClick={() => toggleCurrencyCollapse(currency)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRightIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                        <span className="font-medium">{currencyInfo?.label || currency}</span>
                        <Badge variant="secondary" className="text-xs">
                          {currencyPrices.length} pris{currencyPrices.length !== 1 ? 'er' : ''}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {currencyInfo?.symbol || currency}
                      </span>
                    </button>
                    
                    {/* Currency Prices */}
                    {!isCollapsed && (
                      <div className="divide-y divide-border">
                        {currencyPrices.map((price) => (
                          <PriceRow
                            key={price.id}
                            price={price}
                            onSetDefault={() => handleSetDefaultClick(price)}
                            onDelete={() => handleDeletePrice(price.id)}
                            isLoading={isLoading}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Archived Prices */}
      {archivedPrices.length > 0 && (
        <Card className="opacity-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Arkiverade priser ({archivedPrices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {archivedPrices.map((price) => (
                <div key={price.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-4">
                    <span className="font-medium line-through">{formatCurrency(price.amount, price.currency)}</span>
                    <span className="text-muted-foreground text-sm">{getIntervalLabel(price.interval)}</span>
                  </div>
                  <Badge variant="secondary">Arkiverad</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stripe Sync Warning */}
      {!stripeProductId && activePrices.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          <p className="font-medium">⚠️ Produkten är inte synkad till Stripe</p>
          <p className="mt-1">Priserna kommer synkas till Stripe när produkten först synkroniseras.</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRICE ROW COMPONENT
// =============================================================================

interface PriceRowProps {
  price: ProductPrice;
  onSetDefault: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

function PriceRow({ price, onSetDefault, onDelete, isLoading }: PriceRowProps) {
  const taxLabel = TAX_BEHAVIORS.find(t => t.value === price.tax_behavior)?.label || price.tax_behavior;
  const isSynced = !!price.stripe_price_id;
  const isRecurring = price.interval !== 'one_time';
  
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        {/* Default Star */}
        <button
          onClick={onSetDefault}
          disabled={isLoading || price.is_default}
          className={`p-1 rounded hover:bg-muted ${price.is_default ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
          title={price.is_default ? 'Standardpris' : 'Gör till standardpris'}
        >
          <StarIcon className="h-4 w-4" />
        </button>
        
        {/* Amount & Currency */}
        <div>
          <span className="font-semibold text-lg">{formatCurrency(price.amount, price.currency)}</span>
          <span className="text-muted-foreground text-sm ml-2">/ {getIntervalLabel(price.interval)}</span>
        </div>
        
        {/* Nickname */}
        {price.nickname && (
          <span className="text-muted-foreground text-sm italic">({price.nickname})</span>
        )}
        
        {/* Tax Behavior Badge with tooltip for synced prices */}
        <div className="relative group">
          <Badge 
            variant="outline" 
            className={`text-xs ${isSynced ? 'cursor-help' : ''}`}
          >
            {taxLabel}
          </Badge>
          {isSynced && (
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
              <div className="bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg border max-w-xs">
                <div className="flex items-start gap-1.5">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Momsbeteende kan inte ändras efter att priset synkats till Stripe</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Lookup Key (read-only) */}
        {price.lookup_key && (
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground" title={`Lookup Key: ${price.lookup_key}`}>
            🔑 {price.lookup_key.length > 20 ? price.lookup_key.slice(0, 20) + '...' : price.lookup_key}
          </Badge>
        )}
        
        {/* Trial Period Badge - only for recurring */}
        {isRecurring && price.trial_period_days > 0 && (
          <Badge variant="secondary" className="text-xs" title={`${price.trial_period_days} dagars provperiod`}>
            🎁 {price.trial_period_days}d trial
          </Badge>
        )}
        
        {/* Stripe Sync Badge */}
        {isSynced ? (
          <Badge variant="outline" className="text-xs font-mono text-emerald-600" title={price.stripe_price_id || ''}>
            ✓ Synkad
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Ej synkad
          </Badge>
        )}
        
        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// ADD PRICE FORM
// =============================================================================

interface AddPriceFormProps {
  productId: string;
  productName: string;
  stripeProductId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddPriceForm({ productId, productName: _productName, stripeProductId, onSuccess, onCancel }: AddPriceFormProps) {
  const { success, error: toastError, warning } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'NOK' | 'SEK' | 'EUR'>('NOK');
  const [interval, setInterval] = useState<'month' | 'year' | 'one_time'>('month');
  const [taxBehavior, setTaxBehavior] = useState<'inclusive' | 'exclusive' | 'unspecified'>('exclusive');
  const [nickname, setNickname] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [trialPeriodDays, setTrialPeriodDays] = useState(0);
  const [showTaxWarning, setShowTaxWarning] = useState(false);
  
  const isRecurring = interval !== 'one_time';
  
  const handleTaxBehaviorChange = (value: 'inclusive' | 'exclusive' | 'unspecified') => {
    if (stripeProductId && taxBehavior !== value) {
      setShowTaxWarning(true);
    }
    setTaxBehavior(value);
  };
  
  const handleIntervalChange = (value: 'month' | 'year' | 'one_time') => {
    setInterval(value);
    // Reset trial period when switching to one_time
    if (value === 'one_time') {
      setTrialPeriodDays(0);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toastError('Ange ett giltigt belopp');
      return;
    }
    
    // Validate trial period for one_time
    if (!isRecurring && trialPeriodDays > 0) {
      toastError('Provperiod kan endast användas för prenumerationer');
      return;
    }
    
    // Convert to smallest currency unit (øre/cent)
    const amountInSmallestUnit = Math.round(amountNumber * 100);
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInSmallestUnit,
          currency,
          interval,
          tax_behavior: taxBehavior,
          nickname: nickname || undefined,
          is_default: isDefault,
          trial_period_days: isRecurring && trialPeriodDays > 0 ? trialPeriodDays : undefined,
          syncToStripe: !!stripeProductId,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create price');
      }
      
      success(data.synced ? 'Pris skapat och synkat till Stripe' : 'Pris skapat');
      if (showTaxWarning) {
        warning('OBS: Momsbeteende kan inte ändras efter synkning till Stripe');
      }
      onSuccess();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Kunde inte skapa pris');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">Belopp</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="299.00"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        
        {/* Currency */}
        <div>
          <label className="block text-sm font-medium mb-1">Valuta</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'NOK' | 'SEK' | 'EUR')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        
        {/* Interval */}
        <div>
          <label className="block text-sm font-medium mb-1">Fakturering</label>
          <select
            value={interval}
            onChange={(e) => handleIntervalChange(e.target.value as 'month' | 'year' | 'one_time')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {INTERVALS.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
        
        {/* Tax Behavior */}
        <div>
          <label className="block text-sm font-medium mb-1">Momshantering</label>
          <select
            value={taxBehavior}
            onChange={(e) => handleTaxBehaviorChange(e.target.value as 'inclusive' | 'exclusive' | 'unspecified')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TAX_BEHAVIORS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {showTaxWarning && stripeProductId && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              Kan ej ändras efter synkning
            </p>
          )}
        </div>
        
        {/* Nickname */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Smeknamn (valfritt)</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="t.ex. Early Bird"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        
        {/* Trial Period Days - only for recurring */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Provperiod (dagar)
            {!isRecurring && (
              <span className="text-muted-foreground font-normal ml-1">(ej för engångsköp)</span>
            )}
          </label>
          <input
            type="number"
            min="0"
            max="365"
            value={trialPeriodDays}
            onChange={(e) => setTrialPeriodDays(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${!isRecurring ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isRecurring}
            title={!isRecurring ? 'Provperiod gäller endast prenumerationer' : undefined}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {isRecurring ? '0 = ingen provperiod' : 'Endast för prenumerationer'}
          </p>
        </div>
      </div>
      
      {/* Is Default */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-input"
        />
        <label htmlFor="isDefault" className="text-sm">Standardpris för denna valuta/intervall</label>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="mr-1 h-4 w-4 animate-spin" />
              Skapar...
            </>
          ) : (
            <>
              <CheckIcon className="mr-1 h-4 w-4" />
              Skapa pris
            </>
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}

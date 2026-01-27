'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  GiftIcon,
  HeartIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  name: string
  description: string
  image_url?: string
  prices: {
    id: string
    display_name: string
    unit_amount: number
    currency: string
    interval: string | null
    interval_count: number | null
  }[]
}

export default function GiftPurchasePage() {
  const t = useTranslations('marketing.gift')
  const { user, isLoading: authLoading } = useAuth()
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select')

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?giftable=true')
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    void fetchProducts()
  }, [])

  const handleSelectProduct = (productId: string, priceId: string) => {
    setSelectedProduct(productId)
    setSelectedPrice(priceId)
    setStep('details')
  }

  const handlePurchase = async () => {
    if (!selectedPrice || !user) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gift/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPriceId: selectedPrice,
          recipientEmail: recipientEmail || undefined,
          recipientName: recipientName || undefined,
          giftMessage: giftMessage || undefined,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || t('errorGeneric'))
      }
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)
  const selectedPriceData = selectedProductData?.prices.find(p => p.id === selectedPrice)

  if (!authLoading && !user) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center">
        <GiftIcon className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-4">{t('loginRequired')}</h1>
        <p className="text-muted-foreground mb-6">{t('loginDescription')}</p>
        <Button href="/auth/login?redirect=/gift">{t('loginButton')}</Button>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <GiftIcon className="h-8 w-8 text-primary" />
          <HeartIcon className="h-6 w-6 text-pink-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {['select', 'details', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
              step === s ? 'bg-primary text-primary-foreground' : 
              i < ['select', 'details', 'confirm'].indexOf(step) ? 'bg-green-500 text-white' : 
              'bg-muted text-muted-foreground'
            }`}>
              {i < ['select', 'details', 'confirm'].indexOf(step) ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && <div className={`w-12 h-0.5 ${
              i < ['select', 'details', 'confirm'].indexOf(step) ? 'bg-green-500' : 'bg-muted'
            }`} />}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Step 1: Select Product */}
      {step === 'select' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">{t('step1Title')}</h2>
          
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('loading')}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GiftIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t('noProducts')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => (
                <Card key={product.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-primary" />
                      {product.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {product.description}
                    </p>
                    <div className="space-y-2">
                      {product.prices.map((price) => (
                        <Button
                          key={price.id}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => handleSelectProduct(product.id, price.id)}
                        >
                          <span>{price.display_name || formatPrice(price.unit_amount, price.currency)}</span>
                          <ArrowRightIcon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Recipient Details */}
      {step === 'details' && selectedProductData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('step2Title')}</h2>
            <Button variant="ghost" onClick={() => setStep('select')}>
              {t('changeProduct')}
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GiftIcon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{selectedProductData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPriceData && formatPrice(selectedPriceData.unit_amount, selectedPriceData.currency)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{t('giftBadge')}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <Label htmlFor="recipientName">{t('recipientName')}</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={t('recipientNamePlaceholder')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="recipientEmail">{t('recipientEmail')}</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={t('recipientEmailPlaceholder')}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('recipientEmailHint')}</p>
            </div>

            <div>
              <Label htmlFor="giftMessage">{t('giftMessage')}</Label>
              <textarea
                id="giftMessage"
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder={t('giftMessagePlaceholder')}
                className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {giftMessage.length}/500
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setStep('select')}>
              {t('back')}
            </Button>
            <Button onClick={() => setStep('confirm')} className="flex-1">
              {t('continue')}
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 'confirm' && selectedProductData && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">{t('step3Title')}</h2>

          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-muted-foreground">{t('confirmProduct')}</span>
                <span className="font-medium">{selectedProductData.name}</span>
              </div>
              
              {recipientName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('confirmRecipient')}</span>
                  <span>{recipientName}</span>
                </div>
              )}
              
              {recipientEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('confirmEmail')}</span>
                  <span>{recipientEmail}</span>
                </div>
              )}
              
              {giftMessage && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">{t('confirmMessage')}</p>
                  <p className="text-sm italic">&quot;{giftMessage}&quot;</p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t font-medium text-lg">
                <span>{t('total')}</span>
                <span className="text-primary">
                  {selectedPriceData && formatPrice(selectedPriceData.unit_amount, selectedPriceData.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep('details')}>
              {t('back')}
            </Button>
            <Button 
              onClick={handlePurchase} 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? t('processing') : t('purchaseGift')}
              <GiftIcon className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

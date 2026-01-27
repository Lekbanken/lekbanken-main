'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import {
  GiftIcon,
  CheckCircleIcon,
  TicketIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

export default function GiftRedeemPage() {
  const t = useTranslations('marketing.gift.redeem')
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ productName: string } | null>(null)

  const handleRedeem = async () => {
    if (!code.trim() || !user) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gift/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || t('errorGeneric'))
      }
      
      setSuccess({ productName: data.product_name || t('defaultProduct') })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format code input (uppercase, groups of 4)
  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setCode(cleaned.slice(0, 12))
  }

  if (!authLoading && !user) {
    return (
      <div className="container max-w-md mx-auto py-16 px-4 text-center">
        <GiftIcon className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-4">{t('loginRequired')}</h1>
        <p className="text-muted-foreground mb-6">{t('loginDescription')}</p>
        <Button href={`/auth/login?redirect=/gift/redeem${code ? `?code=${code}` : ''}`}>
          {t('loginButton')}
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container max-w-md mx-auto py-16 px-4 text-center">
        <div className="flex items-center justify-center w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
          <CheckCircleIcon className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('successTitle')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('successDescription', { product: success.productName })}
        </p>
        <Button href="/app" size="lg" className="w-full">
          {t('goToDashboard')}
          <ArrowRightIcon className="h-4 w-4 ml-2" />
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-16 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full mb-4">
          <TicketIcon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <Card>
        <CardContent className="py-6 space-y-4">
          <div>
            <Label htmlFor="code">{t('codeLabel')}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={t('codePlaceholder')}
              className="mt-1 text-center text-xl font-mono tracking-widest uppercase"
              maxLength={12}
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('codeHint')}
            </p>
          </div>

          <Button
            onClick={handleRedeem}
            disabled={!code.trim() || isSubmitting || authLoading}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? t('redeeming') : t('redeemButton')}
            <GiftIcon className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">{t('noCode')}</p>
        <Button variant="link" href="/gift">
          {t('purchaseGift')}
        </Button>
      </div>
    </div>
  )
}

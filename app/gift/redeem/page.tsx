'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { GiftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RedeemGiftPage() {
  const t = useTranslations('gift.redeem')
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    reason?: string
    product?: { id: string; name: string }
  } | null>(null)
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean
    message?: string
    product_name?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!code || code.length < 8) return
    
    setIsValidating(true)
    setError(null)
    setValidationResult(null)
    setRedeemResult(null)
    
    try {
      const response = await fetch(`/api/gift/redeem?code=${encodeURIComponent(code)}`)
      const data = await response.json()
      setValidationResult(data)
    } catch {
      setError(t('error.validate'))
    } finally {
      setIsValidating(false)
    }
  }

  const handleRedeem = async () => {
    if (!code || !validationResult?.valid) return
    
    setIsRedeeming(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gift/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setRedeemResult(data)
        // Redirect to app after short delay
        setTimeout(() => {
          router.push('/app')
        }, 3000)
      } else {
        setError(data.error || t('error.redeem'))
      }
    } catch {
      setError(t('error.redeem'))
    } finally {
      setIsRedeeming(false)
    }
  }

  const formatCode = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GiftIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {redeemResult?.success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('success.title')}</h3>
                <p className="text-muted-foreground">
                  {t('success.unlocked', { product: redeemResult.product_name ?? '' })}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{t('success.redirecting')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">{t('codeLabel')}</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  placeholder="XXXX-XXXX"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground text-center">
                  {t('codeHint')}
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                  <XCircleIcon className="h-4 w-4" />
                  {error}
                </div>
              )}

              {validationResult && !validationResult.valid && (
                <div className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 p-3 rounded-md text-sm">
                  {validationResult.reason === 'already_redeemed' && t('invalid.alreadyRedeemed')}
                  {validationResult.reason === 'expired' && t('invalid.expired')}
                  {validationResult.reason === 'invalid' && t('invalid.notFound')}
                  {!['already_redeemed', 'expired', 'invalid'].includes(validationResult.reason || '') && t('invalid.generic')}
                </div>
              )}

              {validationResult?.valid && (
                <div className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 p-4 rounded-md">
                  <div className="font-medium">{t('valid.title')}</div>
                  <div className="text-sm mt-1">
                    {t('valid.product', { name: validationResult.product?.name ?? '' })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!validationResult?.valid ? (
                  <Button
                    onClick={handleValidate}
                    disabled={code.length < 8 || isValidating}
                    className="flex-1"
                  >
                    {isValidating ? t('validating') : t('validate')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="flex-1"
                  >
                    {isRedeeming ? t('redeeming') : t('redeemButton')}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircleIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button, Card, CardContent } from '@/components/ui'

interface SuccessData {
  productName: string
  tenantName: string
  tenantId: string
  isNewTenant: boolean
  invoiceUrl?: string
}

export default function CheckoutSuccessPage() {
  const t = useTranslations('marketing.checkout.success')
  const searchParams = useSearchParams()
  const purchaseIntentId = searchParams.get('purchase_intent_id')
  const sessionId = searchParams.get('session_id')
  
  const [data, setData] = useState<SuccessData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!purchaseIntentId && !sessionId) {
        setIsLoading(false)
        return
      }

      try {
        const endpoint = purchaseIntentId 
          ? `/api/checkout/intents/${purchaseIntentId}`
          : `/api/checkout/session/${sessionId}`
        
        const res = await fetch(endpoint)
        if (res.ok) {
          const json = await res.json()
          setData({
            productName: json.intent?.product_name || json.product_name || t('defaultProduct'),
            tenantName: json.intent?.tenant_name || json.tenant_name || '',
            tenantId: json.intent?.tenant_id || json.tenant_id || '',
            isNewTenant: json.intent?.is_new_tenant || json.is_new_tenant || false,
            invoiceUrl: json.invoice_url,
          })
        }
      } catch (error) {
        console.error('Failed to fetch success data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [purchaseIntentId, sessionId, t])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 animate-ping bg-green-500/20 rounded-full" />
          <div className="relative flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full">
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Product Info */}
        {!isLoading && data && (
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <SparklesIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">{data.productName}</span>
              </div>
              {data.tenantName && (
                <p className="text-sm text-muted-foreground">
                  {data.isNewTenant ? t('newOrganization') : t('addedTo')}: <strong>{data.tenantName}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button href="/app" size="lg" className="w-full">
            {t('goToDashboard')}
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Button>
          
          {data?.invoiceUrl && (
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full" 
              onClick={() => window.open(data.invoiceUrl, '_blank')}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              {t('viewReceipt')}
            </Button>
          )}
          
          <Link href="/app/subscription" className="text-primary hover:underline text-sm">
            {t('manageSubscription')}
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground pt-4">
          {t('helpText')}{' '}
          <Link href="/support" className="text-primary hover:underline">
            {t('contactSupport')}
          </Link>
        </p>
      </div>
    </div>
  )
}

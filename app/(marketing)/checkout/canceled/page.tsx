'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { XCircleIcon, ArrowPathIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

// Note: Link import kept for the "back to home" text link at the bottom

export default function CheckoutCanceledPage() {
  const t = useTranslations('marketing.checkout.canceled')

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Canceled Icon */}
        <div className="flex items-center justify-center w-20 h-20 mx-auto bg-muted rounded-full">
          <XCircleIcon className="h-12 w-12 text-muted-foreground" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Reasons List */}
        <div className="bg-muted/50 rounded-lg p-4 text-left">
          <p className="text-sm font-medium mb-2">{t('reasons.title')}</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t('reasons.changedMind')}</li>
            <li>• {t('reasons.wrongProduct')}</li>
            <li>• {t('reasons.paymentIssue')}</li>
            <li>• {t('reasons.moreInfo')}</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button href="/checkout/start" size="lg" className="w-full">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            {t('tryAgain')}
          </Button>
          
          <Button variant="outline" href="/pricing">
            {t('viewPricing')}
          </Button>
          
          <Button variant="ghost" href="/support">
            <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
            {t('needHelp')}
          </Button>
        </div>

        {/* Back to Home */}
        <p className="text-xs text-muted-foreground pt-4">
          <Link href="/" className="text-primary hover:underline">
            {t('backToHome')}
          </Link>
        </p>
      </div>
    </div>
  )
}

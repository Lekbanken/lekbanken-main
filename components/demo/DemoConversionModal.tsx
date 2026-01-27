/**
 * Demo Conversion Modal Component
 * Task 1.8: Shows when demo user tries to purchase
 * Offers options to create real account or log in
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useConvertDemo } from '@/hooks/useIsDemo'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SparklesIcon, ArrowRightOnRectangleIcon, PlayIcon } from '@heroicons/react/24/outline'

interface DemoConversionModalProps {
  open: boolean
  onClose: () => void
  /** Product user was trying to purchase */
  productName?: string
}

export function DemoConversionModal({ open, onClose, productName }: DemoConversionModalProps) {
  const router = useRouter()
  const convertDemo = useConvertDemo()
  const t = useTranslations('demo.conversionModal')

  const handleCreateAccount = async () => {
    // Track conversion intent
    await convertDemo('signup', undefined, {
      source: 'purchase_blocked',
      product: productName,
    })
    // Redirect to signup with return URL
    router.push('/auth/signup?from=demo-purchase')
  }

  const handleLogin = async () => {
    // Track that demo user has existing account
    await convertDemo('signup', undefined, {
      source: 'purchase_blocked_login',
      product: productName,
    })
    // Redirect to login
    router.push('/auth/login?from=demo-purchase')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {productName ? (
              t.rich('descriptionWithProduct', {
                product: productName,
                strong: (chunks) => <strong>{chunks}</strong>,
              })
            ) : (
              t('description')
            )}
            <br />
            <span className="text-muted-foreground">
              {t('warning')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleCreateAccount} className="w-full">
            <SparklesIcon className="h-4 w-4 mr-2" />
            {t('createAccount')}
          </Button>

          <Button variant="outline" onClick={handleLogin} className="w-full">
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            {t('login')}
          </Button>

          <Button variant="ghost" onClick={onClose} className="w-full">
            <PlayIcon className="h-4 w-4 mr-2" />
            {t('continueDemo')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

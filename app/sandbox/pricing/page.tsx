'use client'

import { PricingCta } from '@/components/marketing/pricing-cta'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function PricingSandbox() {
  return (
    <SimpleModulePage
      moduleId="pricing"
      title="Pricing CTA"
      description="Minimal CTA band linking to the category-driven pricing page."
    >
      <div className="-m-6">
        <PricingCta />
      </div>
    </SimpleModulePage>
  )
}

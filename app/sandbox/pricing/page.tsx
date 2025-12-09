'use client'

import { PricingSection } from '@/components/marketing/pricing-section'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function PricingSandbox() {
  return (
    <SimpleModulePage
      moduleId="pricing"
      title="Pricing Section"
      description="Three-tier pricing with monthly/yearly toggle."
    >
      <div className="-m-6">
        <PricingSection />
      </div>
    </SimpleModulePage>
  )
}

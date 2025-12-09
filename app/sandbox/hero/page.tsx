'use client'

import { Hero } from '@/components/marketing/hero'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function HeroSandbox() {
  return (
    <SimpleModulePage
      moduleId="hero"
      title="Hero Section"
      description="Marketing hero section with stats and CTA buttons."
    >
      <div className="space-y-8">
        {/* Full-width preview */}
        <div className="-mx-6 border-y border-border">
          <Hero />
        </div>

        {/* Implementation notes moved to Context Panel */}
      </div>
    </SimpleModulePage>
  )
}

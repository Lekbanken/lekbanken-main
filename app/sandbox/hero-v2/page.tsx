'use client'

import { HeroV2 } from '@/components/marketing/hero-v2'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function HeroV2Sandbox() {
  return (
    <SimpleModulePage
      moduleId="hero-v2"
      title="Hero V2 — Phone Mockup"
      description="Experimental hero with phone device frame and screenshot slideshow."
    >
      <div className="space-y-8">
        {/* Full-width preview */}
        <div className="-mx-6 border-y border-border">
          <HeroV2 />
        </div>
      </div>
    </SimpleModulePage>
  )
}

'use client'

import { Testimonials } from '@/components/marketing/testimonials'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function TestimonialsSandbox() {
  return (
    <SimpleModulePage
      moduleId="testimonials"
      title="Testimonials"
      description="Customer testimonials in masonry grid layout."
    >
      <div className="-m-6">
        <Testimonials />
      </div>
    </SimpleModulePage>
  )
}

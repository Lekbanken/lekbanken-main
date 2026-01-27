'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  UsersIcon,
  ShieldCheckIcon,
  CubeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'

interface FormData {
  companyName: string
  contactName: string
  email: string
  phone: string
  teamSize: string
  message: string
}

const teamSizeOptions = ['1-10', '11-50', '51-200', '200+']

export default function EnterprisePage() {
  const t = useTranslations('marketing.enterprise')
  const { user } = useAuth()
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    teamSize: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.teamSize) {
      setError(t('errors.requiredFields'))
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/enterprise/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errors.generic'))
      }
      
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const features = [
    { icon: UsersIcon, key: 'ssoLogin' },
    { icon: ShieldCheckIcon, key: 'advancedSecurity' },
    { icon: CubeIcon, key: 'customIntegrations' },
    { icon: PhoneIcon, key: 'dedicatedSupport' },
  ]

  if (success) {
    return (
      <div className="container max-w-md mx-auto py-16 px-4 text-center">
        <div className="flex items-center justify-center w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
          <CheckCircleIcon className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('success.title')}</h1>
        <p className="text-muted-foreground mb-6">{t('success.description')}</p>
        <p className="text-sm text-muted-foreground">{t('success.nextSteps')}</p>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full mb-4">
          <BuildingOffice2Icon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Features */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('features.title')}</h2>
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.key} className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{t(`features.items.${feature.key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`features.items.${feature.key}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <p className="text-sm mb-4">{t('testimonial.quote')}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20" />
                <div>
                  <p className="text-sm font-medium">{t('testimonial.author')}</p>
                  <p className="text-xs text-muted-foreground">{t('testimonial.role')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.title')}</CardTitle>
            <CardDescription>{t('form.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">{t('form.companyName')} *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder={t('form.companyNamePlaceholder')}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">{t('form.contactName')} *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder={t('form.contactNamePlaceholder')}
                    className="mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{t('form.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('form.emailPlaceholder')}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('form.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t('form.phonePlaceholder')}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>{t('form.teamSize')} *</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {teamSizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleChange('teamSize', size)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        formData.teamSize === size
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-muted'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="message">{t('form.message')}</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder={t('form.messagePlaceholder')}
                  className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={1000}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                {isSubmitting ? t('form.submitting') : t('form.submit')}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {t('form.privacy')}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

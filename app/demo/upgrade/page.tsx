'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

/**
 * Demo Upgrade / Contact Sales Page
 * 
 * Purpose: Capture leads interested in premium demo
 * Route: /demo/upgrade
 */

const PREMIUM_BENEFITS = [
  'allActivities',
  'personalWalkthrough',
  'customDemo',
  'extendedPeriod',
  'premiumFeatures',
  'noObligation',
];

// Fallback benefit names (ideally from translations)
const BENEFIT_NAMES: Record<string, string> = {
  allActivities: 'Full tillgång till alla 1200+ aktiviteter',
  personalWalkthrough: 'Personlig genomgång med produktexpert',
  customDemo: 'Anpassad demo för er organisation',
  extendedPeriod: 'Förlängd demo-period',
  premiumFeatures: 'Alla premium-funktioner upplåsta',
  noObligation: 'Ingen köpföpliktelse',
};

interface FormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  teamSize: string;
  message: string;
}

export default function DemoUpgradePage() {
  const t = useTranslations('demo.upgrade');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    teamSize: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Track conversion
      await fetch('/api/demo/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact_sales',
          metadata: formData,
        }),
      });

      // TODO: Send to CRM / Email
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Kunde inte skicka förfrågan. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-6">
        <Card className="mx-auto max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircleIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('success.title')}</CardTitle>
            <CardDescription>
              {t('success.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button href="/demo" variant="outline">
              {t('success.backToDemo')}
            </Button>
            <Button href="/">
              {t('hero.title').includes('Tillbaka') ? t('hero.title') : 'Tillbaka till startsidan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffd166]/5 via-background to-background">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ffd166]/20 px-4 py-2 text-sm font-medium text-[#ff9f1c] ring-1 ring-[#ffd166]/30">
            <SparklesIcon className="h-4 w-4" />
            {t('hero.titleHighlight')}
          </div>
          
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t('hero.title')}{' '}
            <span className="bg-gradient-to-r from-[#ffd166] to-[#ff9f1c] bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground">
            {t('hero.description')}
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Benefits */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {t('features.title')}
            </h2>
            
            <ul className="mt-8 space-y-4">
              {PREMIUM_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircleIcon className="h-6 w-6 shrink-0 text-[#ffd166]" />
                  <span className="text-foreground">{BENEFIT_NAMES[benefit]}</span>
                </li>
              ))}
            </ul>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <Card className="border-[#ffd166]/20">
                <CardContent className="flex items-start gap-4 pt-6">
                  <UserGroupIcon className="h-8 w-8 text-[#ffd166]" />
                  <div>
                    <h3 className="font-semibold text-foreground">{t('features.teamFeatures')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('features.teamDescription')}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-[#ffd166]/20">
                <CardContent className="flex items-start gap-4 pt-6">
                  <BuildingOffice2Icon className="h-8 w-8 text-[#ffd166]" />
                  <div>
                    <h3 className="font-semibold text-foreground">{t('features.customSetup')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('features.customDescription')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneIcon className="h-5 w-5 text-[#ffd166]" />
                {t('form.title')}
              </CardTitle>
              <CardDescription>
                {t('form.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">{t('form.name')} *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder={t('form.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('form.email')} *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder={t('form.emailPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="company">{t('form.organization')}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder={t('form.organizationPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="070-xxx xx xx"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="teamSize">{t('form.size')}</Label>
                  <select
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{t('form.sizePlaceholder')}</option>
                    <option value="1-10">{t('form.sizeOptions.small')}</option>
                    <option value="11-50">{t('form.sizeOptions.medium')}</option>
                    <option value="51-200">{t('form.sizeOptions.large')}</option>
                    <option value="200+">{t('form.sizeOptions.enterprise')}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="message">{t('form.message')}</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t('form.messagePlaceholder')}
                    rows={4}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#ffd166] text-[#1a1a2e] hover:bg-[#ffc233]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('form.submitting') : t('form.submit')}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t('form.consent')}{' '}
                  <a href="/privacy" className="text-primary underline hover:no-underline">
                    {t('form.privacyPolicy')}
                  </a>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

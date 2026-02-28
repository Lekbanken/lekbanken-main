'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import {
  CheckIcon,
  ChevronRightIcon,
  SparklesIcon,
  UserGroupIcon,
  ClockIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/20/solid'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PricingApiProduct = {
  id: string
  name: string
  description: string | null
  product_key: string
  product_type: string | null
  category: string | null
  prices: Array<{
    id: string
    amount: number
    currency: string
    interval: string | null
    interval_count: number | null
    is_default: boolean
  }>
}

type PricingApiResponse = {
  currency: string
  products: PricingApiProduct[]
}

// -----------------------------------------------------------------------------
// Static data (benefits, FAQ, etc.)
// -----------------------------------------------------------------------------

const benefits = [
  {
    icon: SparklesIcon,
    titleKey: 'benefits.activities.title',
    descriptionKey: 'benefits.activities.description',
  },
  {
    icon: UserGroupIcon,
    titleKey: 'benefits.ages.title',
    descriptionKey: 'benefits.ages.description',
  },
  {
    icon: ClockIcon,
    titleKey: 'benefits.instant.title',
    descriptionKey: 'benefits.instant.description',
  },
  {
    icon: ShieldCheckIcon,
    titleKey: 'benefits.tested.title',
    descriptionKey: 'benefits.tested.description',
  },
]

const defaultFaqs = [
  { questionKey: 'faq.howMany.question', answerKey: 'faq.howMany.answer' },
  { questionKey: 'faq.cancel.question', answerKey: 'faq.cancel.answer' },
  { questionKey: 'faq.updates.question', answerKey: 'faq.updates.answer' },
  { questionKey: 'faq.support.question', answerKey: 'faq.support.answer' },
]

// Placeholder reviews (can be replaced with real data later)
const reviews = {
  average: 4.8,
  totalCount: 127,
  featured: [
    {
      id: 1,
      rating: 5,
      content: 'Fantastiska aktiviteter som barnen älskar! Sparar mig timmar varje vecka.',
      author: 'Maria L.',
      role: 'Tränare',
    },
    {
      id: 2,
      rating: 5,
      content: 'Enkelt att hitta övningar som passar alla nivåer. Rekommenderas varmt!',
      author: 'Erik S.',
      role: 'Pedagog',
    },
    {
      id: 3,
      rating: 4,
      content: 'Bra variation och tydliga instruktioner. Önskar ännu fler lekar.',
      author: 'Anna K.',
      role: 'Förälder',
    },
  ],
}

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function formatPrice(amount: number, currency: string, interval: string | null) {
  const formatted = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100)

  if (interval === 'year') return `${formatted}/år`
  if (interval === 'month') return `${formatted}/mån`
  return formatted
}

// Category icon mapping
function getCategoryIcon(category: string | null) {
  switch (category?.toLowerCase()) {
    case 'tränare':
    case 'sports':
      return UserGroupIcon
    case 'pedagoger':
    case 'education':
      return AcademicCapIcon
    case 'föräldrar':
    case 'family':
      return HeartIcon
    default:
      return SparklesIcon
  }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter()
  const t = useTranslations('marketing.pricing.detail')

  const [pricing, setPricing] = useState<PricingApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch('/api/public/pricing?currency=SEK', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load pricing')
        const json = (await res.json()) as PricingApiResponse
        if (!active) return
        setPricing(json)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  // Find the product matching the slug
  const product = useMemo(() => {
    if (!pricing) return null
    return pricing.products.find(
      (p) => p.product_key === slug || p.id === slug
    )
  }, [pricing, slug])

  const defaultPrice = useMemo(() => {
    if (!product) return null
    return product.prices.find((p) => p.is_default) ?? product.prices[0] ?? null
  }, [product])

  const CategoryIcon = getCategoryIcon(product?.category ?? null)

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  // Error or not found
  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {error ?? t('notFound')}
        </h1>
        <p className="mt-2 text-slate-600">{t('notFoundDescription')}</p>
        <Link href="/pricing" className="mt-6 inline-block text-indigo-600 hover:text-indigo-500">
          ← {t('backToPricing')}
        </Link>
      </div>
    )
  }

  const handleBuyClick = () => {
    if (defaultPrice) {
      router.push(`/checkout/start?product=${product.id}&price=${defaultPrice.id}`)
    } else {
      router.push(`/checkout/start`)
    }
  }

  return (
    <div className="bg-white">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <ol role="list" className="flex items-center space-x-2 text-sm">
          <li>
            <Link href="/pricing" className="text-slate-500 hover:text-slate-700">
              {t('breadcrumb.pricing')}
            </Link>
          </li>
          <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          {product.category && (
            <>
              <li>
                <span className="text-slate-500">{product.category}</span>
              </li>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            </>
          )}
          <li>
            <span className="font-medium text-slate-900">{product.name}</span>
          </li>
        </ol>
      </nav>

      {/* Main product section */}
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-12 lg:px-8 lg:pt-16 lg:pb-24">
        {/* Product details (left column) */}
        <div className="lg:max-w-lg lg:self-start">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <CategoryIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-1">
                {product.category ?? t('license')}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {product.name}
              </h1>
            </div>
          </div>

          <section aria-labelledby="information-heading" className="mt-6">
            <h2 id="information-heading" className="sr-only">
              {t('productInfo')}
            </h2>

            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-slate-900">
                {defaultPrice ? formatPrice(defaultPrice.amount, defaultPrice.currency, defaultPrice.interval) : t('contactUs')}
              </p>

              {/* Rating */}
              <div className="flex items-center border-l border-slate-200 pl-4">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <StarIcon
                      key={rating}
                      aria-hidden="true"
                      className={classNames(
                        reviews.average > rating ? 'text-yellow-400' : 'text-slate-200',
                        'h-5 w-5 shrink-0'
                      )}
                    />
                  ))}
                </div>
                <p className="ml-2 text-sm text-slate-500">
                  {reviews.totalCount} {t('reviews')}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-base text-slate-600">
                {product.description ?? t('defaultDescription', { name: product.name })}
              </p>

              <div className="flex items-center text-sm text-green-600">
                <CheckIcon className="mr-2 h-5 w-5" />
                {t('instantAccess')}
              </div>
            </div>
          </section>

          {/* CTA Buttons */}
          <div className="mt-10 space-y-4">
            <Button
              onClick={handleBuyClick}
              className="w-full bg-indigo-600 py-6 text-lg font-medium hover:bg-indigo-700"
            >
              {t('buyNow')} {defaultPrice && `– ${formatPrice(defaultPrice.amount, defaultPrice.currency, defaultPrice.interval)}`}
            </Button>
            <Button
              variant="outline"
              className="w-full py-6 text-lg"
              onClick={() => router.push('/app/browse')}
            >
              {t('previewActivities')}
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheckIcon className="h-5 w-5" />
              <span>{t('guarantee')}</span>
            </div>
          </div>
        </div>

        {/* Product image / preview (right column) */}
        <div className="mt-10 lg:col-start-2 lg:row-span-2 lg:mt-0 lg:self-center">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <CategoryIcon className="h-24 w-24 text-indigo-400" />
              <h3 className="mt-6 text-xl font-semibold text-slate-800">{product.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{t('activityPreview')}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {['Uppvärmning', 'Grundträning', 'Lekar', 'Avslutning'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits section */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="sr-only">{t('benefits.title')}</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.titleKey} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100">
                    <Icon className="h-7 w-7 text-indigo-600" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {t(benefit.titleKey as Parameters<typeof t>[0])}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {t(benefit.descriptionKey as Parameters<typeof t>[0])}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tabs: Reviews & FAQ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <TabGroup>
          <div className="border-b border-slate-200">
            <TabList className="-mb-px flex space-x-8">
              <Tab
                className={({ selected }) =>
                  classNames(
                    'border-b-2 py-4 text-sm font-medium whitespace-nowrap focus:outline-none',
                    selected
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  )
                }
              >
                {t('tabs.reviews')} ({reviews.totalCount})
              </Tab>
              <Tab
                className={({ selected }) =>
                  classNames(
                    'border-b-2 py-4 text-sm font-medium whitespace-nowrap focus:outline-none',
                    selected
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'
                  )
                }
              >
                {t('tabs.faq')}
              </Tab>
            </TabList>
          </div>

          <TabPanels as={Fragment}>
            {/* Reviews panel */}
            <TabPanel className="py-10">
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Rating summary */}
                <div className="lg:col-span-4">
                  <h3 className="text-lg font-semibold text-slate-900">{t('reviewsSection.title')}</h3>
                  <div className="mt-3 flex items-center">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <StarIcon
                          key={rating}
                          className={classNames(
                            reviews.average > rating ? 'text-yellow-400' : 'text-slate-200',
                            'h-5 w-5 shrink-0'
                          )}
                        />
                      ))}
                    </div>
                    <p className="ml-3 text-sm text-slate-700">
                      {reviews.average} {t('reviewsSection.outOf5')}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('reviewsSection.basedOn', { count: reviews.totalCount })}
                  </p>
                </div>

                {/* Featured reviews */}
                <div className="lg:col-span-8">
                  <div className="divide-y divide-slate-200">
                    {reviews.featured.map((review) => (
                      <div key={review.id} className="py-6 first:pt-0">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-600">
                            {review.author.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{review.author}</p>
                            <p className="text-sm text-slate-500">{review.role}</p>
                          </div>
                          <div className="ml-auto flex items-center">
                            {[0, 1, 2, 3, 4].map((rating) => (
                              <StarIcon
                                key={rating}
                                className={classNames(
                                  review.rating > rating ? 'text-yellow-400' : 'text-slate-200',
                                  'h-4 w-4'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-4 text-slate-600 italic">&ldquo;{review.content}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* FAQ panel */}
            <TabPanel className="py-10">
              <h3 className="sr-only">{t('faq.title')}</h3>
              <dl className="space-y-8">
                {defaultFaqs.map((faq) => (
                  <div key={faq.questionKey}>
                    <dt className="text-base font-semibold text-slate-900">
                      {t(faq.questionKey as Parameters<typeof t>[0])}
                    </dt>
                    <dd className="mt-2 text-sm text-slate-600">
                      {t(faq.answerKey as Parameters<typeof t>[0])}
                    </dd>
                  </div>
                ))}
              </dl>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </section>

      {/* Back to all products */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <Link
            href="/pricing"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← {t('viewAllProducts')}
          </Link>
        </div>
      </section>
    </div>
  )
}

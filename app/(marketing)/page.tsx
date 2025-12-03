'use client';

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { LoginCta } from "@/components/marketing/login-cta";
import { PricingSection } from "@/components/marketing/pricing-section";
import { StepsSpotlight } from "@/components/marketing/steps-spotlight";
import { StepsTimeline } from "@/components/marketing/steps-timeline";
import { Testimonials } from "@/components/marketing/testimonials";
import { useAuth } from "@/lib/supabase/auth";

function MarketingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect) return;
    if (isLoading) return;

    // If user is logged in, go directly to requested path.
    // Otherwise, send to login preserving redirect param.
    if (isAuthenticated) {
      router.replace(redirect);
    } else {
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [isAuthenticated, isLoading, searchParams, router]);

  // If redirect param exists and we're still deciding, show nothing to avoid flash.
  const hasRedirect = Boolean(searchParams.get("redirect"));
  if (hasRedirect && isLoading) {
    return null;
  }

  return (
    <>
      <Hero />
      <FeatureGrid />
      <StepsTimeline />
      <StepsSpotlight />
      <Testimonials />
      <PricingSection />
      <LoginCta />
    </>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingContent />
    </Suspense>
  );
}

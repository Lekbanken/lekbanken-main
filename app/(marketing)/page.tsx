import { Hero } from "@/components/marketing/hero";
import { PricingSection } from "@/components/marketing/pricing-section";
import { StepsSpotlight } from "@/components/marketing/steps-spotlight";
import { StepsTimeline } from "@/components/marketing/steps-timeline";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTASection } from "@/components/marketing/cta";

export default function MarketingPage() {
  return (
    <>
      <Hero />
      <StepsTimeline />
      <StepsSpotlight />
      <Testimonials />
      <PricingSection />
      <CTASection />
    </>
  );
}

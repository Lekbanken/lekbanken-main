/**
 * Journey Analytics Tracking
 *
 * Spårar Journey onboarding- och adoption-händelser.
 * Följer samma mönster som demo-tracking.ts (PostHog + Plausible).
 */

export type JourneyEventName =
  | 'journey_onboarding_shown'
  | 'journey_onboarding_accepted'
  | 'journey_onboarding_skipped'
  | 'journey_toggle_on'
  | 'journey_toggle_off';

export interface JourneyEventProperties {
  source?: 'onboarding' | 'profile';
  page_path?: string;
}

/**
 * Spåra en Journey-händelse
 */
export function trackJourneyEvent(
  eventName: JourneyEventName,
  properties?: JourneyEventProperties
): void {
  if (typeof window === 'undefined') return;

  const enrichedProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    page_path: properties?.page_path ?? window.location.pathname,
  };

  // PostHog
  if (window.posthog?.capture) {
    try {
      window.posthog.capture(eventName, enrichedProperties);
    } catch {
      // Silent fail
    }
  }

  // Plausible
  if (window.plausible) {
    try {
      const plausibleProps: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(enrichedProperties)) {
        if (value !== undefined && value !== null) {
          plausibleProps[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        }
      }
      window.plausible(eventName, { props: plausibleProps });
    } catch {
      // Silent fail
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[journey-tracking]', eventName, enrichedProperties);
  }
}

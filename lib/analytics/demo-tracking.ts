/**
 * Demo Analytics Tracking
 * 
 * Centraliserad modul för att spåra demo-användarinteraktioner.
 * Stöder PostHog och Plausible (privacy-first).
 * 
 * Använd dessa funktioner för att:
 * - Spåra konverteringstratt (demo start → aktivitet → upgrade request)
 * - Identifiera högt engagerade användare
 * - Analysera vilka funktioner som driver konvertering
 */

// Typer för analytics-händelser
export type DemoEventName =
  | 'demo_session_started'
  | 'demo_activity_viewed'
  | 'demo_activity_played'
  | 'demo_feature_blocked'
  | 'demo_upgrade_clicked'
  | 'demo_upgrade_submitted'
  | 'demo_session_expired'
  | 'demo_converted';

export interface DemoEventProperties {
  // Session
  session_id?: string;
  demo_tier?: 'free' | 'premium';
  time_in_demo_ms?: number;
  
  // Aktivitet
  activity_id?: string;
  activity_name?: string;
  activity_count?: number;
  
  // Feature blocking
  feature_id?: string;
  feature_name?: string;
  blocked_reason?: string;
  
  // Konvertering
  conversion_source?: string;
  contact_email?: string;
  
  // Metadata
  page_path?: string;
  referrer?: string;
}

// PostHog integration
interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

// Plausible integration
interface PlausibleLike {
  (eventName: string, options?: { props?: Record<string, string | number | boolean> }): void;
}

declare global {
  interface Window {
    posthog?: PostHogLike;
    plausible?: PlausibleLike;
  }
}

/**
 * Spåra en demo-händelse
 */
export function trackDemoEvent(
  eventName: DemoEventName,
  properties?: DemoEventProperties
): void {
  // Kör endast på klient
  if (typeof window === 'undefined') {
    return;
  }

  const enrichedProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    is_demo: true,
  };

  // PostHog
  if (window.posthog?.capture) {
    try {
      window.posthog.capture(eventName, enrichedProperties);
    } catch (error) {
      console.warn('[demo-tracking] PostHog error:', error);
    }
  }

  // Plausible (privacy-first)
  if (window.plausible) {
    try {
      // Plausible accepterar endast strängar/tal, så vi konverterar
      const plausibleProps: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(enrichedProperties)) {
        if (value !== undefined && value !== null) {
          plausibleProps[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        }
      }
      window.plausible(eventName, { props: plausibleProps });
    } catch (error) {
      console.warn('[demo-tracking] Plausible error:', error);
    }
  }

  // Console logging i utveckling
  if (process.env.NODE_ENV === 'development') {
    console.log('[demo-tracking]', eventName, enrichedProperties);
  }
}

/**
 * Spåra demo session start
 */
export function trackDemoStart(sessionId: string, tier: 'free' | 'premium' = 'free'): void {
  trackDemoEvent('demo_session_started', {
    session_id: sessionId,
    demo_tier: tier,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  });
}

/**
 * Spåra när en aktivitet visas
 */
export function trackActivityViewed(activityId: string, activityName?: string): void {
  trackDemoEvent('demo_activity_viewed', {
    activity_id: activityId,
    activity_name: activityName,
  });
}

/**
 * Spåra när en aktivitet spelas
 */
export function trackActivityPlayed(
  activityId: string,
  activityName?: string,
  activityCount?: number
): void {
  trackDemoEvent('demo_activity_played', {
    activity_id: activityId,
    activity_name: activityName,
    activity_count: activityCount,
  });
}

/**
 * Spåra när en funktion blockeras
 */
export function trackFeatureBlocked(
  featureId: string,
  featureName: string,
  reason: string
): void {
  trackDemoEvent('demo_feature_blocked', {
    feature_id: featureId,
    feature_name: featureName,
    blocked_reason: reason,
  });
}

/**
 * Spåra klick på upgrade
 */
export function trackUpgradeClick(source: string): void {
  trackDemoEvent('demo_upgrade_clicked', {
    conversion_source: source,
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}

/**
 * Spåra inskickat upgrade-formulär
 */
export function trackUpgradeSubmitted(email: string, source?: string): void {
  // Hash email för privacy
  const hashedEmail = typeof email === 'string' 
    ? email.replace(/(.{2}).*(@.*)/, '$1***$2') 
    : undefined;
  
  trackDemoEvent('demo_upgrade_submitted', {
    contact_email: hashedEmail,
    conversion_source: source,
  });
}

/**
 * Spåra session expiry
 */
export function trackSessionExpired(sessionId: string, timeInDemoMs: number): void {
  trackDemoEvent('demo_session_expired', {
    session_id: sessionId,
    time_in_demo_ms: timeInDemoMs,
  });
}

/**
 * Spåra lyckad konvertering
 */
export function trackConversion(sessionId: string, email: string): void {
  const hashedEmail = email.replace(/(.{2}).*(@.*)/, '$1***$2');
  
  trackDemoEvent('demo_converted', {
    session_id: sessionId,
    contact_email: hashedEmail,
  });

  // PostHog: Identifiera användaren vid konvertering
  if (typeof window !== 'undefined' && window.posthog?.identify) {
    try {
      window.posthog.identify(email, {
        converted_from_demo: true,
        demo_session_id: sessionId,
      });
    } catch (error) {
      console.warn('[demo-tracking] PostHog identify error:', error);
    }
  }
}

/**
 * Beräkna tid i demo (använd med session storage)
 */
export function getDemoSessionDuration(): number {
  if (typeof window === 'undefined') return 0;
  
  const startTime = sessionStorage.getItem('demo_start_time');
  if (!startTime) return 0;
  
  return Date.now() - parseInt(startTime, 10);
}

/**
 * Initiera demo-session tracking
 */
export function initDemoTracking(sessionId: string): void {
  if (typeof window === 'undefined') return;
  
  // Spara starttid
  if (!sessionStorage.getItem('demo_start_time')) {
    sessionStorage.setItem('demo_start_time', Date.now().toString());
  }
  sessionStorage.setItem('demo_session_id', sessionId);
}

/**
 * Rensa demo-tracking vid logout/expiry
 */
export function clearDemoTracking(): void {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('demo_start_time');
  sessionStorage.removeItem('demo_session_id');
  
  // Reset PostHog
  if (window.posthog?.reset) {
    try {
      window.posthog.reset();
    } catch {
      // Ignorera fel
    }
  }
}

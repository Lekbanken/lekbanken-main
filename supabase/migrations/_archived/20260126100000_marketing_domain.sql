-- Marketing Domain: Features showcase + Updates/News feed
-- Public read access, system_admin write access

BEGIN;

--------------------------------------------------------------------------------
-- marketing_features: Showcased features on marketing pages
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  icon_name TEXT, -- lucide/heroicon name (e.g., 'funnel', 'layout-grid')
  image_url TEXT,
  
  -- Filter dimensions
  audience TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN ('school', 'business', 'sports', 'event', 'all')),
  use_case TEXT NOT NULL DEFAULT 'planning'
    CHECK (use_case IN ('planning', 'execution', 'export', 'collaboration', 'safety')),
  context TEXT NOT NULL DEFAULT 'any'
    CHECK (context IN ('indoor', 'outdoor', 'digital', 'hybrid', 'any')),
  
  -- Flexible tags for future filtering
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Proof/social indicators
  related_games_count INTEGER DEFAULT 0,
  
  -- Sorting & display
  priority INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.marketing_features IS 'Features displayed on marketing/sales pages with filtering support';
COMMENT ON COLUMN public.marketing_features.audience IS 'Target audience: school, business, sports, event, all';
COMMENT ON COLUMN public.marketing_features.use_case IS 'Primary use case: planning, execution, export, collaboration, safety';
COMMENT ON COLUMN public.marketing_features.context IS 'Usage context: indoor, outdoor, digital, hybrid, any';
COMMENT ON COLUMN public.marketing_features.related_games_count IS 'Approximate number of games this feature applies to (manual/cached)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_features_status ON public.marketing_features(status);
CREATE INDEX IF NOT EXISTS idx_marketing_features_priority ON public.marketing_features(priority DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_features_audience ON public.marketing_features(audience);
CREATE INDEX IF NOT EXISTS idx_marketing_features_use_case ON public.marketing_features(use_case);
CREATE INDEX IF NOT EXISTS idx_marketing_features_featured ON public.marketing_features(is_featured) WHERE is_featured = TRUE;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_marketing_features_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_features_updated_at ON public.marketing_features;
CREATE TRIGGER marketing_features_updated_at
  BEFORE UPDATE ON public.marketing_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_features_updated_at();

-- RLS
ALTER TABLE public.marketing_features ENABLE ROW LEVEL SECURITY;

-- Public can read published features
DROP POLICY IF EXISTS marketing_features_public_select ON public.marketing_features;
CREATE POLICY marketing_features_public_select
  ON public.marketing_features
  FOR SELECT
  USING (status = 'published');

-- System admins can do everything
DROP POLICY IF EXISTS marketing_features_admin_all ON public.marketing_features;
CREATE POLICY marketing_features_admin_all
  ON public.marketing_features
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());


--------------------------------------------------------------------------------
-- marketing_updates: "Senaste nytt" / News feed for pre-launch momentum
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  type TEXT NOT NULL DEFAULT 'feature'
    CHECK (type IN ('feature', 'improvement', 'fix', 'milestone', 'content')),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  
  -- Categorization
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Publishing
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.marketing_updates IS 'News/changelog feed for marketing pages - "Senaste nytt"';
COMMENT ON COLUMN public.marketing_updates.type IS 'Update type: feature, improvement, fix, milestone, content';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_updates_status ON public.marketing_updates(status);
CREATE INDEX IF NOT EXISTS idx_marketing_updates_published ON public.marketing_updates(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_updates_type ON public.marketing_updates(type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_marketing_updates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_updates_updated_at ON public.marketing_updates;
CREATE TRIGGER marketing_updates_updated_at
  BEFORE UPDATE ON public.marketing_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_marketing_updates_updated_at();

-- RLS
ALTER TABLE public.marketing_updates ENABLE ROW LEVEL SECURITY;

-- Public can read published updates
DROP POLICY IF EXISTS marketing_updates_public_select ON public.marketing_updates;
CREATE POLICY marketing_updates_public_select
  ON public.marketing_updates
  FOR SELECT
  USING (status = 'published');

-- System admins can do everything
DROP POLICY IF EXISTS marketing_updates_admin_all ON public.marketing_updates;
CREATE POLICY marketing_updates_admin_all
  ON public.marketing_updates
  FOR ALL
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());


--------------------------------------------------------------------------------
-- Seed data: 10 features + 5 updates
--------------------------------------------------------------------------------

-- Features
INSERT INTO public.marketing_features (title, subtitle, description, icon_name, audience, use_case, context, tags, related_games_count, priority, is_featured, status) VALUES
  ('Smarta filter', 'Hitta rätt aktivitet på sekunder', 'Filtrera på ålder, gruppstorlek, utrustning, miljö och mycket mer. Våra smarta filter hjälper dig hitta den perfekta leken för just din situation.', 'funnel', 'all', 'planning', 'any', ARRAY['sök', 'filter', 'bibliotek'], 500, 100, TRUE, 'published'),
  ('Pass-byggare', 'Skapa engagerande pass enkelt', 'Dra och släpp aktiviteter i pass. Sätt tider och anteckningar för varje aktivitet. Perfekt för att planera workshops, lektioner eller teambuilding-dagar.', 'layout-grid', 'all', 'planning', 'any', ARRAY['planering', 'pass', 'schema'], 500, 95, TRUE, 'published'),
  ('Delning & export', 'Dela med kollegor eller skriv ut', 'Dela pass med kollegor eller exportera till PDF för offline-användning. Skapa professionella utskrifter med instruktioner och bilder.', 'share', 'business', 'export', 'any', ARRAY['delning', 'pdf', 'export', 'utskrift'], 500, 90, TRUE, 'published'),
  ('Säkerhet & samtycke', 'Inbyggda säkerhetskontroller', 'Säkerhetskontroller och samtyckesinsamling för deltagarnas välbefinnande. Riskbedömningar, nödkontakter och dokumentation på ett ställe.', 'shield-check', 'school', 'safety', 'any', ARRAY['säkerhet', 'samtycke', 'gdpr'], 200, 85, TRUE, 'published'),
  ('SSO-inloggning', 'Logga in med organisationskonto', 'Stöd för Single Sign-On via Microsoft, Google och andra leverantörer. Perfekt för organisationer med befintliga IT-system.', 'key', 'business', 'collaboration', 'digital', ARRAY['sso', 'inloggning', 'enterprise'], 0, 70, FALSE, 'published'),
  ('Delade mappar', 'Samarbeta i team', 'Skapa mappar för ditt team och dela aktiviteter och pass. Alla ser samma innehåll och kan bidra.', 'folder', 'business', 'collaboration', 'digital', ARRAY['team', 'samarbete', 'mappar'], 500, 75, FALSE, 'published'),
  ('Återanvändbara mallar', 'Spara tid med mallar', 'Spara dina bästa pass som mallar och återanvänd dem. Perfekt för återkommande events eller standardiserade workshops.', 'document-duplicate', 'business', 'planning', 'any', ARRAY['mallar', 'återanvändning', 'effektivitet'], 500, 65, FALSE, 'published'),
  ('Spelläge', 'Kör aktiviteter live med deltagare', 'Interaktivt spelläge där deltagare kan delta via sina mobiler. Poäng, tävlingar och engagemang i realtid.', 'play', 'event', 'execution', 'hybrid', ARRAY['spel', 'interaktivt', 'live', 'mobil'], 150, 80, TRUE, 'published'),
  ('Utomhusaktiviteter', 'Lekar för friluftslivet', 'Stort bibliotek med aktiviteter anpassade för utomhusmiljöer. Orientering, naturlekar och gruppaktiviteter i det fria.', 'sun', 'sports', 'execution', 'outdoor', ARRAY['utomhus', 'natur', 'friluftsliv'], 120, 60, FALSE, 'published'),
  ('Analys & statistik', 'Förstå vad som fungerar', 'Se vilka aktiviteter som är populära, hur lång tid de tar och vad deltagarna tycker. Data-driven planering.', 'chart-bar', 'business', 'planning', 'digital', ARRAY['analys', 'statistik', 'data'], 500, 55, FALSE, 'published');

-- Updates (Senaste nytt)
INSERT INTO public.marketing_updates (type, title, body, tags, published_at, status) VALUES
  ('milestone', 'Lekbanken närmar sig lansering!', 'Efter månader av utveckling och testning börjar vi se slutet på tunneln. Vår beta har testats av över 50 aktivitetsledare och feedbacken har varit fantastisk.', ARRAY['lansering', 'beta'], NOW() - INTERVAL '2 days', 'published'),
  ('feature', 'Nytt: Spelläge med realtidspoäng', 'Nu kan deltagare delta i aktiviteter via sina mobiler och samla poäng i realtid. Perfekt för tävlingar och engagerande gruppaktiviteter.', ARRAY['spelläge', 'gamification'], NOW() - INTERVAL '5 days', 'published'),
  ('improvement', 'Förbättrad PDF-export', 'Vi har lyssnat på er feedback och gjort PDF-exporten ännu bättre. Nu med bilder, QR-koder och snyggare layout.', ARRAY['pdf', 'export'], NOW() - INTERVAL '1 week', 'published'),
  ('content', '50 nya utomhuslekar tillagda', 'Vårt bibliotek växer! Vi har lagt till 50 nya aktiviteter perfekta för utomhusbruk. Allt från enkla lekar till mer avancerade teambuilding-övningar.', ARRAY['innehåll', 'utomhus'], NOW() - INTERVAL '2 weeks', 'published'),
  ('fix', 'Förbättrad prestanda för stora pass', 'Pass med många aktiviteter laddar nu mycket snabbare. Vi har optimerat databasen och gränssnittet för bättre upplevelse.', ARRAY['prestanda', 'optimering'], NOW() - INTERVAL '3 weeks', 'published');

COMMIT;

-- Seed Standard Images for all Main Purposes
-- Run this in Supabase Dashboard > SQL Editor
-- 
-- This script creates media entries and links them to purposes via media_templates
-- 
-- IMPORTANT: Replace BASE_URL with your actual Supabase storage URL
-- Example: https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/game-media

-- Configuration
DO $$
DECLARE
  base_url TEXT := 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/game-media';
  
  -- Purpose IDs
  samarbete_id UUID := '72a9b8ae-4b01-4c86-b1e3-9fcf9938ed54';
  motorik_id UUID := 'c2043912-66d4-4143-8714-f5bb0b518acf';
  kognition_id UUID := '3b0939a9-ca36-4b2b-9d8b-f2908d2a49a4';
  kreativitet_id UUID := '59596e93-821d-4450-8e5e-4f214fed8168';
  kommunikation_id UUID := '93500ab9-6ff3-4a0b-bb0d-b9111486a364';
  sjalvutveckling_id UUID := '704fe093-7b6f-45cf-ac38-c9ab2c6e5caa';
  reflektion_id UUID := 'cb2533f4-51af-4add-929b-2747f6e43b81';
  upptackande_id UUID := 'fddf7912-4616-446b-b68a-6aa1679dd7de';
  tavling_id UUID := '2b83cedf-1f9d-4427-852f-ab781a2eeb51';
  kunskap_id UUID := '49a6cc94-52be-4a2e-92a6-55503b5988b6';
  
  -- Media IDs (we'll generate them)
  media_id UUID;
  i INT;
BEGIN
  
  -- Clean up existing template mappings (keep media files)
  DELETE FROM media_templates WHERE main_purpose_id IS NOT NULL;
  
  -- ============================================
  -- Samarbete & Gemenskap (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Samarbete & Gemenskap ' || i,
      'template',
      base_url || '/standard-images/Samarbete%20%26%20Gemenskap%20' || i || '.webp',
      'Standardbild för Samarbete & Gemenskap',
      jsonb_build_object('purpose', 'samarbete_och_gemenskap', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Samarbete & Gemenskap ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('samarbete_gemenskap_' || i, 'Samarbete & Gemenskap ' || i, media_id, samarbete_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Motorik & Rörelse (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Motorik & Rörelse ' || i,
      'template',
      base_url || '/standard-images/Motorik%20%26%20Rorelse%20' || i || '.webp',
      'Standardbild för Motorik & Rörelse',
      jsonb_build_object('purpose', 'motorik_och_rorelse', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Motorik & Rörelse ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('motorik_rorelse_' || i, 'Motorik & Rörelse ' || i, media_id, motorik_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Kognition & Fokus (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Kognition & Fokus ' || i,
      'template',
      base_url || '/standard-images/Kognition%20%26%20Fokus%20' || i || '.webp',
      'Standardbild för Kognition & Fokus',
      jsonb_build_object('purpose', 'kognition_och_fokus', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Kognition & Fokus ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('kognition_fokus_' || i, 'Kognition & Fokus ' || i, media_id, kognition_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Kreativitet & Uttryck (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Kreativitet & Uttryck ' || i,
      'template',
      base_url || '/standard-images/Kreativitet%20%26%20Uttryck%20' || i || '.webp',
      'Standardbild för Kreativitet & Uttryck',
      jsonb_build_object('purpose', 'kreativitet_och_uttryck', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Kreativitet & Uttryck ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('kreativitet_uttryck_' || i, 'Kreativitet & Uttryck ' || i, media_id, kreativitet_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Kommunikation & Språk (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Kommunikation & Språk ' || i,
      'template',
      base_url || '/standard-images/Kommunikation%20%26%20Sprak%20' || i || '.webp',
      'Standardbild för Kommunikation & Språk',
      jsonb_build_object('purpose', 'kommunikation_och_sprak', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Kommunikation & Språk ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('kommunikation_sprak_' || i, 'Kommunikation & Språk ' || i, media_id, kommunikation_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Självutveckling & Emotionell Medvetenhet (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Självutveckling & Emotionell Medvetenhet ' || i,
      'template',
      base_url || '/standard-images/Sjalvutveckling%20%26%20Emotionell%20Medvetenhet%20' || i || '.webp',
      'Standardbild för Självutveckling & Emotionell Medvetenhet',
      jsonb_build_object('purpose', 'sjalvutveckling_och_emotionell_medvetenhet', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Självutveckling & Emotionell Medvetenhet ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('sjalvutveckling_emotionell_' || i, 'Självutveckling & Emotionell Medvetenhet ' || i, media_id, sjalvutveckling_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Reflektion & Mindfulness (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Reflektion & Mindfulness ' || i,
      'template',
      base_url || '/standard-images/Reflektion%20%26%20Mindfulness%20' || i || '.webp',
      'Standardbild för Reflektion & Mindfulness',
      jsonb_build_object('purpose', 'reflektion_och_mindfulness', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Reflektion & Mindfulness ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('reflektion_mindfulness_' || i, 'Reflektion & Mindfulness ' || i, media_id, reflektion_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Upptäckande & Äventyr (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Upptäckande & Äventyr ' || i,
      'template',
      base_url || '/standard-images/Upptackande%20%26%20Aventyr%20' || i || '.webp',
      'Standardbild för Upptäckande & Äventyr',
      jsonb_build_object('purpose', 'upptackande_och_aventyr', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Upptäckande & Äventyr ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('upptackande_aventyr_' || i, 'Upptäckande & Äventyr ' || i, media_id, upptackande_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Tävling & Motivation (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Tävling & Motivation ' || i,
      'template',
      base_url || '/standard-images/Tavling%20%26%20Motivation%20' || i || '.webp',
      'Standardbild för Tävling & Motivation',
      jsonb_build_object('purpose', 'tavling_och_motivation', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Tävling & Motivation ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('tavling_motivation_' || i, 'Tävling & Motivation ' || i, media_id, tavling_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- ============================================
  -- Kunskap & Lärande (5 images)
  -- ============================================
  FOR i IN 1..5 LOOP
    INSERT INTO media (name, type, url, alt_text, metadata)
    VALUES (
      'Kunskap & Lärande ' || i,
      'template',
      base_url || '/standard-images/Kunskap%20%26%20Larande%20' || i || '.webp',
      'Standardbild för Kunskap & Lärande',
      jsonb_build_object('purpose', 'kunskap_och_larande', 'index', i)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO media_id;
    
    IF media_id IS NULL THEN
      SELECT id INTO media_id FROM media 
      WHERE name = 'Kunskap & Lärande ' || i AND type = 'template' LIMIT 1;
    END IF;
    
    IF media_id IS NOT NULL THEN
      INSERT INTO media_templates (template_key, name, media_id, main_purpose_id, priority)
      VALUES ('kunskap_larande_' || i, 'Kunskap & Lärande ' || i, media_id, kunskap_id, 10 - i)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Standard images seeded successfully!';
END $$;

-- Verify the results
SELECT 
  p.name as purpose_name,
  COUNT(mt.id) as template_count
FROM purposes p
LEFT JOIN media_templates mt ON mt.main_purpose_id = p.id
WHERE p.parent_id IS NULL
GROUP BY p.id, p.name
ORDER BY p.name;

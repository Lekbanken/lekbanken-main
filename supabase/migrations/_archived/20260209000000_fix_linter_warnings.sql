-- ============================================================================
-- Migration: Fix Database Linter Warnings
-- Date: 2026-02-09
-- Description: 
--   1. Drop orphaned backup table (user_metadata_backup)
--   2. Fix search_path on all flagged functions for security
-- ============================================================================

-- ============================================================================
-- 1. DROP ORPHANED BACKUP TABLE
-- ============================================================================
-- This table was likely created during a manual migration and should be removed.
-- If RLS is needed instead, uncomment the ALTER TABLE line and remove the DROP.

DROP TABLE IF EXISTS public.user_metadata_backup;
-- Alternative: ALTER TABLE public.user_metadata_backup ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH_PATH (Security Hardening)
-- ============================================================================
-- Setting search_path to empty string prevents search_path injection attacks.
-- Each function is recreated with SET search_path = '' for immutability.

-- 2.1 update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2.2 cleanup_trigger_idempotency_keys
CREATE OR REPLACE FUNCTION public.cleanup_trigger_idempotency_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.trigger_idempotency_keys
  WHERE created_at < now() - INTERVAL '24 hours';
  RETURN NULL;
END;
$$;

-- 2.3 calculate_next_retry
-- Must drop first because parameter names changed
DROP FUNCTION IF EXISTS public.calculate_next_retry(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.calculate_next_retry(
  p_retry_count INTEGER,
  p_base_delay_seconds INTEGER DEFAULT 60
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  -- Exponential backoff: base_delay * 2^retry_count
  RETURN now() + (p_base_delay_seconds * power(2, p_retry_count)) * INTERVAL '1 second';
END;
$$;

-- 2.4 log_dunning_action
CREATE OR REPLACE FUNCTION public.log_dunning_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.dunning_action_log (
    subscription_id,
    action_type,
    old_status,
    new_status,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    OLD.status,
    NEW.status,
    jsonb_build_object(
      'triggered_at', now(),
      'trigger_name', TG_NAME
    )
  );
  RETURN NEW;
END;
$$;

-- 2.5 update_dunning_timestamps
CREATE OR REPLACE FUNCTION public.update_dunning_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2.6 generate_gift_code
CREATE OR REPLACE FUNCTION public.generate_gift_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    IF i IN (4, 8) THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- 2.7 redeem_gift_code
CREATE OR REPLACE FUNCTION public.redeem_gift_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_gift RECORD;
  v_result JSONB;
BEGIN
  -- Find and lock the gift code
  SELECT * INTO v_gift
  FROM public.gift_codes
  WHERE code = upper(trim(p_code))
    AND redeemed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  -- Mark as redeemed
  UPDATE public.gift_codes
  SET redeemed_at = now(),
      redeemed_by = p_user_id
  WHERE id = v_gift.id;

  RETURN jsonb_build_object(
    'success', true,
    'gift_id', v_gift.id,
    'value', v_gift.value,
    'type', v_gift.gift_type
  );
END;
$$;

-- 2.8 update_gift_timestamp
CREATE OR REPLACE FUNCTION public.update_gift_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2.9 generate_quote_number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(quote_number, '^Q' || v_year || '-', ''), '')::INTEGER
  ), 0) + 1
  INTO v_seq
  FROM public.quotes
  WHERE quote_number LIKE 'Q' || v_year || '-%';

  RETURN 'Q' || v_year || '-' || lpad(v_seq::TEXT, 5, '0');
END;
$$;

-- 2.10 calculate_quote_totals
CREATE OR REPLACE FUNCTION public.calculate_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_tax NUMERIC;
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total), 0)
  INTO v_subtotal
  FROM public.quote_line_items
  WHERE quote_id = NEW.quote_id;

  v_tax := v_subtotal * COALESCE(
    (SELECT tax_rate FROM public.quotes WHERE id = NEW.quote_id), 
    0.25
  );
  v_total := v_subtotal + v_tax;

  UPDATE public.quotes
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      total = v_total,
      updated_at = now()
  WHERE id = NEW.quote_id;

  RETURN NEW;
END;
$$;

-- 2.11 log_quote_activity
CREATE OR REPLACE FUNCTION public.log_quote_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.quote_activity_log (
    quote_id,
    action,
    old_data,
    new_data,
    performed_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2.12 update_quote_timestamp
CREATE OR REPLACE FUNCTION public.update_quote_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2.13 calculate_line_item_total
CREATE OR REPLACE FUNCTION public.calculate_line_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.total := NEW.quantity * NEW.unit_price * (1 - COALESCE(NEW.discount_percent, 0) / 100);
  RETURN NEW;
END;
$$;

-- 2.14 record_usage
CREATE OR REPLACE FUNCTION public.record_usage(
  p_tenant_id UUID,
  p_metric_name TEXT,
  p_quantity NUMERIC DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.usage_records (
    tenant_id,
    metric_name,
    quantity,
    metadata,
    recorded_at
  ) VALUES (
    p_tenant_id,
    p_metric_name,
    p_quantity,
    p_metadata,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2.15 aggregate_usage_for_period
CREATE OR REPLACE FUNCTION public.aggregate_usage_for_period(
  p_tenant_id UUID,
  p_metric_name TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total
  FROM public.usage_records
  WHERE tenant_id = p_tenant_id
    AND metric_name = p_metric_name
    AND recorded_at >= p_start_date
    AND recorded_at < p_end_date;

  RETURN v_total;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  -- Verify backup table is gone
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_metadata_backup'
  ) THEN
    RAISE WARNING 'user_metadata_backup still exists';
  ELSE
    RAISE NOTICE '✓ user_metadata_backup dropped successfully';
  END IF;
END;
$$;

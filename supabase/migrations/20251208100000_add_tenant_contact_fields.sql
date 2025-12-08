-- Add contact fields to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Optional: ensure slug uniqueness already handled by previous migration
-- Keep existing indexes; no RLS change needed since tenants already protected.

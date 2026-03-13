-- Fix: "infinite recursion detected in policy for relation users"
--
-- Root cause: The "demo_user_flag_protection" UPDATE policy on public.users
-- does SELECT FROM users WHERE id = auth.uid() inside its USING clause.
-- This triggers SELECT policies on users, which get evaluated, causing
-- infinite recursion.
--
-- Fix: Replace the RLS policy with a BEFORE UPDATE trigger that checks
-- the same constraints without triggering RLS evaluation. Triggers with
-- SECURITY DEFINER or owned by the table owner bypass RLS.

-- Step 1: Drop the recursive policy
DROP POLICY IF EXISTS "demo_user_flag_protection" ON public.users;

-- Step 2: Create a trigger function that enforces the same rule
CREATE OR REPLACE FUNCTION public.enforce_demo_flag_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Allow system admins to change anything
  IF is_system_admin_jwt_only() THEN
    RETURN NEW;
  END IF;

  -- Prevent non-admins from changing is_demo_user
  IF OLD.is_demo_user IS DISTINCT FROM NEW.is_demo_user THEN
    RAISE EXCEPTION 'Cannot modify is_demo_user flag'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Prevent non-admins from changing is_ephemeral
  IF OLD.is_ephemeral IS DISTINCT FROM NEW.is_ephemeral THEN
    RAISE EXCEPTION 'Cannot modify is_ephemeral flag'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
DROP TRIGGER IF EXISTS enforce_demo_flags ON public.users;
CREATE TRIGGER enforce_demo_flags
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_flag_protection();

-- BUG-020 / DD-RACE-1: Atomic seat assignment to prevent TOCTOU race condition.
-- Replaces app-level count→check→insert with a single SQL statement that
-- conditionally inserts only when the seat count is below the purchased limit.

CREATE OR REPLACE FUNCTION public.assign_seat_if_available(
  p_tenant_id uuid,
  p_user_id uuid,
  p_subscription_id uuid,
  p_billing_product_id uuid,
  p_name text DEFAULT '',
  p_assigned_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seats_purchased int;
  v_sub_status text;
  v_sub_tenant_id uuid;
  v_new_id uuid;
BEGIN
  -- Lock the subscription row to serialize concurrent seat assignments
  SELECT seats_purchased, status, tenant_id
    INTO v_seats_purchased, v_sub_status, v_sub_tenant_id
    FROM tenant_subscriptions
   WHERE id = p_subscription_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  IF v_sub_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'subscription_tenant_mismatch';
  END IF;

  IF v_sub_status = 'canceled' THEN
    RAISE EXCEPTION 'subscription_canceled';
  END IF;

  -- Atomic count + conditional insert
  INSERT INTO tenant_seat_assignments (
    tenant_id, user_id, subscription_id, billing_product_id,
    name, status, assigned_by_user_id
  )
  SELECT
    p_tenant_id, p_user_id, p_subscription_id, p_billing_product_id,
    p_name, 'active', p_assigned_by
  WHERE (
    SELECT count(*)
      FROM tenant_seat_assignments
     WHERE subscription_id = p_subscription_id
       AND status NOT IN ('released', 'revoked')
  ) < v_seats_purchased
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'no_seats_available';
  END IF;

  RETURN v_new_id;
END;
$$;

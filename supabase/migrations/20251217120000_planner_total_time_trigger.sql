-- Keep plans.total_time_minutes in sync with plan_blocks

CREATE OR REPLACE FUNCTION public.recalc_plan_total_time_minutes(p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT COALESCE(
    SUM(
      COALESCE(pb.duration_minutes, g.time_estimate_min, 0)
    ),
    0
  )
  INTO v_total
  FROM public.plan_blocks pb
  LEFT JOIN public.games g ON g.id = pb.game_id
  WHERE pb.plan_id = p_plan_id;

  UPDATE public.plans
  SET total_time_minutes = v_total,
      updated_at = now()
  WHERE id = p_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.plan_id IS DISTINCT FROM NEW.plan_id) THEN
      PERFORM public.recalc_plan_total_time_minutes(OLD.plan_id);
    END IF;
    PERFORM public.recalc_plan_total_time_minutes(NEW.plan_id);
    RETURN NULL;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_plan_total_time_minutes(OLD.plan_id);
    RETURN NULL;
  END IF;

  -- INSERT
  PERFORM public.recalc_plan_total_time_minutes(NEW.plan_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS plan_blocks_recalc_plan_total_time_minutes_ins ON public.plan_blocks;
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_ins
AFTER INSERT ON public.plan_blocks
FOR EACH ROW
EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();

DROP TRIGGER IF EXISTS plan_blocks_recalc_plan_total_time_minutes_del ON public.plan_blocks;
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_del
AFTER DELETE ON public.plan_blocks
FOR EACH ROW
EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();

DROP TRIGGER IF EXISTS plan_blocks_recalc_plan_total_time_minutes_upd ON public.plan_blocks;
CREATE TRIGGER plan_blocks_recalc_plan_total_time_minutes_upd
AFTER UPDATE OF duration_minutes, game_id, block_type, plan_id ON public.plan_blocks
FOR EACH ROW
EXECUTE FUNCTION public.trg_plan_blocks_recalc_plan_total_time_minutes();

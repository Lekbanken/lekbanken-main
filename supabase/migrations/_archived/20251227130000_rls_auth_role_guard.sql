-- =============================================================================
-- Migration: 20251227130000_rls_auth_role_guard.sql
-- Description: Add auth.role() = 'authenticated' guard to play primitives RLS
-- Notes:
-- - Defense-in-depth: even if policies evaluate truthy for anonymous, reject
-- - Tables: session_signals, session_time_bank, session_time_bank_ledger, session_triggers
-- =============================================================================

-- session_signals
DROP POLICY IF EXISTS "session_signals_select" ON public.session_signals;
CREATE POLICY "session_signals_select" ON public.session_signals
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_signals.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_signals_insert" ON public.session_signals;
CREATE POLICY "session_signals_insert" ON public.session_signals
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_signals.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );


-- session_time_bank
DROP POLICY IF EXISTS "session_time_bank_select" ON public.session_time_bank;
CREATE POLICY "session_time_bank_select" ON public.session_time_bank
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_time_bank.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_time_bank_insert" ON public.session_time_bank;
CREATE POLICY "session_time_bank_insert" ON public.session_time_bank
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_time_bank.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_time_bank_update" ON public.session_time_bank;
CREATE POLICY "session_time_bank_update" ON public.session_time_bank
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_time_bank.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );


-- session_time_bank_ledger
DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.session_time_bank_ledger;
CREATE POLICY "time_bank_ledger_select" ON public.session_time_bank_ledger
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_time_bank_ledger.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "time_bank_ledger_insert" ON public.session_time_bank_ledger;
CREATE POLICY "time_bank_ledger_insert" ON public.session_time_bank_ledger
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_time_bank_ledger.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );


-- session_triggers (align with same pattern)
DROP POLICY IF EXISTS "session_triggers_select" ON public.session_triggers;
CREATE POLICY "session_triggers_select" ON public.session_triggers
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_triggers.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_triggers_insert" ON public.session_triggers;
CREATE POLICY "session_triggers_insert" ON public.session_triggers
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_triggers.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_triggers_update" ON public.session_triggers;
CREATE POLICY "session_triggers_update" ON public.session_triggers
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_triggers.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

DROP POLICY IF EXISTS "session_triggers_delete" ON public.session_triggers;
CREATE POLICY "session_triggers_delete" ON public.session_triggers
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.participant_sessions ps
        WHERE ps.id = session_triggers.session_id
        AND ps.host_user_id = auth.uid()
      )
      OR public.is_global_admin()
    )
  );

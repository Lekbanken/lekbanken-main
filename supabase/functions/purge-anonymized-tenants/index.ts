// deno-lint-ignore-file
//
// Supabase Edge Function: purge-anonymized-tenants
// NOTE: This file runs in Deno runtime, not Node.js. TypeScript errors in VS Code are expected
// unless you have the Deno VS Code extension installed and configured.
//
// Denna funktion körs dagligen via Supabase Scheduled Functions (cron) för att:
// 1. Hitta anonymiserade tenants vars purge_after har passerat
// 2. Permanent-radera dem (CASCADE hanterar relaterad data)
// 3. Logga resultat för audit
//
// Deploy: supabase functions deploy purge-anonymized-tenants
// Schedule via Supabase Dashboard → Edge Functions → Scheduled Functions:
//   Cron expression: 0 4 * * * (dagligen kl 04:00 UTC)

// Deno ambient declarations for VS Code compatibility
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// @ts-expect-error — Deno HTTP import, not resolvable by Node TS checker
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const JOB_NAME = 'purge_anonymized_tenants';

/** Max tenants to purge per invocation — prevents runaway deletes */
const BATCH_LIMIT = 50;

/** Max wall-clock time (ms) for the purge loop — break early if DB is slow */
const TIMEOUT_BUDGET_MS = 20_000;

/** Max error entries to keep (prevents bloated payloads) */
const MAX_ERRORS = 20;
const MAX_ERROR_MSG_LENGTH = 300;

interface PurgeResult {
  success: boolean;
  purged: number;
  remaining: number;
  skippedTimeout: number;
  runId: string;
  tenantIds: string[];
  errors: string[];
  executedAt: string;
  dryRun: boolean;
  elapsedMs?: number;
  message?: string;
}

/** Generate a v4-ish UUID without crypto imports (Deno-safe) */
function generateRunId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Push an error string, capped at MAX_ERRORS with truncated messages */
function pushError(errors: string[], msg: string): void {
  if (errors.length > MAX_ERRORS) return; // sentinel already added
  if (errors.length === MAX_ERRORS) {
    errors.push(`... additional errors truncated (limit: ${MAX_ERRORS})`);
    return;
  }
  errors.push(msg.length > MAX_ERROR_MSG_LENGTH ? msg.slice(0, MAX_ERROR_MSG_LENGTH) + '…' : msg);
}

interface TenantRow {
  id: string;
  anonymized_at: string;
  purge_after: string;
}

Deno.serve(async (req: Request) => {
  // Verify authorization
  const authHeader = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Allow both service key and dedicated API key
  const expectedKey = Deno.env.get('CLEANUP_API_KEY');
  if (expectedKey && authHeader !== `Bearer ${expectedKey}` && authHeader !== `Bearer ${supabaseServiceKey}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Support dry-run mode via query param
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === 'true';

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const runId = generateRunId();
  const startedAt = Date.now();

  const result: PurgeResult = {
    success: false,
    purged: 0,
    remaining: 0,
    skippedTimeout: 0,
    runId,
    tenantIds: [],
    errors: [],
    executedAt: new Date().toISOString(),
    dryRun,
  };

  // Helper: finalize the job run row and return HTTP response
  async function finalize(httpStatus: number): Promise<Response> {
    const elapsed = Date.now() - startedAt;
    result.elapsedMs = elapsed;

    const status = result.errors.length > 0
      ? 'fail'
      : result.skippedTimeout > 0 || result.remaining > 0
      ? 'warn'
      : 'ok';

    // Write/update job run row (best-effort — don't fail the response if this fails)
    try {
      await supabase
        .from('system_jobs_runs')
        .upsert({
          id: runId,
          job_name: JOB_NAME,
          status,
          started_at: result.executedAt,
          finished_at: new Date().toISOString(),
          purged: result.purged,
          remaining: result.remaining,
          skipped_timeout: result.skippedTimeout,
          elapsed_ms: elapsed,
          errors: result.errors,
          metadata: { dry_run: dryRun, batch_limit: BATCH_LIMIT },
        }, { onConflict: 'id' });
    } catch (e) {
      console.error(`[${runId}] Failed to write job run row:`, e);
    }

    return new Response(
      JSON.stringify(result),
      { status: httpStatus, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 0a. Clean up stale "running" rows from previous crashed invocations
    const { data: staleRuns } = await supabase
      .from('system_jobs_runs')
      .update({
        status: 'fail',
        finished_at: new Date().toISOString(),
        metadata: { reason: 'stale_run_cleanup', cleaned_by: runId },
      })
      .eq('job_name', JOB_NAME)
      .eq('status', 'running')
      .is('finished_at', null)
      .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .select('id');

    if (staleRuns && staleRuns.length > 0) {
      console.log(`[${runId}] Cleaned ${staleRuns.length} stale running row(s): ${staleRuns.map((r: { id: string }) => r.id).join(', ')}`);
    }

    // 0b. Register job run as "running"
    await supabase
      .from('system_jobs_runs')
      .insert({
        id: runId,
        job_name: JOB_NAME,
        status: 'running',
        started_at: result.executedAt,
        metadata: { dry_run: dryRun, batch_limit: BATCH_LIMIT },
      });

    // 1. Find anonymized tenants whose purge_after has passed (batch-limited)
    const { data: expiredTenants, error: queryError, count } = await supabase
      .from('tenants')
      .select('id, anonymized_at, purge_after', { count: 'exact' })
      .eq('status', 'anonymized')
      .lte('purge_after', new Date().toISOString())
      .order('purge_after', { ascending: true })
      .limit(BATCH_LIMIT)
      .returns<TenantRow[]>();

    if (queryError) {
      pushError(result.errors, `Query error: ${queryError.message}`);
      return finalize(500);
    }

    if (!expiredTenants || expiredTenants.length === 0) {
      result.success = true;
      result.message = 'No tenants to purge';
      return finalize(200);
    }

    console.log(`[${runId}] Found ${expiredTenants.length} anonymized tenants to purge (${(count ?? 0) - expiredTenants.length} remaining after this batch)`);
    result.remaining = Math.max(0, (count ?? expiredTenants.length) - expiredTenants.length);

    if (dryRun) {
      result.success = true;
      result.tenantIds = expiredTenants.map((t: TenantRow) => t.id);
      result.purged = expiredTenants.length;
      result.message = 'Dry run — no tenants deleted';
      return finalize(200);
    }

    // 2. Delete each expired tenant one-by-one (CASCADE handles all related data)
    // NOTE: tenant_audit_logs FK is ON DELETE CASCADE, so audit rows are
    // destroyed with the tenant. We write to system_audit_logs (no FK)
    // BEFORE deleting so we have a compliance-grade audit trail.
    // Partial failures are tolerated — failed tenants are skipped and retried next run.
    // Timeout budget: break early if wall-clock exceeds TIMEOUT_BUDGET_MS.
    for (const tenant of expiredTenants) {
      // Check timeout budget before each tenant
      if (Date.now() - startedAt > TIMEOUT_BUDGET_MS) {
        const skipped = expiredTenants.length - result.purged - result.errors.length;
        result.skippedTimeout = skipped;
        result.remaining += skipped;
        console.log(`[${runId}] Timeout budget exceeded after ${Date.now() - startedAt}ms — ${skipped} tenants deferred to next run`);
        break;
      }

      try {
        // Write system audit log BEFORE delete (survives CASCADE)
        const { error: auditError } = await supabase
          .from('system_audit_logs')
          .insert({
            event_type: 'TENANT_PURGED_AUTO',
            actor_user_id: null,
            tenant_id: tenant.id,
            metadata: {
              run_id: runId,
              trigger: 'scheduled_purge',
              anonymized_at: tenant.anonymized_at,
              purge_after: tenant.purge_after,
            },
          });

        if (auditError) {
          // Audit insert failed — skip this tenant (don't delete without audit trail)
          pushError(result.errors, `Audit insert failed for ${tenant.id}: ${auditError.message}`);
          console.error(`[${runId}] Skipping tenant ${tenant.id} — audit insert failed: ${auditError.message}`);
          continue;
        }

        // Delete vault entry first
        await supabase
          .from('tenant_restore_vault')
          .delete()
          .eq('tenant_id', tenant.id);

        // Hard delete the tenant — CASCADE removes everything (including audit logs)
        const { error: deleteError } = await supabase
          .from('tenants')
          .delete()
          .eq('id', tenant.id);

        if (deleteError) {
          pushError(result.errors, `Failed to purge ${tenant.id}: ${deleteError.message}`);
          continue;
        }

        result.tenantIds.push(tenant.id);
        result.purged++;
        console.log(`[${runId}] Purged tenant ${tenant.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        pushError(result.errors, `Exception purging ${tenant.id}: ${msg}`);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.skippedTimeout > 0
      ? `Timeout after ${Date.now() - startedAt}ms. ${result.purged} purged, ${result.skippedTimeout} deferred.`
      : result.remaining > 0
      ? `Batch complete. ${result.remaining} tenants remain for next run.`
      : 'All expired tenants purged.';

    return finalize(result.success ? 200 : 207);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pushError(result.errors, `Fatal error: ${msg}`);
    return finalize(500);
  }
});

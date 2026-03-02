# Tenant Anonymization — GDPR Compliance

> SSoT for the anonymization lifecycle. Updated 2026-03-02.

## Status definitions

| Status       | Meaning                                              |
|------------- |------------------------------------------------------|
| `archived`   | Soft-disabled. All data intact. Can be reactivated.  |
| `anonymized` | PII scrubbed, vault backup created. 90-day countdown.|

## Lifecycle

```
active/trial/demo → archived → anonymized → purged (hard delete)
                                    ↑              
                               restore (→ archived)
```

## Retention

- **90 days** from anonymization until auto-purge.
- `purge_after` column on `tenants` drives the cron job.
- Edge function `purge-anonymized-tenants` runs daily at 04:00 UTC.
- Processes max **50 tenants per batch** (safety limit).

## PII scrub list

When `anonymizeTenant()` runs, the following data is scrubbed:

### tenants table
| Column          | Set to                           |
|-----------------|----------------------------------|
| `name`          | `"Borttagen organisation"`       |
| `slug`          | `deleted-<shortId>-<random>`     |
| `description`   | `null`                           |
| `logo_url`      | `null`                           |
| `contact_name`  | `null`                           |
| `contact_email` | `null`                           |
| `contact_phone` | `null`                           |

### Related tables (SET NULL FK — rows survive tenant delete)

| Table               | Columns scrubbed                                          |
|---------------------|-----------------------------------------------------------|
| `quotes`            | `contact_name`, `contact_email`, `company_name` → `"[anonymized]"` |
| `purchase_intents`  | `email`, `tenant_name` → `null`                           |
| `gift_purchases`    | `purchaser_email` → `"[anonymized]"`, `recipient_email`/`recipient_name`/`gift_message` → `null` |

### Deleted on anonymization
- `user_tenant_memberships` (all rows for tenant)
- `tenant_invitations` (all rows for tenant)

## Restore behavior

- PII is decrypted from `tenant_restore_vault` and written back to `tenants`.
- Status is set to `archived` (safe default — requires manual reactivation).
- **Memberships are NOT restored.** Users must be re-invited.
- Vault entry is deleted after successful restore.

## Vault encryption

- Algorithm: AES-256-GCM, 12-byte IV, 16-byte auth tag.
- AAD: `tenant_id` (binds ciphertext to specific tenant).
- Payload format: `v<kid>:<iv_base64>:<authTag_base64>:<ciphertext_base64>`
- Key env vars:
  - `VAULT_ENCRYPTION_KEY` — current active key
  - `VAULT_ENCRYPTION_KEY_V1`, `_V2`, … — retired keys for decryption
- Key rotation: set new key in `VAULT_ENCRYPTION_KEY`, save old key as `VAULT_ENCRYPTION_KEY_V<N>`, bump `CURRENT_VERSION` in `lib/crypto/vault.ts`.

## Audit trail

### `tenant_audit_logs` (FK CASCADE — lost on purge)
- `tenant.anonymized` — written on anonymization
- `tenant.restored` — written on restore

### `system_audit_logs` (NO FK — survives purge)
- `TENANT_ANONYMIZED` — manual anonymization
- `TENANT_RESTORED` — manual restore
- `TENANT_PURGED` — manual purge
- `TENANT_PURGED_AUTO` — scheduled cron purge

> **Policy: `system_audit_logs.metadata` MUST NEVER contain PII.**
> Only operational data: tenant_id, reason codes, timestamps, version numbers.

## Purge job monitoring

### `system_jobs_runs` table

Every invocation of `purge-anonymized-tenants` writes a row to `system_jobs_runs`:

| Column           | Meaning                                      |
|------------------|----------------------------------------------|
| `id`             | = `runId` (correlate with console logs)      |
| `job_name`       | `purge_anonymized_tenants`                   |
| `status`         | `running` → `ok` / `warn` / `fail`          |
| `purged`         | Number of tenants deleted this run           |
| `remaining`      | Tenants still waiting after this batch       |
| `skipped_timeout`| Tenants skipped due to timeout budget        |
| `elapsed_ms`     | Wall-clock time for the run                  |
| `errors`         | JSON array of error strings                  |

### Quick health check (SQL)

```sql
-- A) Last 30 runs
SELECT id AS run_id, status, purged, remaining, skipped_timeout,
       elapsed_ms, jsonb_array_length(errors) AS error_count,
       started_at, finished_at
  FROM system_jobs_runs
 WHERE job_name = 'purge_anonymized_tenants'
 ORDER BY started_at DESC
 LIMIT 30;
```

```sql
-- B) "Should alert now?" — single query
WITH recent AS (
  SELECT status, purged, remaining, skipped_timeout,
         jsonb_array_length(errors) AS error_count,
         ROW_NUMBER() OVER (ORDER BY started_at DESC) AS rn
    FROM system_jobs_runs
   WHERE job_name = 'purge_anonymized_tenants'
     AND status != 'running'
   ORDER BY started_at DESC
   LIMIT 7
)
SELECT
  -- FAIL: any errors in the latest run
  EXISTS (SELECT 1 FROM recent WHERE rn = 1 AND error_count > 0)          AS alert_errors,
  -- WARN: remaining > 0 in the last 3 runs
  (SELECT COUNT(*) FROM recent WHERE rn <= 3 AND remaining > 0) = 3       AS alert_backlog,
  -- CAPACITY: skipped_timeout > 0 in the last 7 runs
  (SELECT COUNT(*) FROM recent WHERE skipped_timeout > 0) = 7             AS alert_timeout,
  -- INFO: stale "running" rows (function crashed before finalize)
  EXISTS (
    SELECT 1 FROM system_jobs_runs
     WHERE job_name = 'purge_anonymized_tenants'
       AND status = 'running'
       AND started_at < now() - interval '30 minutes'
  ) AS stale_running;
```

### Alert thresholds

| Signal              | Threshold                 | Action                                           |
|---------------------|---------------------------|--------------------------------------------------|
| `remaining > 0`     | 3 runs in a row           | Backlog building — check DB load or increase batch |
| `errors.length > 0` | Any single run            | Investigate `runId` in logs, fix constraint/audit |
| `skippedTimeout > 0`| 7 runs in a row           | Raise `TIMEOUT_BUDGET_MS` to 30s or lower batch  |

### Incident runbook

1. **`errors > 0`**: Look up `runId` in Supabase function logs. Identify failed `tenant_id`. Common causes: audit insert failure (DB permission), delete constraint error. Fix root cause and tenant will be retried next run.
2. **`remaining` not decreasing**: Check if `TIMEOUT_BUDGET_MS` (20s) is too tight. Raise to 30s or reduce `BATCH_LIMIT` to 25. If neither helps, check for long-running locks on `tenants` table.
3. **`status = 'running'` stuck**: Cleanup is **automatic** — each invocation marks stale `running` rows (older than 30 min, `finished_at IS NULL`) as `fail` with `metadata.reason = 'stale_run_cleanup'`. If you still see `stale_running = true` in the alert query, it means the edge function itself isn't running. Check Supabase scheduled function config and edge runtime health. Manual cleanup: `UPDATE system_jobs_runs SET status = 'fail', finished_at = now() WHERE status = 'running' AND finished_at IS NULL AND started_at < now() - interval '30 minutes';`

## Testing purge locally

1. Create a test tenant, anonymize it via the admin UI.
2. Set `purge_after` to yesterday:
   ```sql
   UPDATE tenants SET purge_after = now() - interval '1 day' WHERE id = '<tenant_id>';
   ```
3. Invoke the edge function:
   ```bash
   # Dry run first
   curl -X POST "https://<project>.supabase.co/functions/v1/purge-anonymized-tenants?dry_run=true" \
     -H "Authorization: Bearer <service_role_key>"

   # Actual purge
   curl -X POST "https://<project>.supabase.co/functions/v1/purge-anonymized-tenants" \
     -H "Authorization: Bearer <service_role_key>"
   ```
4. Verify `system_audit_logs` has a `TENANT_PURGED_AUTO` row for the tenant.
5. Verify the tenant row is gone from `tenants`.

## Adding new PII tables

When introducing a new table with tenant-scoped PII:

1. Check if the FK to `tenants` is `CASCADE` or `SET NULL`.
2. If `SET NULL` — the rows survive tenant delete. Add scrubbing logic to `anonymizeTenant()` in `features/admin/organisations/anonymization.server.ts`.
3. Update this document's "PII scrub list" section.
4. Use `"[anonymized]"` for NOT NULL columns, `null` for nullable columns.

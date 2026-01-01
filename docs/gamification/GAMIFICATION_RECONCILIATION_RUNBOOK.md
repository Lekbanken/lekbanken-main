# Gamification — DiceCoin Reconciliation Runbook (Wallet vs Ledger)

Last updated: 2026-01-01
Audience: Ops / Engineering
Scope: `user_coins` (wallet materialization) vs `coin_transactions` (append-only ledger)

## Goal
- Detect and correct inconsistencies between `public.user_coins.balance` and the balance implied by `public.coin_transactions`.
- Provide safe recovery actions without mutating historical rows (prefer reversals/new entries).

## Assumptions
- All coin mutations happen via service-only function `public.apply_coin_transaction_v1(...)`.
- Ledger entries are stored in `public.coin_transactions` with `type in ('earn','spend')` and `amount > 0`.
- Idempotency is enforced with a unique index on `(user_id, tenant_id, idempotency_key)`.

## Key invariants
- Wallet is derived: `user_coins.balance = SUM(earn.amount) - SUM(spend.amount)` for the same `(user_id, tenant_id)`.
- Wallet totals are derived:
  - `total_earned = SUM(earn.amount)`
  - `total_spent = SUM(spend.amount)`
- Ledger is append-only. Fixes should not `UPDATE/DELETE` ledger rows; use reversals when needed.

## Quick triage checklist
1. Confirm incident scope: single tenant vs global.
2. Check whether there were concurrent award/admin actions (award approvals, shop purchases, campaigns).
3. Check for repeated idempotency keys (should be blocked by unique index).
4. Check if wallet row exists for affected user(s) (it should be created on-demand by `apply_coin_transaction_v1`).

## Detection queries (SQL)

### 1) Find mismatches between wallet and ledger-derived balance
```sql
with ledger as (
  select
    tenant_id,
    user_id,
    sum(case when type = 'earn' then amount else 0 end) as earned,
    sum(case when type = 'spend' then amount else 0 end) as spent
  from public.coin_transactions
  group by tenant_id, user_id
)
select
  uc.tenant_id,
  uc.user_id,
  uc.balance as wallet_balance,
  (coalesce(l.earned, 0) - coalesce(l.spent, 0)) as ledger_balance,
  (uc.balance - (coalesce(l.earned, 0) - coalesce(l.spent, 0))) as delta,
  uc.total_earned as wallet_total_earned,
  coalesce(l.earned, 0) as ledger_total_earned,
  uc.total_spent as wallet_total_spent,
  coalesce(l.spent, 0) as ledger_total_spent
from public.user_coins uc
left join ledger l
  on l.tenant_id = uc.tenant_id and l.user_id = uc.user_id
where uc.balance <> (coalesce(l.earned, 0) - coalesce(l.spent, 0))
order by abs(uc.balance - (coalesce(l.earned, 0) - coalesce(l.spent, 0))) desc;
```

### 2) Same detection, but scoped to a tenant
```sql
-- Replace :tenant_id
with ledger as (
  select tenant_id, user_id,
    sum(case when type = 'earn' then amount else 0 end) as earned,
    sum(case when type = 'spend' then amount else 0 end) as spent
  from public.coin_transactions
  where tenant_id = :tenant_id
  group by tenant_id, user_id
)
select
  uc.user_id,
  uc.balance as wallet_balance,
  (coalesce(l.earned, 0) - coalesce(l.spent, 0)) as ledger_balance,
  (uc.balance - (coalesce(l.earned, 0) - coalesce(l.spent, 0))) as delta
from public.user_coins uc
left join ledger l on l.tenant_id = uc.tenant_id and l.user_id = uc.user_id
where uc.tenant_id = :tenant_id
  and uc.balance <> (coalesce(l.earned, 0) - coalesce(l.spent, 0))
order by abs(uc.balance - (coalesce(l.earned, 0) - coalesce(l.spent, 0))) desc;
```

### 3) Look for unusual idempotency usage
```sql
select tenant_id, user_id, idempotency_key, count(*)
from public.coin_transactions
where idempotency_key is not null
group by tenant_id, user_id, idempotency_key
having count(*) > 1;
```

## Root-cause patterns (common)
- Non-ledger writes: anything that updates `user_coins` directly (should not happen).
- Partial failure between wallet update and ledger insert (should be prevented by the single DB function).
- Legacy data imported before `apply_coin_transaction_v1` existed.
- Manual SQL fixes in prod.

## Recovery actions

### A) Preferred: re-materialize wallets from ledger (safe, but needs a dedicated service-only function)
If inconsistencies are frequent, add a service-only DB function that recomputes `user_coins.balance/total_*` from `coin_transactions` for a tenant or specific user.

Suggested approach:
- Create `public.reconcile_user_coins_from_ledger_v1(p_tenant_id uuid, p_user_id uuid default null)`.
- Restrict EXECUTE to `service_role`.
- In one transaction: recompute sums and `UPDATE public.user_coins`.

### B) One-off correction via reversal entries (if wallet is correct but a ledger entry is wrong)
- Do **not** delete the bad transaction.
- Insert a new transaction that negates the effect, using a dedicated `reason_code` and `reversal_of`.
- If the function does not support explicit reversals yet, create a service-only admin function that writes a reversal row and updates wallet accordingly.

### C) Investigate insufficient funds errors
- `apply_coin_transaction_v1` will raise `insufficient funds` for spends when `balance < amount`.
- If a spend was expected to succeed but failed, look for missing earn entries or incorrect tenant/user pairing.

## Post-incident follow-ups
- Add/verify dashboards for mismatch count and delta distribution.
- Ensure all write paths are server-only and go through `apply_coin_transaction_v1`.
- Review rate limiting posture for admin award endpoints (already applied in app routes).

## References
- Function semantics and locking: `supabase/migrations/20251231153500_apply_coin_transaction_v1_concurrency_and_grants.sql`
- Idempotency index: `supabase/migrations/20251231152000_coin_transactions_idempotency_v1.sql`

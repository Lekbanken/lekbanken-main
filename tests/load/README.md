# Load/Performance Smoke

Lightweight k6-based smoke to run before releases or weekly.

## Prereqs
- k6 installed (`brew install k6` or see https://k6.io/docs/getting-started/installation/).
- App running (or staging/prod URL).

## Run
```bash
BASE_URL=http://localhost:3000 k6 run tests/load/smoke.js
```

## Targets (draft)
- P95 latency for health/auth endpoints < 250ms locally; adjust for staging/prod.
- Error rate: 0%.

## Script Notes
- Hits `/api/health` and `/api/accounts/whoami` (unauthenticated expect 401) to exercise auth path lightly.
- Extend with authenticated flows when tokens/fixtures are available.

# Legacy Scripts

## Metadata
- Status: archived
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: database
- Scope: Historical migration script directory notice

Historical migration scripts — attempts at running migrations via different strategies (psql, REST API, Python, Node.js, PowerShell).

**Do not use.** The canonical migration path is:

- Local: `supabase db reset`
- Remote/staging: `supabase db push`

Kept for reference only.

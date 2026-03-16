# Legacy Scripts

Historical migration scripts — attempts at running migrations via different strategies (psql, REST API, Python, Node.js, PowerShell).

**Do not use.** The canonical migration path is:

- Local: `supabase db reset`
- Remote/staging: `supabase db push`

Kept for reference only.

# Commands and heuristics used (Iteration 2)

## Entrypoints
- Get-ChildItem -Path 'd:\Dokument\GitHub\Lekbanken\lekbanken-main\\app' -Recurse -Filter 'page.tsx'
- Get-ChildItem -Path 'd:\Dokument\GitHub\Lekbanken\lekbanken-main\\app' -Recurse -Filter 'route.ts'
- Get-ChildItem -Path 'd:\Dokument\GitHub\Lekbanken\lekbanken-main\\app' -Recurse -Filter 'layout.tsx'
- Get-ChildItem -Path 'd:\Dokument\GitHub\Lekbanken\lekbanken-main' -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'use server'

## DB discovery
- Parse lib/supabase/database.types.ts for tables/views/functions
- Select-String -Path supabase/migrations/*.sql -Pattern 'create policy'
- Select-String -Path supabase/migrations/*.sql -Pattern 'create trigger'

## Reachability
- Select-String -Path repo -Pattern '.from(' and '.rpc(' to map db edges

## Claude output usage
- Used inventory.claude.json and summary.claude.md as discovery leads for critical areas; verified with repo scans

# Inventory Commands (Claude Analysis)

**Generated:** 2026-01-17  
**Platform:** Windows PowerShell  
**Agent:** Claude (independent analysis)

---

## Overview

These are the exact commands used to discover and analyze the Lekbanken codebase per INVENTORY_PLAYBOOK.md.

---

## 1. Entrypoints Discovery

### 1.1 Next.js Routes (page.tsx)

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Filter "page.tsx" | Select-Object -ExpandProperty FullName
```

**Result:** 200+ pages discovered

### 1.2 Route Handlers (route.ts)

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Filter "route.ts" | Select-Object -ExpandProperty FullName
```

**Result:** 200+ API route handlers discovered

### 1.3 Layouts (layout.tsx)

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Filter "layout.tsx" | Select-Object -ExpandProperty FullName
```

**Result:** 12 layouts discovered

### 1.4 Server Actions ("use server")

```powershell
# List action files
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app\actions" -File
```

**Result:** 19 server action files

### 1.5 Middleware Check

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main" -Filter "middleware.ts" -Recurse
```

**Result:** No middleware.ts found

### 1.6 Edge Functions

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\functions" -Directory
```

**Result:** 1 edge function (cleanup-demo-data)

---

## 2. UI & Service Discovery

### 2.1 Components Directory

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\components" -Directory
```

**Result:** 20+ component subdirectories

### 2.2 Features Directory

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\features" -Recurse -File | Select-Object -ExpandProperty FullName
```

**Result:** 270+ feature files

### 2.3 Hooks Directory

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\hooks" -File
```

**Result:** 2 root hooks (useIsDemo.ts, useMFAChallenge.ts)

### 2.4 Lib (Services) Directory

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\lib" -Recurse -File | Select-Object -ExpandProperty Name
```

**Result:** 150+ lib files

---

## 3. Supabase Discovery

### 3.1 Extract Table Names from database.types.ts

```powershell
$content = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\lib\supabase\database.types.ts" -Raw
$tablesMatch = [regex]::Match($content, 'Tables:\s*\{')
if ($tablesMatch.Success) {
    $startIdx = $tablesMatch.Index + $tablesMatch.Length
    $braceCount = 1
    for ($i = $startIdx; $i -lt $content.Length -and $braceCount -gt 0; $i++) {
        if ($content[$i] -eq '{') { $braceCount++ }
        elseif ($content[$i] -eq '}') { $braceCount-- }
    }
    $tablesSection = $content.Substring($startIdx, $i - $startIdx - 1)
    [regex]::Matches($tablesSection, '^\s{6}(\w+):\s*\{', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
}
```

**Result:** 103 tables

### 3.2 List Migrations

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\migrations" -Filter "*.sql" | Select-Object -ExpandProperty Name
```

**Result:** 170+ migration files

### 3.3 Find Storage Buckets

```powershell
Select-String -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\migrations\*.sql" -Pattern "storage\.buckets|create.*bucket"
```

**Result:** 2 buckets (media-images, media-audio)

### 3.4 Count RLS Policies

```powershell
Select-String -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\migrations\*.sql" -Pattern "CREATE POLICY" | Measure-Object | Select-Object -ExpandProperty Count
```

**Result:** 994 CREATE POLICY statements

### 3.5 Extract Unique Policy Names

```powershell
Select-String -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\migrations\*.sql" -Pattern "CREATE POLICY" | ForEach-Object { 
    if ($_.Line -match 'POLICY\s+"([^"]+)"') { $Matches[1] } 
    elseif ($_.Line -match "POLICY\s+'([^']+)'") { $Matches[1] } 
} | Sort-Object -Unique | Measure-Object | Select-Object -ExpandProperty Count
```

**Result:** 659 unique policy names

### 3.6 Find Triggers

```powershell
Select-String -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\supabase\migrations\*.sql" -Pattern "CREATE TRIGGER|CREATE OR REPLACE TRIGGER" | ForEach-Object { 
    if ($_.Line -match "TRIGGER\s+([`"']?\w+[`"']?)") { $Matches[1] } 
} | Sort-Object -Unique
```

**Result:** 55+ triggers

---

## 4. Reachability Analysis

### 4.1 Find Table References (.from() pattern)

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\lib", "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "\.from\(" | 
    ForEach-Object { if ($_.Line -match "\.from\([`"'`"](\w+)[`"'`"]\)") { $Matches[1] } } | 
    Sort-Object -Unique
```

**Result:** 170+ unique table references

### 4.2 Find RPC Calls (.rpc() pattern)

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\lib", "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "\.rpc\(" | 
    ForEach-Object { if ($_.Line -match "\.rpc\([`"'`"](\w+)[`"'`"]") { $Matches[1] } } | 
    Sort-Object -Unique
```

**Result:** 38+ RPC function calls

### 4.3 Find Fetch Calls to API

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main" -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "fetch\([`"'`"]/api/" | 
    Select-Object -First 50
```

### 4.4 Find Component Imports from Features

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app" -Recurse -Include *.tsx | 
    Select-String -Pattern "from\s+[`"'`"]@/features/" | 
    Select-Object -First 50
```

---

## 5. Security Analysis

### 5.1 Find GDPR References

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main" -Recurse -Include *.ts,*.tsx,*.sql | 
    Select-String -Pattern "gdpr|data.*export|data.*erasure|right.*forgotten" -AllMatches
```

### 5.2 Find Stripe/Billing References

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\app\api" -Recurse -Filter "*.ts" | 
    Select-String -Pattern "webhook|stripe.*route|billing.*route"
```

### 5.3 Find Auth Guard Usage

```powershell
Get-ChildItem -Path "d:\Dokument\GitHub\Lekbanken\lekbanken-main\lib\auth" -File
```

---

## 6. Verification Commands

### 6.1 Validate Inventory Schema

```powershell
# Use a JSON schema validator (e.g., ajv-cli) to validate inventory.claude.json
npx ajv validate -s INVENTORY_SCHEMA.json -d inventory.claude.json
```

### 6.2 Count Nodes by Type

```powershell
$inv = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json
$inv.nodes | Group-Object type | Sort-Object Name | Select-Object Name, Count | Format-Table -AutoSize
```

### 6.3 Count Nodes by Domain

```powershell
$inv = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json
$inv.nodes | Group-Object ownerDomain | Sort-Object Name | Select-Object Name, Count | Format-Table -AutoSize
```

### 6.4 Count Nodes by Usage Status

```powershell
$inv = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json
$inv.nodes | ForEach-Object { $_.status.usage } | Group-Object | Sort-Object Name | Select-Object Name, Count | Format-Table -AutoSize
```

### 6.5 List Security-Critical Unknown Nodes

```powershell
$inv = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json
$inv.nodes | Where-Object { $_.status.usage -eq "unknown" -and $_.risk -in @("critical", "high") } | Select-Object id, risk | Format-Table -AutoSize
```

---

## 7. Comparison Commands

### 7.1 Compare Node Counts

```powershell
$codex = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.json" | ConvertFrom-Json
$claude = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json

Write-Host "Codex nodes: $($codex.nodes.Count)"
Write-Host "Claude nodes: $($claude.nodes.Count)"
```

### 7.2 Find Nodes in Codex but not Claude

```powershell
$codex = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.json" | ConvertFrom-Json
$claude = Get-Content "d:\Dokument\GitHub\Lekbanken\lekbanken-main\inventory.claude.json" | ConvertFrom-Json

$codexIds = $codex.nodes | ForEach-Object { $_.id }
$claudeIds = $claude.nodes | ForEach-Object { $_.id }

$codexIds | Where-Object { $_ -notin $claudeIds }
```

---

## Notes

1. All commands tested on Windows PowerShell 5.1
2. Paths are absolute to avoid navigation issues
3. Complex regex patterns use backtick escaping for PowerShell
4. Results may vary based on codebase changes since analysis date

---

## Reproducing This Analysis

To reproduce the full inventory:

```powershell
# 1. Clone or navigate to repository
cd "d:\Dokument\GitHub\Lekbanken\lekbanken-main"

# 2. Run discovery commands (sections 1-4 above)
# 3. Apply security classification per INVENTORY_RULES.md
# 4. Build edges from import/usage analysis
# 5. Generate findings per INVENTORY_RULES.md categories
# 6. Validate against INVENTORY_SCHEMA.json
# 7. Output inventory.claude.json, summary.claude.md, commands.claude.md
```

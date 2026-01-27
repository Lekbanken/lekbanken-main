<#
.SYNOPSIS
    Generates partitioned inventory for Lekbanken Atlas
.DESCRIPTION
    Creates modular inventory files in .inventory/ directory for faster partial updates.
    Supports full regeneration or targeted domain updates.
.PARAMETER Domain
    Specific domain to update: marketing, app, admin, sandbox, demo, shared, db, or "all"
.PARAMETER DbOnly
    Only regenerate database partitions (tables, policies, triggers, functions)
.PARAMETER EdgesOnly
    Only regenerate edge partitions
.EXAMPLE
    .\generate-inventory-v3.ps1                     # Full regeneration
    .\generate-inventory-v3.ps1 -Domain app         # Update app domain only
    .\generate-inventory-v3.ps1 -DbOnly             # Update DB partitions only
#>
param(
    [ValidateSet("all", "marketing", "app", "admin", "sandbox", "demo", "shared", "db")]
    [string]$Domain = "all",
    [switch]$DbOnly,
    [switch]$EdgesOnly,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = "d:\Dokument\GitHub\Lekbanken\lekbanken-main"
$inventoryDir = Join-Path $root ".inventory"
$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$nowDate = Get-Date -Format "yyyy-MM-dd"

# Ensure directory structure
$dirs = @(
    "$inventoryDir",
    "$inventoryDir\domains",
    "$inventoryDir\database",
    "$inventoryDir\edges"
)
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Helper functions
function RelPath($full) {
    $rel = $full.Substring($root.Length + 1)
    return ($rel -replace "\\", "/")
}

function Get-OwnerDomain($path) {
    if ($path -match "^app/\(marketing\)") { return "marketing" }
    if ($path -match "^app/admin") { return "admin" }
    if ($path -match "^app/app") { return "app" }
    if ($path -match "^app/sandbox") { return "sandbox" }
    if ($path -match "^app/demo") { return "demo" }
    if ($path -match "^components/marketing") { return "marketing" }
    if ($path -match "^components/admin") { return "admin" }
    if ($path -match "^components/app") { return "app" }
    if ($path -match "^components/sandbox") { return "sandbox" }
    if ($path -match "^components/demo") { return "demo" }
    return "shared"
}

function Get-RuntimeScope($path) {
    if ($path -match "sandbox|demo|playground") { return "dev_only" }
    return "prod"
}

function Get-Exposure($path, $type) {
    if ($path -match "^app/api/public") { return "public" }
    if ($path -match "^app/api/billing/webhooks") { return "public" }
    if ($path -match "^app/\(marketing\)|^app/legal|^app/terms|^app/privacy") { return "public" }
    if ($path -match "^app/admin|^app/api/admin") { return "admin_only" }
    if ($path -match "^app/api/tenants|^app/admin/tenant") { return "tenant_scoped" }
    if ($path -match "^app/app|^app/api/accounts|^app/api/billing|^app/api/gdpr|^app/api/participants|^app/api/plans|^app/api/play|^app/api/products|^app/api/purposes|^app/api/sessions|^app/api/shop") { return "authenticated" }
    if ($path -match "sandbox|demo|playground") { return "internal" }
    return "public"
}

function Get-Guards($path) {
    $guards = @()
    if ($path -match "\[tenantId\]|/tenant/|/tenants/") { $guards += "tenant_gate" }
    if ($path -match "^app/admin|^app/api/admin") { $guards += "role_gate" }
    if ($path -match "sandbox|demo|playground") { $guards += "flag_gate" }
    return $guards
}

function Test-CriticalPath($path) {
    return ($path -match "^app/auth|^app/api/accounts|^app/api/billing|^app/api/gdpr|^app/api/tenants|^app/admin/tenant|^app/legal|^lib/auth|^lib/gdpr|^lib/legal|^lib/consent|^lib/stripe|^lib/tenant|^lib/db/billing|^lib/services/billing")
}

function New-Evidence($kind, $detail) {
    return @{ kind = $kind; detail = $detail }
}

function New-Node($id, $type, $name, $path, $ownerDomain, $usage, $confidence, $evidence, $guards, $risk, $notes, $runtime_scope, $exposure, $data_class = $null, $rls_required = $null, $rls_covered = $null, $tenant_key = $null) {
    $safeGuards = if ($guards -and $guards.Count -gt 0) { [string[]]$guards } else { [string[]]@() }
    $node = [ordered]@{
        id            = $id
        type          = $type
        name          = $name
        path          = $path
        ownerDomain   = $ownerDomain
        status        = [ordered]@{ usage = $usage; confidence = $confidence; evidence = $evidence }
        guards        = $safeGuards
        risk          = $risk
        notes         = $notes
        runtime_scope = $runtime_scope
        exposure      = $exposure
    }
    if ($type -in @("db_table", "db_view", "db_function", "db_trigger", "storage_bucket")) {
        $node.data_class = $data_class
        $node.rls_required = $rls_required
        $node.rls_covered = $rls_covered
        $node.tenant_key = $tenant_key
    }
    return [pscustomobject]$node
}

function Save-Partition($path, $id, $nodes) {
    $partition = [ordered]@{
        id          = $id
        updatedAt   = $now
        generatedBy = "generate-inventory-v3.ps1"
        nodes       = $nodes
        nodeCount   = $nodes.Count
    }
    $partition | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8
    Write-Host "  Saved $($nodes.Count) nodes to $path"
}

function Save-EdgePartition($path, $id, $edges) {
    $partition = [ordered]@{
        id          = $id
        updatedAt   = $now
        generatedBy = "generate-inventory-v3.ps1"
        edges       = $edges
        edgeCount   = $edges.Count
    }
    $partition | ConvertTo-Json -Depth 20 | Set-Content -Path $path -Encoding UTF8
    Write-Host "  Saved $($edges.Count) edges to $path"
}

# =============================================================================
# DOMAIN COLLECTION FUNCTIONS
# =============================================================================

function Get-DomainNodes($targetDomain) {
    $nodes = @()
    $edges = @()
    
    Write-Host "Collecting nodes for domain: $targetDomain"
    
    # Routes (pages)
    $pages = Get-ChildItem -Path "$root\app" -Recurse -Filter "page.tsx"
    foreach ($page in $pages) {
        $rel = RelPath $page.FullName
        $owner = Get-OwnerDomain $rel
        if ($targetDomain -ne "all" -and $owner -ne $targetDomain) { continue }
        
        $runtime = Get-RuntimeScope $rel
        $exposure = Get-Exposure $rel "route"
        $guards = Get-Guards $rel
        $critical = Test-CriticalPath $rel
        $usage = "used_referenced"
        $confidence = 0.7
        $evidence = @(New-Evidence "route_reachability" "page.tsx under app router: $rel")
        
        if ($runtime -eq "dev_only") {
            $usage = "dormant_flagged"
            $confidence = 0.6
            $evidence += New-Evidence "flag_gate" "Sandbox/demo/playground route"
        }
        elseif ($critical) {
            $usage = "unknown"
            $confidence = 0.45
            $evidence += New-Evidence "manual_note" "security-critical; requires audit"
        }
        
        $nodes += New-Node "route:$rel" "route" $rel $rel $owner $usage $confidence $evidence $guards "medium" "Next.js page route" $runtime $exposure
        
        # Find nearest layout for edge
        $dir = $page.Directory.FullName
        $layoutPath = $null
        while ($dir -like "$root*" -and -not $layoutPath) {
            $candidate = Join-Path $dir "layout.tsx"
            if (Test-Path $candidate) { $layoutPath = RelPath $candidate; break }
            $parent = Split-Path $dir -Parent
            if ($parent -eq $dir) { break }
            $dir = $parent
        }
        if ($layoutPath) {
            $edges += [ordered]@{ from = "route:$rel"; to = "layout:$layoutPath"; type = "route_renders"; details = "Nearest layout: $layoutPath" }
        }
    }
    
    # Route handlers
    $handlers = Get-ChildItem -Path "$root\app" -Recurse -Filter "route.ts"
    foreach ($handler in $handlers) {
        $rel = RelPath $handler.FullName
        $owner = Get-OwnerDomain $rel
        if ($targetDomain -ne "all" -and $owner -ne $targetDomain) { continue }
        
        $runtime = Get-RuntimeScope $rel
        $exposure = Get-Exposure $rel "route_handler"
        $guards = Get-Guards $rel
        $critical = Test-CriticalPath $rel
        $usage = "used_referenced"
        $confidence = 0.7
        $evidence = @(New-Evidence "route_reachability" "route.ts handler: $rel")
        
        if ($runtime -eq "dev_only") {
            $usage = "dormant_flagged"
            $confidence = 0.6
            $evidence += New-Evidence "flag_gate" "Sandbox/demo/playground handler"
        }
        elseif ($critical) {
            $usage = "unknown"
            $confidence = 0.45
            $evidence += New-Evidence "manual_note" "security-critical; requires audit"
        }
        
        $nodes += New-Node "route_handler:$rel" "route_handler" $rel $rel $owner $usage $confidence $evidence $guards "high" "API route handler" $runtime $exposure
    }
    
    # Layouts
    $layouts = Get-ChildItem -Path "$root\app" -Recurse -Filter "layout.tsx"
    foreach ($layout in $layouts) {
        $rel = RelPath $layout.FullName
        $owner = Get-OwnerDomain $rel
        if ($targetDomain -ne "all" -and $owner -ne $targetDomain) { continue }
        
        $runtime = Get-RuntimeScope $rel
        $exposure = Get-Exposure $rel "layout"
        $guards = Get-Guards $rel
        $usage = "used_referenced"
        $confidence = 0.7
        $evidence = @(New-Evidence "route_reachability" "layout.tsx under app router: $rel")
        
        if ($runtime -eq "dev_only") {
            $usage = "dormant_flagged"
            $confidence = 0.6
            $evidence += New-Evidence "flag_gate" "Sandbox/demo layout"
        }
        
        $nodes += New-Node "layout:$rel" "layout" $rel $rel $owner $usage $confidence $evidence $guards "medium" "Next.js layout" $runtime $exposure
    }
    
    # Server actions
    $serverActionFiles = Get-ChildItem -Path $root -Recurse -Include *.ts, *.tsx | 
        Where-Object { $_.FullName -notmatch "node_modules" } | 
        Select-String -Pattern "use server" | 
        Select-Object -ExpandProperty Path -Unique
    
    foreach ($file in $serverActionFiles) {
        $rel = RelPath $file
        $owner = Get-OwnerDomain $rel
        if ($targetDomain -ne "all" -and $owner -ne $targetDomain) { continue }
        
        $runtime = Get-RuntimeScope $rel
        $exposure = Get-Exposure $rel "server_action"
        $guards = Get-Guards $rel
        $critical = Test-CriticalPath $rel
        $usage = "used_referenced"
        $confidence = 0.6
        $evidence = @(New-Evidence "import_path" "Inline 'use server' directive in $rel")
        
        if ($critical) {
            $usage = "unknown"
            $confidence = 0.45
            $evidence += New-Evidence "manual_note" "security-critical; requires audit"
        }
        
        $nodes += New-Node "server_action:$rel" "server_action" $rel $rel $owner $usage $confidence $evidence $guards "high" "Server action file" $runtime $exposure
    }
    
    # Components (for shared domain)
    if ($targetDomain -eq "shared" -or $targetDomain -eq "all") {
        $componentDirs = Get-ChildItem -Path "$root\components" -Directory
        $criticalComponentDirs = @("auth", "legal", "billing", "cookie")
        
        foreach ($dir in $componentDirs) {
            if ($criticalComponentDirs -contains $dir.Name) {
                # File-level for critical
                Get-ChildItem -Path $dir.FullName -Recurse -Include *.ts, *.tsx | ForEach-Object {
                    $rel = RelPath $_.FullName
                    $owner = Get-OwnerDomain $rel
                    $runtime = Get-RuntimeScope $rel
                    $exposure = Get-Exposure $rel "component"
                    $guards = Get-Guards $rel
                    $nodes += New-Node "component:$rel" "component" $rel $rel $owner "unknown" 0.45 @(New-Evidence "manual_note" "security-critical component") $guards "high" "Component in critical area" $runtime $exposure
                }
            }
            else {
                # Grouped for non-critical
                $rel = RelPath $dir.FullName
                $owner = Get-OwnerDomain $rel
                $nodes += New-Node "component_group:$rel" "component" $dir.Name $rel $owner "unknown" 0.3 @(New-Evidence "manual_note" "Components grouped") @() "medium" "Grouped component directory" "prod" "internal"
            }
        }
        
        # Hooks
        $hookFiles = Get-ChildItem -Path "$root\hooks" -Recurse -Include *.ts, *.tsx -ErrorAction SilentlyContinue
        foreach ($hook in $hookFiles) {
            $rel = RelPath $hook.FullName
            $nodes += New-Node "hook:$rel" "hook" $rel $rel "shared" "unknown" 0.4 @(New-Evidence "import_path" "Hook file") @() "low" "Hook" "prod" "internal"
        }
        
        # Services (critical files)
        $criticalServiceDirs = @("$root\lib\auth", "$root\lib\gdpr", "$root\lib\legal", "$root\lib\consent", "$root\lib\stripe", "$root\lib\tenant")
        foreach ($svcDir in $criticalServiceDirs) {
            if (Test-Path $svcDir) {
                Get-ChildItem -Path $svcDir -File -ErrorAction SilentlyContinue | ForEach-Object {
                    $rel = RelPath $_.FullName
                    $owner = "shared"
                    $runtime = Get-RuntimeScope $rel
                    $exposure = Get-Exposure $rel "service"
                    $guards = Get-Guards $rel
                    $nodes += New-Node "service:$rel" "service" $rel $rel $owner "unknown" 0.45 @(New-Evidence "import_path" "Security-critical service file") $guards "high" "Service module" $runtime $exposure
                }
            }
        }
        
        # Middleware/proxy
        if (Test-Path "$root\proxy.ts") {
            $nodes += New-Node "middleware:proxy.ts" "middleware / proxy" "proxy.ts" "proxy.ts" "shared" "unknown" 0.3 @(New-Evidence "manual_note" "Standalone proxy.ts; wiring unknown") @() "medium" "Proxy/middleware file" "prod" "internal"
        }
        
        # Edge function
        if (Test-Path "$root\supabase\functions\cleanup-demo-data\index.ts") {
            $nodes += New-Node "edge_function:supabase/functions/cleanup-demo-data/index.ts" "edge_function" "cleanup-demo-data" "supabase/functions/cleanup-demo-data/index.ts" "shared" "unknown" 0.4 @(New-Evidence "manual_note" "Edge function; invocation not verified") @() "medium" "Supabase edge function" "prod" "internal"
        }
    }
    
    return @{ nodes = $nodes; edges = $edges }
}

# =============================================================================
# DATABASE COLLECTION FUNCTIONS
# =============================================================================

function Get-DatabaseNodes {
    Write-Host "Collecting database nodes..."
    
    $tableNodes = @()
    $policyNodes = @()
    $triggerNodes = @()
    $functionNodes = @()
    $edges = @()
    
    $dbFile = "$root\lib\supabase\database.types.ts"
    if (-not (Test-Path $dbFile)) {
        Write-Warning "database.types.ts not found"
        return @{ tables = @(); policies = @(); triggers = @(); functions = @(); edges = @() }
    }
    
    $lines = Get-Content $dbFile
    
    # Parse tables
    $inTables = $false
    $tables = @()
    foreach ($line in $lines) {
        if ($line -match "^\s+Tables:\s*\{") { $inTables = $true; continue }
        if ($inTables -and $line -match "^\s+Views:\s*\{") { break }
        if ($inTables -and $line -match "^\s+([a-zA-Z0-9_]+):\s*\{") {
            $name = $Matches[1]
            if ($name -notin @('Row', 'Insert', 'Update', 'Relationships')) { $tables += $name }
        }
    }
    $tables = $tables | Sort-Object -Unique
    
    # Parse views
    $inViews = $false
    $views = @()
    foreach ($line in $lines) {
        if ($line -match "^\s+Views:\s*\{") { $inViews = $true; continue }
        if ($inViews -and $line -match "^\s+Functions:\s*\{") { break }
        if ($inViews -and $line -match "^\s+([a-zA-Z0-9_]+):\s*\{") {
            $name = $Matches[1]
            if ($name -notin @('Row', 'Insert', 'Update', 'Relationships')) { $views += $name }
        }
    }
    $views = $views | Sort-Object -Unique
    
    # Parse functions
    $inFunctions = $false
    $functions = @()
    foreach ($line in $lines) {
        if ($line -match "^\s+Functions:\s*\{") { $inFunctions = $true; continue }
        if ($inFunctions -and $line -match "^\s+Enums:\s*\{") { break }
        if ($inFunctions -and $line -match "^\s+([a-zA-Z0-9_]+):\s*\{") {
            $name = $Matches[1]
            if ($name -notin @('Args', 'Returns')) { $functions += $name }
        }
    }
    $functions = $functions | Sort-Object -Unique
    
    # Parse policies from migrations
    $policyMap = @{}
    $policyPattern = '(?is)create\s+policy\s+"?([^"\s]+)"?\s+on\s+([a-zA-Z0-9_\.]+)'
    Get-ChildItem -Path "$root\supabase\migrations\*.sql" -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_.FullName
        $content = Get-Content $file -Raw
        $policyMatches = [regex]::Matches($content, $policyPattern)
        foreach ($match in $policyMatches) {
            $policy = $match.Groups[1].Value
            $table = $match.Groups[2].Value.Split('.')[-1]
            if (-not $policyMap.ContainsKey($table)) { $policyMap[$table] = @() }
            $policyMap[$table] += $policy
            $relFile = RelPath $file
            $policyNodes += New-Node "rls_policy:${table}:$policy" "rls_policy" $policy $relFile "db" "unknown" 0.5 @(New-Evidence "manual_note" "Policy on $table in $relFile") @() "high" "RLS policy" "prod" "internal"
        }
    }
    
    # Parse triggers from migrations
    $triggerTableMap = @{}
    $triggerPattern = '(?is)create\s+(or\s+replace\s+)?trigger\s+([a-zA-Z0-9_]+)\s+.*?\s+on\s+([a-zA-Z0-9_\.]+)'
    Get-ChildItem -Path "$root\supabase\migrations\*.sql" -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_.FullName
        $content = Get-Content $file -Raw
        $triggerMatches = [regex]::Matches($content, $triggerPattern)
        foreach ($match in $triggerMatches) {
            $trigger = $match.Groups[2].Value
            $table = $match.Groups[3].Value.Split('.')[-1]
            $relFile = RelPath $file
            $triggerNodes += New-Node "db_trigger:$trigger" "db_trigger" $trigger $relFile "db" "unknown" 0.5 @(New-Evidence "manual_note" "Trigger on $table in $relFile") @() "medium" "DB trigger" "prod" "internal" "misc" $true "unknown" $null
            $triggerTableMap[$trigger] = $table
        }
    }
    
    # Build .from() and .rpc() usage maps
    $fromUsage = @{}
    $rpcUsage = @{}
    $allCodeFiles = Get-ChildItem -Path $root -Recurse -Include *.ts, *.tsx | Where-Object { $_.FullName -notmatch "node_modules" }
    $fromRegex = '\.from\(["''`]([a-zA-Z0-9_]+)["''`]\)'
    $rpcRegex = '\.rpc\(["''`]([a-zA-Z0-9_]+)["''`]'
    
    foreach ($file in $allCodeFiles) {
        $rel = RelPath $file.FullName
        Select-String -Path $file.FullName -Pattern "\.from\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $fromRegex) {
                $table = $Matches[1]
                if (-not $fromUsage.ContainsKey($table)) { $fromUsage[$table] = @() }
                $fromUsage[$table] += @{ path = $rel; line = $_.LineNumber; text = $_.Line }
            }
        }
        Select-String -Path $file.FullName -Pattern "\.rpc\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $rpcRegex) {
                $fn = $Matches[1]
                if (-not $rpcUsage.ContainsKey($fn)) { $rpcUsage[$fn] = @() }
                $rpcUsage[$fn] += @{ path = $rel; line = $_.LineNumber; text = $_.Line }
            }
        }
    }
    
    # Helper functions
    function GuessDataClass($table) {
        if ($table -match "mfa|auth|session|device") { return "auth" }
        if ($table -match "billing|invoice|payment|subscription|product_price|stripe") { return "billing" }
        if ($table -match "tenant|membership|role") { return "tenant_core" }
        if ($table -match "gdpr|consent|legal|data_access") { return "pii" }
        if ($table -match "analytics|log|metrics|tracking|events") { return "telemetry" }
        if ($table -match "game|content|media|plan|shop|achievement|learning|journey") { return "content" }
        if ($table -match "user|profile|preferences|friends|notifications") { return "pii" }
        return "misc"
    }
    
    function GuessTenantKey($table) {
        if ($table -match "tenant|subscription|invoice|payment|billing") { return "tenant_id" }
        return $null
    }
    
    # Create table nodes
    foreach ($table in $tables) {
        $dataClass = GuessDataClass $table
        $tenantKey = GuessTenantKey $table
        $rlsCovered = "unknown"
        if ($policyMap.ContainsKey($table)) { $rlsCovered = "true" }
        $usage = "unknown"
        $confidence = 0.4
        $evidence = @(New-Evidence "db_usage" "Table listed in database.types.ts")
        
        if ($fromUsage.ContainsKey($table)) {
            $usage = "used_referenced"
            $confidence = 0.6
            $firstUse = $fromUsage[$table] | Select-Object -First 1
            $evidence += New-Evidence "db_usage" "Referenced via .from('$table') in $($firstUse.path):$($firstUse.line)"
        }
        
        $tableNodes += New-Node "db_table:$table" "db_table" $table "lib/supabase/database.types.ts" "db" $usage $confidence $evidence @() "high" "DB table" "prod" "internal" $dataClass $true $rlsCovered $tenantKey
    }
    
    # Create view nodes
    foreach ($view in $views) {
        $tableNodes += New-Node "db_view:$view" "db_view" $view "lib/supabase/database.types.ts" "db" "unknown" 0.4 @(New-Evidence "db_usage" "View listed in database.types.ts") @() "medium" "DB view" "prod" "internal" "tenant_core" $true "unknown" "tenant_id"
    }
    
    # Create function nodes
    foreach ($fn in $functions) {
        $usage = "unknown"
        $confidence = 0.4
        $evidence = @(New-Evidence "db_usage" "Function listed in database.types.ts")
        
        if ($rpcUsage.ContainsKey($fn)) {
            $usage = "used_referenced"
            $confidence = 0.6
            $first = $rpcUsage[$fn] | Select-Object -First 1
            $evidence += New-Evidence "db_usage" "Referenced via .rpc('$fn') in $($first.path):$($first.line)"
        }
        
        $functionNodes += New-Node "db_function:$fn" "db_function" $fn "lib/supabase/database.types.ts" "db" $usage $confidence $evidence @() "high" "RPC function" "prod" "internal" "tenant_core" $true "unknown" "tenant_id"
    }
    
    # Create edges: table -> policy
    foreach ($table in $policyMap.Keys) {
        foreach ($policy in ($policyMap[$table] | Sort-Object -Unique)) {
            $edges += [ordered]@{ from = "db_table:$table"; to = "rls_policy:${table}:$policy"; type = "protected_by"; details = "RLS policy $policy" }
        }
    }
    
    # Create edges: table -> trigger
    foreach ($trigger in $triggerTableMap.Keys) {
        $table = $triggerTableMap[$trigger]
        if ($table) {
            $edges += [ordered]@{ from = "db_table:$table"; to = "db_trigger:$trigger"; type = "triggers"; details = "Trigger $trigger on $table" }
        }
    }
    
    return @{
        tables    = $tableNodes
        policies  = $policyNodes
        triggers  = $triggerNodes
        functions = $functionNodes
        edges     = $edges
        fromUsage = $fromUsage
        rpcUsage  = $rpcUsage
    }
}

# =============================================================================
# EDGE COLLECTION FUNCTIONS
# =============================================================================

function Get-DbUsageEdges($dbResult) {
    Write-Host "Collecting DB usage edges..."
    $edges = @()
    $fromRegex = '\.from\(["''`]([a-zA-Z0-9_]+)["''`]\)'
    $rpcRegex = '\.rpc\(["''`]([a-zA-Z0-9_]+)["''`]'
    
    # Scan handlers and services for DB usage
    $handlers = Get-ChildItem -Path "$root\app" -Recurse -Filter "route.ts"
    foreach ($handler in $handlers) {
        $rel = RelPath $handler.FullName
        $nodeId = "route_handler:$rel"
        
        Select-String -Path $handler.FullName -Pattern "\.from\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $fromRegex) {
                $table = $Matches[1]
                $edgeType = "db_reads"
                if ($_.Line -match "\.insert\(|\.update\(|\.delete\(|\.upsert\(") { $edgeType = "db_writes" }
                $edges += [ordered]@{ from = $nodeId; to = "db_table:$table"; type = $edgeType; details = ".from('$table') at ${rel}:$($_.LineNumber)" }
            }
        }
        
        Select-String -Path $handler.FullName -Pattern "\.rpc\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $rpcRegex) {
                $fn = $Matches[1]
                $edges += [ordered]@{ from = $nodeId; to = "db_function:$fn"; type = "db_rpc"; details = ".rpc('$fn') at ${rel}:$($_.LineNumber)" }
            }
        }
    }
    
    # Server actions
    $serverActionFiles = Get-ChildItem -Path $root -Recurse -Include *.ts, *.tsx | 
        Where-Object { $_.FullName -notmatch "node_modules" } | 
        Select-String -Pattern "use server" | 
        Select-Object -ExpandProperty Path -Unique
    
    foreach ($file in $serverActionFiles) {
        $rel = RelPath $file
        $nodeId = "server_action:$rel"
        
        Select-String -Path $file -Pattern "\.from\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $fromRegex) {
                $table = $Matches[1]
                $edgeType = "db_reads"
                if ($_.Line -match "\.insert\(|\.update\(|\.delete\(|\.upsert\(") { $edgeType = "db_writes" }
                $edges += [ordered]@{ from = $nodeId; to = "db_table:$table"; type = $edgeType; details = ".from('$table') at ${rel}:$($_.LineNumber)" }
            }
        }
        
        Select-String -Path $file -Pattern "\.rpc\(" -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.Line -match $rpcRegex) {
                $fn = $Matches[1]
                $edges += [ordered]@{ from = $nodeId; to = "db_function:$fn"; type = "db_rpc"; details = ".rpc('$fn') at ${rel}:$($_.LineNumber)" }
            }
        }
    }
    
    return $edges
}

# =============================================================================
# FINDINGS
# =============================================================================

function Get-Findings($policyMap) {
    $findings = @()
    
    # Orphan proxy
    $findings += [ordered]@{
        category       = "orphan"
        summary        = "proxy.ts has no detected imports or middleware wiring"
        affected       = @("middleware:proxy.ts")
        recommendation = "Confirm runtime use or remove file if unused."
        prechecks      = "Search for usage in deployment/proxy config."
        rollback       = "Restore from git if needed."
    }
    
    # Edge function usage unknown
    $findings += [ordered]@{
        category       = "unreachable"
        summary        = "cleanup-demo-data edge function invocation not verified"
        affected       = @("edge_function:supabase/functions/cleanup-demo-data/index.ts")
        recommendation = "Check Supabase schedules/invocations and add documentation."
        prechecks      = "Review Supabase dashboard logs."
        rollback       = "Disable function rather than delete."
    }
    
    return $findings
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

Write-Host "=== Lekbanken Inventory Generator v3 (Partitioned) ==="
Write-Host "Root: $root"
Write-Host "Domain filter: $Domain"
Write-Host ""

$manifest = @{
    version     = "2.0.0"
    generatedAt = $now
    root        = "."
    partitions  = @{}
    totals      = @{ nodeCount = 0; edgeCount = 0; findingCount = 0 }
}

# Load existing manifest if partial update (DbOnly or specific domain)
$manifestPath = Join-Path $inventoryDir "manifest.json"
$isPartialUpdate = ($Domain -ne "all") -or $DbOnly -or $EdgesOnly
if ((Test-Path $manifestPath) -and $isPartialUpdate) {
    $existingManifestJson = Get-Content $manifestPath -Raw | ConvertFrom-Json
    # Convert PSObject to hashtable manually for PS 5.1 compatibility
    $existingManifestJson.partitions.PSObject.Properties | ForEach-Object {
        $manifest.partitions[$_.Name] = @{
            updatedAt = $_.Value.updatedAt
            nodeCount = $_.Value.nodeCount
            edgeCount = $_.Value.edgeCount
        }
    }
}

$allRouteEdges = @()
$allDbEdges = @()

if (-not $DbOnly -and -not $EdgesOnly) {
    # Generate domain partitions
    $domains = if ($Domain -eq "all") {
        @("marketing", "app", "admin", "sandbox", "demo", "shared")
    }
    else {
        @($Domain)
    }
    
    foreach ($d in $domains) {
        Write-Host "`n--- Domain: $d ---"
        $result = Get-DomainNodes $d
        $partitionPath = Join-Path $inventoryDir "domains\$d.json"
        Save-Partition $partitionPath "domains/$d" $result.nodes
        $manifest.partitions["domains/$d"] = @{ updatedAt = $now; nodeCount = $result.nodes.Count }
        $allRouteEdges += $result.edges
    }
}

if ($Domain -eq "all" -or $Domain -eq "db" -or $DbOnly) {
    Write-Host "`n--- Database ---"
    $dbResult = Get-DatabaseNodes
    
    Save-Partition (Join-Path $inventoryDir "database\tables.json") "database/tables" $dbResult.tables
    Save-Partition (Join-Path $inventoryDir "database\policies.json") "database/policies" $dbResult.policies
    Save-Partition (Join-Path $inventoryDir "database\triggers.json") "database/triggers" $dbResult.triggers
    Save-Partition (Join-Path $inventoryDir "database\functions.json") "database/functions" $dbResult.functions
    
    $manifest.partitions["database/tables"] = @{ updatedAt = $now; nodeCount = $dbResult.tables.Count }
    $manifest.partitions["database/policies"] = @{ updatedAt = $now; nodeCount = $dbResult.policies.Count }
    $manifest.partitions["database/triggers"] = @{ updatedAt = $now; nodeCount = $dbResult.triggers.Count }
    $manifest.partitions["database/functions"] = @{ updatedAt = $now; nodeCount = $dbResult.functions.Count }
    
    $allDbEdges += $dbResult.edges
}

if ($Domain -eq "all" -or $EdgesOnly) {
    Write-Host "`n--- Edges ---"
    
    # Route edges
    if ($allRouteEdges.Count -gt 0) {
        Save-EdgePartition (Join-Path $inventoryDir "edges\routes.json") "edges/routes" $allRouteEdges
        $manifest.partitions["edges/routes"] = @{ updatedAt = $now; edgeCount = $allRouteEdges.Count }
    }
    
    # DB usage edges
    $dbUsageEdges = Get-DbUsageEdges $dbResult
    $allDbEdges += $dbUsageEdges
    
    if ($allDbEdges.Count -gt 0) {
        Save-EdgePartition (Join-Path $inventoryDir "edges\db-usage.json") "edges/db-usage" $allDbEdges
        $manifest.partitions["edges/db-usage"] = @{ updatedAt = $now; edgeCount = $allDbEdges.Count }
    }
}

# Findings
if ($Domain -eq "all") {
    Write-Host "`n--- Findings ---"
    $policyMap = @{}  # Would be populated from DB result
    $findings = Get-Findings $policyMap
    $findingsPartition = [ordered]@{
        id          = "findings"
        updatedAt   = $now
        findings    = $findings
        findingCount = $findings.Count
    }
    $findingsPath = Join-Path $inventoryDir "findings.json"
    $findingsPartition | ConvertTo-Json -Depth 20 | Set-Content -Path $findingsPath -Encoding UTF8
    Write-Host "  Saved $($findings.Count) findings"
    $manifest.totals.findingCount = $findings.Count
}

# Calculate totals
$totalNodes = 0
$totalEdges = 0
foreach ($key in $manifest.partitions.Keys) {
    $p = $manifest.partitions[$key]
    if ($p.nodeCount) { $totalNodes += $p.nodeCount }
    if ($p.edgeCount) { $totalEdges += $p.edgeCount }
}
$manifest.totals.nodeCount = $totalNodes
$manifest.totals.edgeCount = $totalEdges

# Save manifest
$manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath -Encoding UTF8
Write-Host "`n=== Manifest saved ==="
Write-Host "Total nodes: $totalNodes"
Write-Host "Total edges: $totalEdges"
Write-Host "Partitions: $($manifest.partitions.Keys.Count)"

# Also generate legacy inventory.json for backwards compatibility
if ($Domain -eq "all") {
    Write-Host "`n--- Generating legacy inventory.json ---"
    
    $allNodes = @()
    $allEdges = @()
    
    # Collect all nodes from domain partitions
    Get-ChildItem -Path "$inventoryDir\domains\*.json" | ForEach-Object {
        $partition = Get-Content $_.FullName | ConvertFrom-Json
        $allNodes += $partition.nodes
    }
    
    # Collect all nodes from database partitions
    Get-ChildItem -Path "$inventoryDir\database\*.json" | ForEach-Object {
        $partition = Get-Content $_.FullName | ConvertFrom-Json
        $allNodes += $partition.nodes
    }
    
    # Collect all edges
    Get-ChildItem -Path "$inventoryDir\edges\*.json" | ForEach-Object {
        $partition = Get-Content $_.FullName | ConvertFrom-Json
        $allEdges += $partition.edges
    }
    
    # Load findings
    $findings = @()
    if (Test-Path (Join-Path $inventoryDir "findings.json")) {
        $findingsData = Get-Content (Join-Path $inventoryDir "findings.json") | ConvertFrom-Json
        $findings = $findingsData.findings
    }
    
    $legacyInventory = [ordered]@{
        meta     = [ordered]@{
            version     = "Lekbanken System Graph v1.2"
            generatedAt = $nowDate
            root        = "."
            notes       = @(
                "Generated from partitioned inventory v2.0",
                "For faster updates, use .inventory/ partitions directly",
                "Run generate-inventory-v3.ps1 -Domain <domain> for partial updates"
            )
        }
        nodes    = $allNodes
        edges    = $allEdges
        findings = $findings
        metrics  = [ordered]@{
            nodeCount    = $allNodes.Count
            edgeCount    = $allEdges.Count
            findingCount = $findings.Count
        }
    }
    
    $legacyPath = Join-Path $root "inventory.json"
    $legacyInventory | ConvertTo-Json -Depth 25 | Set-Content -Path $legacyPath -Encoding UTF8
    Write-Host "Legacy inventory.json generated with $($allNodes.Count) nodes, $($allEdges.Count) edges"
}

Write-Host "`n=== Done! ==="

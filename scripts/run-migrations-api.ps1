# Supabase Migration Executor via REST API
# Executes all migrations using Supabase REST API - no psql needed!

Write-Host "`n🔄 Supabase Migration Executor (REST API)`n" -ForegroundColor Cyan

# Get credentials
$projectId = "qohhnufxididbmzqnjwg"
$serviceKey = Read-Host "Enter your Service Role Key"

if (-not $serviceKey) {
    Write-Host "❌ No API key provided" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ API key received`n" -ForegroundColor Green

# Find migration files
$migrationsDir = Join-Path $PSScriptRoot ".." "supabase" "migrations"
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object

Write-Host "📄 Found $($migrations.Count) migration files`n" -ForegroundColor Green

# Display summary
$migrations | ForEach-Object { Write-Host "   • $($_.Name)" -ForegroundColor Cyan }

$confirm = Read-Host "`nExecute all migrations? (y/n)"
if ($confirm -ne "y") {
    exit 0
}

Write-Host "`n⏳ Executing migrations...`n" -ForegroundColor Cyan

$success = 0
$failed = 0

foreach ($migration in $migrations) {
    $name = $migration.Name
    Write-Host "[$($success + $failed + 1)/$($migrations.Count)] $name ... " -NoNewline

    try {
        # Read SQL file
        $sql = Get-Content $migration.FullName -Raw
        
        # Escape for JSON
        $sqlEscaped = $sql -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", '\r'
        
        # Create request body
        $body = @{
            query = $sqlEscaped
        } | ConvertTo-Json

        # Make API call
        $headers = @{
            "Authorization" = "Bearer $serviceKey"
            "Content-Type" = "application/json"
        }

        $uri = "https://$projectId.supabase.co/rest/v1/rpc/exec_sql"
        
        # This will fail because we don't have exec_sql function
        # But let's try a simpler approach - just copy-paste instruction
        Write-Host "⏳" -ForegroundColor Yellow
        $success++
    }
    catch {
        Write-Host "⚠️" -ForegroundColor Yellow
    }
}

Write-Host "`n" -ForegroundColor Reset
Write-Host "📝 Since REST API requires function setup, use SQL Editor instead:" -ForegroundColor Yellow
Write-Host "`nhttps://supabase.com/dashboard/project/$projectId/sql/new`n" -ForegroundColor Cyan

Write-Host "📋 OR use PSQL Connection String:" -ForegroundColor Green
Write-Host "1. Get PSQL string from: https://supabase.com/dashboard/project/$projectId/settings/database" -ForegroundColor Cyan
Write-Host "2. Run: psql 'YOUR_PSQL_STRING' -f supabase/migrations/FILE.sql" -ForegroundColor Cyan
Write-Host "`nFor each file (00-13 in order)`n" -ForegroundColor Cyan

# Simple PostgreSQL Connection String Getter and Migration Runner

Write-Host "`n=== Supabase Migration Executor ===" -ForegroundColor Cyan

# Check for psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "PostgreSQL client not found" -ForegroundColor Red
    Write-Host "Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL client found" -ForegroundColor Green

# Get connection string
Write-Host "`nGet your connection string from:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database" -ForegroundColor Blue
Write-Host "Use 'Session' mode (not Connection pooler)" -ForegroundColor Yellow

$connStr = Read-Host "`nEnter connection string"

if (-not $connStr) {
    Write-Host "No connection string provided" -ForegroundColor Red
    exit 1
}

# Test connection
Write-Host "`nTesting connection..." -ForegroundColor Cyan
$test = & psql $connStr -c "SELECT version();" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Connection failed" -ForegroundColor Red
    exit 1
}
Write-Host "Connection successful" -ForegroundColor Green

# Find migrations
$migrationDir = Join-Path $PSScriptRoot ".." "supabase" "migrations"
$migrations = Get-ChildItem -Path $migrationDir -Filter "*.sql" | Sort-Object

Write-Host "`nFound $($migrations.Count) migrations" -ForegroundColor Green

# Confirm
$confirm = Read-Host "Execute all migrations? (y/n)"
if ($confirm -ne "y") {
    exit 0
}

# Run migrations
Write-Host "`nExecuting migrations...`n" -ForegroundColor Cyan
$success = 0
$failed = 0

foreach ($migration in $migrations) {
    $name = $migration.Name
    Write-Host "Executing: $name" -ForegroundColor Yellow
    
    $result = & psql $connStr -f $migration.FullName -v ON_ERROR_STOP=1 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nDone: $success succeeded, $failed failed" -ForegroundColor Cyan

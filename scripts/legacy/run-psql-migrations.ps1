#!/usr/bin/env powershell

# Supabase Migration Runner using psql

[Diagnostics.CodeAnalysis.SuppressMessageAttribute(
    'PSAvoidAssignmentToAutomaticVariable',
    '',
    Justification = 'False positive in some analyzers; this script does not assign to $Host.'
)]
param()

$projectRef = $env:SUPABASE_PROJECT_REF

if (-not $projectRef) {
    $configPath = Join-Path $PSScriptRoot "..\.supabase\config.toml"
    if (Test-Path $configPath) {
        $configText = Get-Content $configPath -Raw
        $m = [regex]::Match($configText, '(?m)^\s*project_id\s*=\s*"([^"]+)"\s*$')
        if ($m.Success) {
            $projectRef = $m.Groups[1].Value
        }
    }
}

if (-not $projectRef) {
    $projectRef = Read-Host "Enter Supabase project ref (e.g. abcdefghijklmnop)"
}

if (-not $projectRef) {
    Write-Host "❌ Missing project ref. Set SUPABASE_PROJECT_REF or link via: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Red
    exit 1
}

$dbEndpoint = if ($env:SUPABASE_DB_ENDPOINT) { $env:SUPABASE_DB_ENDPOINT } else { "db.$projectRef.supabase.co" }
$port = 5432
$database = "postgres"
$user = "postgres"

Write-Host "`n🔄 Supabase Migration Executor`n" -ForegroundColor Cyan

# Get password
$password = Read-Host "Enter PostgreSQL password"

if (-not $password) {
    Write-Host "❌ No password provided" -ForegroundColor Red
    exit 1
}

# Set password in PGPASSWORD environment variable
$env:PGPASSWORD = $password

Write-Host "`n🧪 Testing connection...`n"

# Test connection
$result = & psql -h $dbEndpoint -p $port -d $database -U $user -c "SELECT version();" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Connection failed" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host "✅ Connection successful`n" -ForegroundColor Green

# Find migration files
$migrationsDir = Join-Path $PSScriptRoot ".." "supabase" "migrations"
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object

Write-Host "📄 Found $($migrations.Count) migration files:`n" -ForegroundColor Green

$migrations | ForEach-Object { Write-Host "   • $($_.Name)" -ForegroundColor Cyan }

Write-Host ""

# Confirm
$confirm = Read-Host "Execute all migrations? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled"
    exit 0
}

Write-Host "`n⏳ Executing migrations...`n" -ForegroundColor Cyan

$success = 0
$failed = 0
$failed_list = @()

foreach ($migration in $migrations) {
    $name = $migration.Name
    $filePath = $migration.FullName
    
    Write-Host -NoNewline "[$($success + $failed + 1)/$($migrations.Count)] $name... "
    
    try {
        $result = & psql -h $dbEndpoint -p $port -d $database -U $user -f $filePath -v ON_ERROR_STOP=1 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅" -ForegroundColor Green
            $success++
        }
        else {
            Write-Host "❌" -ForegroundColor Red
            $failed++
            $failed_list += @{name=$name; error=$result}
        }
    }
    catch {
        Write-Host "❌" -ForegroundColor Red
        $failed++
        $failed_list += @{name=$name; error=$_.Exception.Message}
    }
}

# Summary
Write-Host "`n" + "="*60
Write-Host "✅ Migrations Complete" -ForegroundColor Green
Write-Host "   Successful: $success/$($migrations.Count)"

if ($failed -gt 0) {
    Write-Host "   Failed: $failed" -ForegroundColor Red
    Write-Host "`n❌ Failed migrations:" -ForegroundColor Red
    foreach ($fail in $failed_list) {
        Write-Host "   • $($fail.name)" -ForegroundColor Red
        $errorLines = $fail.error | Select-Object -First 3
        foreach ($line in $errorLines) {
            Write-Host "     $line" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "`n🎉 All migrations executed successfully!" -ForegroundColor Green
    Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify tables in Supabase Dashboard → Table Editor" -ForegroundColor Cyan
    Write-Host "   2. Check that 60+ tables were created" -ForegroundColor Cyan
    Write-Host "   3. Ready for testing and deployment!" -ForegroundColor Cyan
}

Write-Host "`n"

# Clean up
Remove-Item env:PGPASSWORD

#!/usr/bin/env powershell

<#
.SYNOPSIS
    Automated Supabase Migration Executor for Windows
    
.DESCRIPTION
    This script:
    1. Checks for PostgreSQL client (psql)
    2. Installs it if missing (using Chocolatey or direct download)
    3. Executes all migration files against your Supabase database
    
.PARAMETER ConnectionString
    Supabase connection string (optional - will prompt if not provided)
    
.EXAMPLE
    .\migrate.ps1
    .\migrate.ps1 -ConnectionString "postgresql://postgres:pass@db.supabase.co:5432/postgres"
#>

param(
    [string]$ConnectionString = ""
)

# Color helpers
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Info "`n🔄 Supabase Migration Executor`n"

# Check if psql is available
Write-Info "📋 Checking for PostgreSQL client..."
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Warning-Custom "`n⚠️  PostgreSQL client (psql) not found`n"
    Write-Info "Installing PostgreSQL client via Chocolatey..."
    
    # Check if Chocolatey is installed
    $chocoPath = Get-Command choco -ErrorAction SilentlyContinue
    
    if (-not $chocoPath) {
        Write-Info "`n📥 Installing Chocolatey first..."
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install PostgreSQL client
    Write-Info "`n📦 Installing PostgreSQL client..."
    choco install postgresql -y --params="'/InstallService:false'" 2>&1 | Out-Null
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify installation
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-Error-Custom "❌ Failed to install PostgreSQL client`n"
        Write-Info "Manual installation: https://www.postgresql.org/download/windows/`n"
        exit 1
    }
    
    Write-Success "✅ PostgreSQL client installed successfully`n"
}
else {
    Write-Success "✅ PostgreSQL client found: $($psqlPath.Source)`n"
}

# Get connection string
if (-not $ConnectionString) {
    Write-Info "📍 Getting Supabase connection string...",""
    Write-Info "   You can find it at: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database"
    Write-Info "   (Use 'Session' mode, not 'Connection pooler')`n"
    $ConnectionString = Read-Host "Enter your Supabase connection string"
}

if (-not $ConnectionString) {
    Write-Error-Custom "❌ No connection string provided`n"
    exit 1
}

# Parse connection string for display
if ($ConnectionString -match "postgresql://([^:]+):([^@]+)@([^/:]+)") {
    $host = $matches[3]
    Write-Success "✅ Connection string validated`n"
    Write-Info "📌 Host: $host`n"
}

# Find migration files
$migrationsDir = Join-Path $PSScriptRoot ".." "supabase" "migrations"

if (-not (Test-Path $migrationsDir)) {
    Write-Error-Custom "❌ Migrations directory not found: $migrationsDir`n"
    exit 1
}

$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Error-Custom "❌ No migration files found in $migrationsDir`n"
    exit 1
}

Write-Info "📄 Found $($migrationFiles.Count) migration files:`n"
$migrationFiles | ForEach-Object { Write-Info "   • $($_.Name)" }
Write-Info ""

# Confirm before proceeding
$confirm = Read-Host "Execute all migrations? (y/n)"
if ($confirm -ne "y") {
    Write-Info "Cancelled`n"
    exit 0
}

Write-Info "`n⏳ Executing migrations...`n"

$successCount = 0
$failureCount = 0
$failed = @()

# Execute each migration
$migrationFiles | ForEach-Object -Begin {
    $index = 0
} -Process {
    $index++
    $fileName = $_.Name
    $filePath = $_.FullName
    
    Write-Info "[$index/$($migrationFiles.Count)] Executing: $fileName"
    
    try {
        # Execute the migration file
        $output = & psql $ConnectionString -f $filePath -v ON_ERROR_STOP=1 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Success "   ✅ Success"
            $successCount++
        }
        else {
            Write-Error-Custom "   ❌ Failed"
            Write-Error-Custom "   Error: $(($output | Select-Object -First 3) -join ' ')"
            $failureCount++
            $failed += $fileName
        }
    }
    catch {
        Write-Error-Custom "   ❌ Exception: $($_.Exception.Message)"
        $failureCount++
        $failed += $fileName
    }
}

Write-Info "`n" + "="*60

Write-Success "✅ Migrations Complete"
Write-Info "   Successful: $successCount/$($migrationFiles.Count)"

if ($failureCount -gt 0) {
    Write-Error-Custom "   Failed: $failureCount"
    Write-Info "`n   Failed migrations:"
    $failed | ForEach-Object { Write-Error-Custom "   • $_" }
}
else {
    Write-Success "`n🎉 All migrations executed successfully!"
    Write-Info "`n📝 Next steps:"
    Write-Info "   1. Verify tables in Supabase Dashboard → Table Editor"
    Write-Info "   2. Check that 60+ tables were created"
    Write-Info "   3. Ready for testing and deployment!"
}

Write-Info "`n"

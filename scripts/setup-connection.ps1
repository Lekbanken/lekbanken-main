#!/usr/bin/env powershell

<#
.SYNOPSIS
    Quick Supabase Connection String Setup
    
.DESCRIPTION
    Helps you get your Supabase connection string and save it as environment variable
#>

Write-Host "`n🔌 Supabase Connection String Setup`n" -ForegroundColor Cyan

Write-Host "To get your connection string:`n" -ForegroundColor Green
Write-Host "1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database" -ForegroundColor Cyan
Write-Host "2. Under 'Connection string', select 'Session' (not 'Connection pooler')" -ForegroundColor Cyan
Write-Host "3. Copy the full PostgreSQL connection string" -ForegroundColor Cyan
Write-Host "4. Paste it below`n" -ForegroundColor Cyan

$connectionString = Read-Host "Paste your connection string"

if (-not $connectionString) {
    Write-Host "❌ No connection string provided" -ForegroundColor Red
    exit 1
}

# Validate connection string format
if ($connectionString -notmatch "postgresql://") {
    Write-Host "⚠️  Connection string doesn't look like PostgreSQL format" -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/n)"
    if ($confirm -ne "y") {
        exit 1
    }
}

Write-Host "✅ Connection string saved to environment variable" -ForegroundColor Green

# Set environment variable for current session
$env:DATABASE_URL = $connectionString

# Test connection
Write-Host "`n🧪 Testing connection..." -ForegroundColor Cyan

# Check if psql exists
$psql = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psql) {
    Write-Host "Installing PostgreSQL client..." -ForegroundColor Yellow
    & "$PSScriptRoot\install-postgres.ps1"
}

# Test the connection
try {
    $result = & psql $connectionString -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection successful!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Connection test returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Output: $result" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Could not test connection: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🚀 Ready to run migrations!" -ForegroundColor Green
Write-Host "Run: & '$PSScriptRoot\migrate.ps1' -ConnectionString `"$connectionString`"`n" -ForegroundColor Cyan

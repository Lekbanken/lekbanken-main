#!/usr/bin/env powershell

<#
.SYNOPSIS
    Install PostgreSQL Client Tools (psql)
    
.DESCRIPTION
    Installs PostgreSQL client via Chocolatey or direct download
#>

Write-Host "`n📦 PostgreSQL Client Installation`n" -ForegroundColor Cyan

# Check if already installed
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "✅ PostgreSQL client already installed at: $($psql.Source)" -ForegroundColor Green
    exit 0
}

# Try Chocolatey first
$choco = Get-Command choco -ErrorAction SilentlyContinue

if ($choco) {
    Write-Host "📥 Using Chocolatey to install PostgreSQL client..." -ForegroundColor Cyan
    choco install postgresql -y --params="'/InstallService:false'" | Out-Null
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
        Write-Host "✅ PostgreSQL client installed successfully" -ForegroundColor Green
        exit 0
    }
}

# If Chocolatey not available or failed, guide user to manual installation
Write-Host "⚠️  PostgreSQL client not installed via Chocolatey`n" -ForegroundColor Yellow

Write-Host "Please install manually:`n" -ForegroundColor Yellow
Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
Write-Host "2. Run the installer" -ForegroundColor Cyan
Write-Host "3. When asked, select 'Command Line Tools'" -ForegroundColor Cyan
Write-Host "4. Complete installation" -ForegroundColor Cyan
Write-Host "5. Restart PowerShell" -ForegroundColor Cyan
Write-Host "6. Run this script again`n" -ForegroundColor Cyan

$response = Read-Host "Or try Chocolatey installation? (y/n)"
if ($response -eq "y") {
    Write-Host "`n📥 Installing Chocolatey first..." -ForegroundColor Cyan
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    Write-Host "📦 Installing PostgreSQL..." -ForegroundColor Cyan
    choco install postgresql -y --params="'/InstallService:false'"
}

<#
.SYNOPSIS
  Canonical API wrapper coverage inventory.

.DESCRIPTION
  Scans all app/api/**/route.ts files and reports wrapper adoption metrics.
  Uses [System.IO.File]::ReadAllText() to avoid PowerShell 5.1 bracket-path bugs
  (Select-String and Get-Content both mishandle [param] directories).

.NOTES
  Primary metric:   wrapped files / total route files
  Secondary metric: wrapped handler exports / total handler exports

.EXAMPLE
  .\scripts\api-wrapper-inventory.ps1
  .\scripts\api-wrapper-inventory.ps1 -Verbose
#>
[CmdletBinding()]
param()

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "app\api"

$totalFiles = 0; $wrappedFiles = 0; $unwrappedFiles = 0; $mixedFiles = 0
$wrappedHandlers = 0; $unwrappedHandlers = 0
$tenantAuthImports = @(); $assertTAS = @(); $isSystemAdminRefs = @(); $isTenantAdminRefs = @()

Get-ChildItem -Path $apiDir -Recurse -Filter "route.ts" | ForEach-Object {
  $totalFiles++
  $content = [System.IO.File]::ReadAllText($_.FullName)
  $rel = $_.FullName.Substring($root.Length + 1)

  $wc = [regex]::Matches($content, 'export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*apiHandler').Count
  $uc = [regex]::Matches($content, 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)').Count

  $wrappedHandlers += $wc
  $unwrappedHandlers += $uc

  if ($wc -gt 0 -and $uc -gt 0) { $mixedFiles++ }
  if ($wc -gt 0) { $wrappedFiles++ } elseif ($uc -gt 0) { $unwrappedFiles++ }

  if ($content -match "from\s+'@/lib/utils/tenantAuth'") { $tenantAuthImports += $rel }
  if ($content -match 'assertTenantAdminOrSystem') { $assertTAS += $rel }
  if ($content -match '\bisSystemAdmin\b') { $isSystemAdminRefs += $rel }
  if ($content -match '\bisTenantAdmin\b') { $isTenantAdminRefs += $rel }
}

$totalHandlers = $wrappedHandlers + $unwrappedHandlers
$filePct = if ($totalFiles -gt 0) { [math]::Round($wrappedFiles / $totalFiles * 100, 1) } else { 0 }
$handlerPct = if ($totalHandlers -gt 0) { [math]::Round($wrappedHandlers / $totalHandlers * 100, 1) } else { 0 }

Write-Host ""
Write-Host "=== API Wrapper Coverage Inventory ===" -ForegroundColor Cyan
Write-Host "  Method: .NET ReadAllText (bracket-safe)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "--- FILE-LEVEL (primary) ---" -ForegroundColor Yellow
Write-Host "  Total route files:    $totalFiles"
Write-Host "  Wrapped files:        $wrappedFiles ($filePct%)" -ForegroundColor Green
Write-Host "  Unwrapped-only files: $unwrappedFiles"
Write-Host "  Mixed files:          $mixedFiles"
Write-Host ""
Write-Host "--- HANDLER-LEVEL (secondary) ---" -ForegroundColor Yellow
Write-Host "  Wrapped handlers:     $wrappedHandlers ($handlerPct%)" -ForegroundColor Green
Write-Host "  Unwrapped handlers:   $unwrappedHandlers"
Write-Host "  Total handlers:       $totalHandlers"
Write-Host ""
Write-Host "--- TENANTAUTH BACKLOG ---" -ForegroundColor Yellow
Write-Host "  tenantAuth imports:           $($tenantAuthImports.Count)"
$tenantAuthImports | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
Write-Host "  assertTenantAdminOrSystem:    $($assertTAS.Count)"
$assertTAS | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
Write-Host "  isSystemAdmin (all sources):  $($isSystemAdminRefs.Count)"
Write-Host "  isTenantAdmin:                $($isTenantAdminRefs.Count)"
Write-Host ""

if ($VerbosePreference -eq 'Continue') {
  Write-Host "--- isSystemAdmin files ---" -ForegroundColor Yellow
  $isSystemAdminRefs | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  Write-Host ""
  Write-Host "--- isTenantAdmin files ---" -ForegroundColor Yellow
  $isTenantAdminRefs | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  Write-Host ""
}

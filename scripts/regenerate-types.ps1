#!/usr/bin/env pwsh
# Script för att regenerera Supabase types från remote databas

Write-Host "🔄 Regenererar Supabase TypeScript types från remote databas..." -ForegroundColor Cyan

# Kolla om Supabase CLI är installerat
$supabaseCLI = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCLI) {
    Write-Host "❌ Supabase CLI är inte installerat!" -ForegroundColor Red
    Write-Host "Installera med: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Kolla om vi är länkade till ett projekt
$linkFile = ".\.supabase\config.toml"
if (-not (Test-Path $linkFile)) {
    Write-Host "⚠️  Projektet är inte länkat till Supabase" -ForegroundColor Yellow
    Write-Host "Länka med: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 Hämtar schema från remote databas..." -ForegroundColor Green

try {
    # Generera types från linked project
    $output = & supabase gen types typescript --linked 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Skriv till fil
        $output | Out-File -FilePath "types\supabase.ts" -Encoding UTF8
        
        Write-Host "✅ Types regenererade framgångsrikt!" -ForegroundColor Green
        Write-Host "📄 Fil uppdaterad: types\supabase.ts" -ForegroundColor Cyan
        
        # Visa statistik
        $lineCount = (Get-Content "types\supabase.ts").Count
        Write-Host "📊 Antal rader: $lineCount" -ForegroundColor Gray
        
        # Kör type check
        Write-Host "`n🔍 Kör TypeScript type check..." -ForegroundColor Cyan
        npm run type-check
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Inga type errors!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Type errors hittades - se output ovan" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Kunde inte generera types!" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Ett fel uppstod: $_" -ForegroundColor Red
    exit 1
}

#!/usr/bin/env pwsh
# Script för att hitta och lista alla 'as any' casts i projektet

Write-Host "🔍 Söker efter 'as any' casts i projektet..." -ForegroundColor Cyan

$patterns = @(
    "(supabase as any)",
    "} as any",
    ": any",
    "as any)"
)

$files = Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse -File | 
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch ".next" -and $_.FullName -notmatch "types\\supabase.ts" }

$results = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "as any") {
        $lines = Get-Content $file.FullName
        $lineNumber = 0
        foreach ($line in $lines) {
            $lineNumber++
            if ($line -match "as any") {
                $results += [PSCustomObject]@{
                    File = $file.FullName.Replace((Get-Location).Path + "\", "")
                    Line = $lineNumber
                    Content = $line.Trim()
                }
            }
        }
    }
}

if ($results.Count -eq 0) {
    Write-Host "✅ Inga 'as any' casts hittades!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Hittade $($results.Count) 'as any' casts:" -ForegroundColor Yellow
    Write-Host ""
    
    $groupedResults = $results | Group-Object File
    foreach ($group in $groupedResults) {
        Write-Host "📄 $($group.Name)" -ForegroundColor Cyan
        foreach ($item in $group.Group) {
            Write-Host "   Line $($item.Line): $($item.Content)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "💡 Dessa bör tas bort efter att types har regenererats" -ForegroundColor Yellow
}

exit $results.Count

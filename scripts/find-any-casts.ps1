## Script to find and list all 'as any' casts in the project

Write-Host "Searching for 'as any' casts..." -ForegroundColor Cyan

$files = Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse -File | 
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch ".next" -and $_.FullName -notmatch "types\\supabase.ts" }

$results = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    if ($content -match "as any") {
        $lines = Get-Content -LiteralPath $file.FullName
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
    Write-Host "No 'as any' casts found." -ForegroundColor Green
} else {
    Write-Host "Found $($results.Count) 'as any' casts:" -ForegroundColor Yellow
    Write-Host ""
    
    $groupedResults = $results | Group-Object File
    foreach ($group in $groupedResults) {
        Write-Host "File: $($group.Name)" -ForegroundColor Cyan
        foreach ($item in $group.Group) {
            Write-Host "   Line $($item.Line): $($item.Content)" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "Tip: remove these after regenerating types." -ForegroundColor Yellow
}

exit 0

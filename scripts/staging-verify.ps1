# Staging verification script for Trigger Engine V2.4
$ErrorActionPreference = "Stop"

$url = "https://qohhnufxididbmzqnjwg.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvaGhudWZ4aWRpZGJtenFuandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzE0NzAsImV4cCI6MjA3OTkwNzQ3MH0.dlw5ZlZQUekdZhSA5LbI8vVKhYuoNIW8H2lLAWGBxl8"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvaGhudWZ4aWRpZGJtenFuandnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDMzMTQ3MCwiZXhwIjoyMDc5OTA3NDcwfQ.t5yMpAUPxFz96tmd4vf968UbS17YT8wgAw4xlVY2qJQ"

$headers = @{ 
    "apikey" = $anonKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== STAGING VERIFICATION ===" -ForegroundColor Cyan

# Step 1: Find active sessions
Write-Host "`n[1] Finding active sessions..." -ForegroundColor Yellow
$sessions = Invoke-RestMethod -Uri "$url/rest/v1/participant_sessions?select=id,session_code,status,game_id&status=eq.active&limit=5" -Headers $headers
Write-Host "Found $($sessions.Count) active sessions"
$sessions | ForEach-Object { Write-Host "  - $($_.session_code): $($_.id)" }

if ($sessions.Count -eq 0) {
    Write-Host "No active sessions found. Creating a test session..." -ForegroundColor Red
    exit 1
}

$testSession = $sessions[0]
Write-Host "`nUsing session: $($testSession.session_code) ($($testSession.id))" -ForegroundColor Green

# Step 2: Find triggers for this session's game
Write-Host "`n[2] Finding triggers for game $($testSession.game_id)..." -ForegroundColor Yellow
$triggers = Invoke-RestMethod -Uri "$url/rest/v1/game_triggers?select=id,name,execute_once,enabled&game_id=eq.$($testSession.game_id)&enabled=eq.true&limit=5" -Headers $headers
Write-Host "Found $($triggers.Count) enabled triggers"
$triggers | ForEach-Object { Write-Host "  - $($_.name): execute_once=$($_.execute_once)" }

if ($triggers.Count -eq 0) {
    Write-Host "No triggers found for this game." -ForegroundColor Red
    exit 1
}

$testTrigger = $triggers[0]
Write-Host "`nUsing trigger: $($testTrigger.name) ($($testTrigger.id))" -ForegroundColor Green

# Step 3: Test RPC - First fire
Write-Host "`n[3] Testing fire_trigger_v2_safe RPC..." -ForegroundColor Yellow
$testKey = "staging-test-$(Get-Date -Format 'yyyyMMddHHmmss')"

$body = @{
    p_session_id = $testSession.id
    p_game_trigger_id = $testTrigger.id
    p_idempotency_key = $testKey
    p_actor_user_id = $null
} | ConvertTo-Json

Write-Host "C1: First fire with key '$testKey'..."
try {
    $result1 = Invoke-RestMethod -Uri "$url/rest/v1/rpc/fire_trigger_v2_safe" -Method POST -Headers $headers -Body $body
    Write-Host "  Result: status=$($result1.status), ok=$($result1.ok), fired_count=$($result1.fired_count)" -ForegroundColor $(if($result1.status -eq 'fired'){'Green'}else{'Yellow'})
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $_.ErrorDetails.Message
}

# Step 4: Test replay (same key)
Write-Host "`nC2: Replay with same key '$testKey'..."
try {
    $result2 = Invoke-RestMethod -Uri "$url/rest/v1/rpc/fire_trigger_v2_safe" -Method POST -Headers $headers -Body $body
    Write-Host "  Result: status=$($result2.status), replay=$($result2.replay), reason=$($result2.reason)" -ForegroundColor $(if($result2.replay){'Green'}else{'Yellow'})
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Test execute_once (new key, if applicable)
if ($testTrigger.execute_once) {
    $testKey2 = "staging-test-2-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $body2 = @{
        p_session_id = $testSession.id
        p_game_trigger_id = $testTrigger.id
        p_idempotency_key = $testKey2
        p_actor_user_id = $null
    } | ConvertTo-Json
    
    Write-Host "`nC3: execute_once with new key '$testKey2'..."
    try {
        $result3 = Invoke-RestMethod -Uri "$url/rest/v1/rpc/fire_trigger_v2_safe" -Method POST -Headers $headers -Body $body2
        Write-Host "  Result: status=$($result3.status), reason=$($result3.reason)" -ForegroundColor $(if($result3.status -eq 'noop'){'Green'}else{'Yellow'})
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 6: Check trigger state
Write-Host "`n[4] Checking trigger state..." -ForegroundColor Yellow
$state = Invoke-RestMethod -Uri "$url/rest/v1/session_trigger_state?select=status,fired_count,fired_at&session_id=eq.$($testSession.id)&game_trigger_id=eq.$($testTrigger.id)" -Headers $headers
if ($state) {
    Write-Host "  Status: $($state.status), Fired Count: $($state.fired_count), Fired At: $($state.fired_at)" -ForegroundColor Green
} else {
    Write-Host "  No state record found" -ForegroundColor Yellow
}

# Step 7: Check session_events
Write-Host "`n[5] Checking session_events logging..." -ForegroundColor Yellow
$events = Invoke-RestMethod -Uri "$url/rest/v1/session_events?select=created_at,event_type,payload&session_id=eq.$($testSession.id)&event_type=eq.trigger_fire&order=created_at.desc&limit=3" -Headers $headers
Write-Host "Found $($events.Count) trigger_fire events"
$events | ForEach-Object { 
    Write-Host "  - $($_.created_at): $($_.payload.result)" 
}

Write-Host "`n=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan

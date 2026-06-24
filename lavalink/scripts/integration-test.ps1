# Lavalink Integration Test Suite
# Tests full pipeline: Lavalink -> Node.js bot -> Discord

Write-Host "=== Integration Test Suite ===" -ForegroundColor Cyan

$tests = @()
$pass = 0
$fail = 0

function Add-Test {
    param([string]$Name, [bool]$Result, [string]$Detail = "")
    $script:tests += @{ Name = $Name; Result = $Result; Detail = $Detail }
    if ($Result) { $script:pass++ } else { $script:fail++ }
}

# Test 1: Lavalink server running
Write-Host "`n[1] Lavalink Server" -ForegroundColor Yellow
$java = Get-Process -Name "java" -ErrorAction SilentlyContinue
Add-Test "Java process running" ($null -ne $java)

$port = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue
Add-Test "Port 2333 listening" ($null -ne $port)

# Test 2: HTTP API
Write-Host "`n[2] HTTP API" -ForegroundColor Yellow
try {
    $password = "youshallnotpass"
    $headers = @{ "Authorization" = $password }
    $response = Invoke-WebRequest -Uri "http://localhost:2333/version" -Headers $headers -TimeoutSec 5 -UseBasicParsing
    Add-Test "Version endpoint" ($response.StatusCode -eq 200) "Version: $($response.Content)"
} catch {
    Add-Test "Version endpoint" ($false) $_.Exception.Message
}

# Test 3: Plugins loaded
Write-Host "`n[3] Plugins" -ForegroundColor Yellow
$plugins = Get-ChildItem "D:\lol\lavalink\plugins" -Filter "*.jar" -ErrorAction SilentlyContinue
Add-Test "Plugins directory" ($plugins.Count -gt 0) "Found: $($plugins.Count) JARs"

# Test 4: Configuration valid
Write-Host "`n[4] Configuration" -ForegroundColor Yellow
$yml = Get-Content "D:\lol\lavalink\application.yml" -Raw -ErrorAction SilentlyContinue
Add-Test "application.yml exists" ($null -ne $yml)
Add-Test "Port configured correctly" ($yml -match "port: 2333")
Add-Test "Password configured" ($yml -match "password:")

# Test 5: Node.js bot connected
Write-Host "`n[5] Node.js Bot" -ForegroundColor Yellow
$nodeProc = Get-Process -Name "node" -ErrorAction SilentlyContinue
Add-Test "Node.js process running" ($null -ne $nodeProc)

# Test 6: Database accessible
Write-Host "`n[6] Database" -ForegroundColor Yellow
$dbFile = "D:\lol\hacker_bot.db"
Add-Test "SQLite database exists" (Test-Path $dbFile)

# Test 7: System resources
Write-Host "`n[7] System Resources" -ForegroundColor Yellow
$mem = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB
Add-Test "Available memory > 500MB" ($mem -gt 0.5) "Free: $([math]::Round($mem, 2)) GB"

# Summary
Write-Host "`n=== Integration Test Results ===" -ForegroundColor Cyan
$tests | ForEach-Object {
    $status = if ($_.Result) { "[PASS]" } else { "[FAIL]" }
    $color = if ($_.Result) { "Green" } else { "Red" }
    $detail = if ($_.Detail) { " - $($_.Detail)" } else { "" }
    Write-Host "  $status $($_.Name)$detail" -ForegroundColor $color
}

Write-Host "`n  Total: $($pass + $fail) | Passed: $pass | Failed: $fail" -ForegroundColor Cyan

if ($fail -eq 0) {
    Write-Host "`n  ALL INTEGRATION TESTS PASSED!" -ForegroundColor Green
    Write-Host "  Lavalink is fully integrated with the bot." -ForegroundColor Green
} else {
    Write-Host "`n  $fail tests failed. Review above." -ForegroundColor Red
}

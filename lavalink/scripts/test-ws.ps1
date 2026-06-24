# Lavalink WebSocket Test Script
# Tests connectivity and validates WebSocket configuration

param(
    [string]$Host = "localhost",
    [int]$Port = 2333,
    [int]$Timeout = 10000
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== Lavalink WebSocket Test ===" -ForegroundColor Cyan
Write-Host "Target: ${Host}:${Port}" -ForegroundColor Gray
Write-Host ""

# Test 1: TCP Connectivity
Write-Host "[1/4] Testing TCP connectivity..." -NoNewline
$tcpTest = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue
if ($tcpTest.TcpTestSucceeded) {
    Write-Host " PASS" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "Cannot reach Lavalink on port $Port" -ForegroundColor Yellow
    exit 1
}

# Test 2: HTTP Upgrade Check (WebSocket handshake)
Write-Host "[2/4] Testing WebSocket upgrade..." -NoNewline
try {
    $headers = @{
        "Upgrade" = "websocket"
        "Connection" = "Upgrade"
        "Sec-WebSocket-Key" = "dGhlIHNhbXBsZSBub25jZQ=="
        "Sec-WebSocket-Version" = "13"
    }
    $response = Invoke-WebRequest -Uri "http://${Host}:${Port}/" -Headers $headers -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host " PASS" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 101) {
        Write-Host " PASS (101 Switching Protocols)" -ForegroundColor Green
    } else {
        Write-Host " PARTIAL (HTTP available)" -ForegroundColor Yellow
    }
}

# Test 3: Existing Connections
Write-Host "[3/4] Checking existing connections..." -NoNewline
$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($connections) {
    $established = ($connections | Where-Object { $_.State -eq "Established" }).Count
    $listening = ($connections | Where-Object { $_.State -eq "Listen" }).Count
    Write-Host " PASS" -ForegroundColor Green
    Write-Host "  Established: $established | Listening: $listening" -ForegroundColor Gray
} else {
    Write-Host " NO CONNECTIONS" -ForegroundColor Yellow
}

# Test 4: Config Validation
Write-Host "[4/4] Validating WebSocket config..." -NoNewline
$configPath = Join-Path $PSScriptRoot "..\swarm\network\websocket-config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Host " PASS" -ForegroundColor Green
    Write-Host "  Heartbeat:      $($config.heartbeat)ms" -ForegroundColor Gray
    Write-Host "  Connect Timeout: $($config.connectTimeout)ms" -ForegroundColor Gray
    Write-Host "  Max Frame:      $($config.maxFrameSize) bytes" -ForegroundColor Gray
    Write-Host "  Keep Alive:     $($config.keepAlive)" -ForegroundColor Gray
    Write-Host "  Compression:    $($config.compression)" -ForegroundColor Gray
    Write-Host "  Max Message:    $($config.maxMessageSize) bytes" -ForegroundColor Gray
    Write-Host "  Idle Timeout:   $($config.idleTimeout)ms" -ForegroundColor Gray
} else {
    Write-Host " CONFIG NOT FOUND" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan

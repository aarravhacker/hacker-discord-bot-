# Lavalink Health Check System
# Monitors all critical components

param(
    [switch]$Continuous,
    [int]$Interval = 30
)

$Port = 2333
$LogFile = "D:\lol\lavalink\logs\health.log"

function Write-HealthLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $entry
    switch ($Level) {
        "ERROR" { Write-Host $entry -ForegroundColor Red }
        "WARN"  { Write-Host $entry -ForegroundColor Yellow }
        default { Write-Host $entry -ForegroundColor Green }
    }
}

function Test-LavalinkHealth {
    $health = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        JavaProcess = $false
        PortListening = $false
        HTTPResponse = $false
        WebSocketOk = $false
        MemoryUsage = 0
        CPUUsage = 0
    }

    # Check Java process
    $java = Get-Process -Name "java" -ErrorAction SilentlyContinue
    if ($java) {
        $health.JavaProcess = $true
        $health.MemoryUsage = [math]::Round($java.WorkingSet64 / 1MB, 2)
        $health.CPUUsage = [math]::Round($java.CPU, 2)
    }

    # Check port
    $port = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($port) { $health.PortListening = $true }

    # HTTP health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/version" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) { $health.HTTPResponse = $true }
    } catch {}

    return $health
}

function Show-HealthDashboard {
    param($Health)
    
    Write-Host "`n=== Lavalink Health Dashboard ===" -ForegroundColor Cyan
    Write-Host "Time: $($Health.Timestamp)"
    
    $status = if ($Health.JavaProcess -and $Health.PortListening -and $Health.HTTPResponse) { "HEALTHY" } else { "UNHEALTHY" }
    $color = if ($status -eq "HEALTHY") { "Green" } else { "Red" }
    Write-Host "Status: $status" -ForegroundColor $color
    
    Write-Host "Java Process: $(if ($Health.JavaProcess) { 'Running' } else { 'Not Running' })"
    Write-Host "Port $Port: $(if ($Health.PortListening) { 'Listening' } else { 'Not Listening' })"
    Write-Host "HTTP Response: $(if ($Health.HTTPResponse) { 'OK' } else { 'Failed' })"
    Write-Host "Memory: $($Health.MemoryUsage) MB"
    Write-Host "CPU: $($Health.CPUUsage) seconds"
    Write-Host "==================================`n"
}

if ($Continuous) {
    while ($true) {
        $health = Test-LavalinkHealth
        Show-HealthDashboard -Health $health
        Start-Sleep -Seconds $Interval
    }
} else {
    $health = Test-LavalinkHealth
    Show-HealthDashboard -Health $health
}

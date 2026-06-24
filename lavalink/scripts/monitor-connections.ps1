<#
.SYNOPSIS
    Lavalink Connection Pool Monitor
.DESCRIPTION
    Monitors TCP/WebSocket connections and validates against pool configuration thresholds.
#>

param(
    [string]$ConfigPath = "D:\lol\lavalink\swarm\network\connection-pool.json",
    [int]$WarnThresholdPercent = 80,
    [int]$CriticalThresholdPercent = 95
)

function Get-PoolConfig {
    if (Test-Path $ConfigPath) {
        return Get-Content $ConfigPath -Raw | ConvertFrom-Json
    }
    Write-Warning "Config not found at $ConfigPath, using defaults"
    return @{
        http = @{ maxTotal = 200; maxPerRoute = 50 }
        websocket = @{ maxSessions = 50 }
    }
}

function Get-ConnectionSummary {
    $connections = Get-NetTCPConnection -State Established
    $total = ($connections | Measure-Object).Count
    $byLocalPort = $connections | Group-Object -Property LocalPort | Sort-Object -Property Count -Descending
    $byRemoteAddress = $connections | Group-Object -Property RemoteAddress | Sort-Object -Property Count -Descending

    return [PSCustomObject]@{
        Total = $total
        ByLocalPort = $byLocalPort
        ByRemoteAddress = $byRemoteAddress
        Listening = (Get-NetTCPConnection -State Listen | Measure-Object).Count
        TimeWait = (Get-NetTCPConnection -State TimeWait | Measure-Object).Count
        CloseWait = (Get-NetTCPConnection -State CloseWait | Measure-Object).Count
    }
}

function Get-ConnectionPoolHealth {
    param(
        [int]$CurrentConnections,
        [int]$MaxConnections,
        [int]$WarnPercent,
        [int]$CriticalPercent
    )

    $usagePercent = if ($MaxConnections -gt 0) { [math]::Round(($CurrentConnections / $MaxConnections) * 100) } else { 0 }

    $status = "Healthy"
    if ($usagePercent -ge $CriticalPercent) {
        $status = "Critical"
    } elseif ($usagePercent -ge $WarnPercent) {
        $status = "Warning"
    }

    return [PSCustomObject]@{
        UsagePercent = $usagePercent
        Status = $status
        Current = $CurrentConnections
        Max = $MaxConnections
    }
}

function Show-MonitorReport {
    $config = Get-PoolConfig
    $summary = Get-ConnectionSummary

    $httpHealth = Get-ConnectionPoolHealth -CurrentConnections $summary.Total -MaxConnections $config.http.maxTotal -WarnPercent $WarnThresholdPercent -CriticalPercent $CriticalThresholdPercent

    Write-Host "`n=== Lavalink Connection Pool Monitor ===" -ForegroundColor Cyan
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

    Write-Host "--- HTTP Pool ---" -ForegroundColor Yellow
    Write-Host "Connections: $($httpHealth.Current) / $($httpHealth.Max) ($($httpHealth.UsagePercent)%)"
    $statusColor = switch ($httpHealth.Status) {
        "Healthy"  { "Green" }
        "Warning"  { "Yellow" }
        "Critical" { "Red" }
    }
    Write-Host "Status: $($httpHealth.Status)" -ForegroundColor $statusColor

    Write-Host "`n--- Connection States ---" -ForegroundColor Yellow
    Write-Host "Established: $($summary.Total)"
    Write-Host "Listening:   $($summary.Listening)"
    Write-Host "TimeWait:    $($summary.TimeWait)"
    Write-Host "CloseWait:   $($summary.CloseWait)"

    if ($summary.ByRemoteAddress) {
        Write-Host "`n--- Top Remote Addresses ---" -ForegroundColor Yellow
        $summary.ByRemoteAddress | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Count) connections"
        }
    }

    if ($summary.ByLocalPort) {
        Write-Host "`n--- Top Local Ports ---" -ForegroundColor Yellow
        $summary.ByLocalPort | Select-Object -First 5 | ForEach-Object {
            Write-Host "  Port $($_.Name): $($_.Count) connections"
        }
    }

    Write-Host "`n--- Thresholds ---" -ForegroundColor Yellow
    Write-Host "Warn at:     $($WarnThresholdPercent)% ($([math]::Round($config.http.maxTotal * $WarnThresholdPercent / 100)) connections)"
    Write-Host "Critical at: $($CriticalThresholdPercent)% ($([math]::Round($config.http.maxTotal * $CriticalThresholdPercent / 100)) connections)"
    Write-Host "Max total:   $($config.http.maxTotal)"
    Write-Host "Max/route:   $($config.http.maxPerRoute)`n"

    return $httpHealth
}

$health = Show-MonitorReport
if ($health.Status -eq "Critical") {
    exit 2
} elseif ($health.Status -eq "Warning") {
    exit 1
}
exit 0

param(
    [switch]$Apply,
    [switch]$Test
)

$ErrorActionPreference = "Stop"

function Test-DnsResolution {
    param([string]$Hostname, [string]$DnsServer = $null)
    $result = @{ Host = $Hostname; Resolved = $false; IP = $null; TimeMs = 0; Error = $null }
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        if ($DnsServer) {
            $dns = Resolve-DnsName $Hostname -Server $DnsServer -Type A -ErrorAction Stop | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
        } else {
            $dns = Resolve-DnsName $Hostname -Type A -ErrorAction Stop | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
        }
        $sw.Stop()
        $result.Resolved = $true
        $result.IP = $dns.IPAddress
        $result.TimeMs = $sw.ElapsedMilliseconds
    } catch {
        $sw.Stop()
        $result.Error = $_.Exception.Message
        $result.TimeMs = $sw.ElapsedMilliseconds
    }
    return $result
}

function Test-DnsServers {
    param([string[]]$Hostnames, [string[]]$Servers)
    $allResults = @()
    foreach ($server in $Servers) {
        Write-Host "`n=== Testing DNS Server: $server ===" -ForegroundColor Cyan
        foreach ($hn in $Hostnames) {
            $r = Test-DnsResolution -Hostname $hn -DnsServer $server
            $status = if ($r.Resolved) { "[OK]" } else { "[FAIL]" }
            $color = if ($r.Resolved) { "Green" } else { "Red" }
            Write-Host ("  {0} {1} -> {2} ({3}ms)" -f $status, $hn, $r.IP, $r.TimeMs) -ForegroundColor $color
            $allResults += $r
        }
    }
    return $allResults
}

function Set-FastestDns {
    param([string[]]$Hostnames, [string[]]$CandidateServers)
    $scores = @{}
    foreach ($server in $CandidateServers) {
        $totalMs = 0
        $failures = 0
        foreach ($hn in $Hostnames) {
            $r = Test-DnsResolution -Hostname $hn -DnsServer $server
            $totalMs += $r.TimeMs
            if (-not $r.Resolved) { $failures++ }
        }
        $scores[$server] = @{ TotalMs = $totalMs; Failures = $failures }
        Write-Host ("Server {0}: {1}ms total, {2} failures" -f $server, $totalMs, $failures)
    }
    $best = $scores.GetEnumerator() | Sort-Object { $_.Value.TotalMs } | Select-Object -First 1
    Write-Host "`nFastest DNS: $($best.Key)" -ForegroundColor Green
    return $best.Key
}

$criticalHosts = @("youtube.com", "open.spotify.com", "api.soundcloud.com")
$candidateServers = @("192.168.1.1", "8.8.8.8", "1.1.1.1", "208.67.222.222")

Write-Host "===== Lavalink DNS Optimization =====" -ForegroundColor Yellow
Write-Host "Critical services:" -ForegroundColor White
$criticalHosts | ForEach-Object { Write-Host "  - $_" }

Write-Host "`n--- Current DNS Resolution ---" -ForegroundColor Yellow
$defaultResults = Test-DnsServers -Hostnames $criticalHosts -Servers @($null)

if ($Test) {
    Write-Host "`n--- Candidate Server Benchmark ---" -ForegroundColor Yellow
    $allResults = Test-DnsServers -Hostnames $criticalHosts -Servers $candidateServers
    $bestServer = Set-FastestDns -Hostnames $criticalHosts -CandidateServers $candidateServers

    Write-Host "`n--- Current System DNS ---" -ForegroundColor Yellow
    Get-DnsClientServerAddress | Where-Object { $_.ServerAddresses.Count -gt 0 } |
        Select-Object InterfaceAlias, ServerAddresses | Format-Table -AutoSize
}

if ($Apply) {
    $bestServer = Set-FastestDns -Hostnames $criticalHosts -CandidateServers $candidateServers
    $interfaces = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -ExpandProperty InterfaceAlias

    Write-Host "`n--- Applying DNS: $bestServer ---" -ForegroundColor Green
    foreach ($iface in $interfaces) {
        Set-DnsClientServerAddress -InterfaceAlias $iface -ServerAddresses @($bestServer, "8.8.8.8")
        Write-Host "  Updated: $iface" -ForegroundColor Cyan
    }

    Write-Host "`nFlushing DNS cache..."
    Clear-DnsClientCache
    Write-Host "Done." -ForegroundColor Green

    Write-Host "`n--- Verifying ---" -ForegroundColor Yellow
    Test-DnsServers -Hostnames $criticalHosts -Servers @($null) | Out-Null
}

$configPath = Join-Path $PSScriptRoot "..\swarm\network\dns-config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Host "`n--- Loaded DNS Config ---" -ForegroundColor Yellow
    Write-Host "  Servers: $($config.dnsServers -join ', ')"
    Write-Host "  Timeout: $($config.timeout)ms"
    Write-Host "  Cache TTL: $($config.cacheTimeout)s"
    Write-Host "  Retry attempts: $($config.retryAttempts)"
}

Write-Host "`n===== Complete =====" -ForegroundColor Yellow

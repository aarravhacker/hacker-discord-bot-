# Lavalink WebSocket Stress Test
# Simulates multiple concurrent connections

param(
    [int]$MaxConnections = 50,
    [int]$TestDuration = 60,
    [int]$Interval = 1
)

Write-Host "=== Lavalink WebSocket Stress Test ===" -ForegroundColor Cyan
Write-Host "Max connections: $MaxConnections"
Write-Host "Duration: ${TestDuration}s"

$Port = 2333
$results = @{
    TotalAttempts = 0
    Successful = 0
    Failed = 0
    AvgResponseTime = 0
    MaxResponseTime = 0
    MinResponseTime = [int]::MaxValue
}

$jobs = @()
$startTime = Get-Date

Write-Host "`nStarting stress test..." -ForegroundColor Yellow

# Test HTTP connections (simulates REST API load)
for ($i = 1; $i -le $MaxConnections; $i++) {
    $job = Start-Job -ScriptBlock {
        param($port, $id)
        $results = @{ Id = $id; Success = $false; ResponseTime = 0 }
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri "http://localhost:$port/version" -TimeoutSec 5 -UseBasicParsing
            $sw.Stop()
            $results.Success = $response.StatusCode -eq 200
            $results.ResponseTime = $sw.ElapsedMilliseconds
        } catch {
            $results.Error = $_.Exception.Message
        }
        return $results
    } -ArgumentList $Port, $i
    
    $jobs += $job
    
    if ($i % 10 -eq 0) {
        Write-Host "  Spawned $i connections..." -ForegroundColor DarkGray
    }
    
    Start-Sleep -Milliseconds 100
}

# Wait for all jobs
Write-Host "`nWaiting for results..." -ForegroundColor Yellow
$jobResults = $jobs | Wait-Job -Timeout $TestDuration | Receive-Job
$jobs | Remove-Job -Force -ErrorAction SilentlyContinue

# Calculate results
$successful = ($jobResults | Where-Object { $_.Success }).Count
$failed = ($jobResults | Where-Object { -not $_.Success }).Count
$responseTimes = $jobResults | Where-Object { $_.ResponseTime -gt 0 } | Select-Object -ExpandProperty ResponseTime

$results.TotalAttempts = $jobResults.Count
$results.Successful = $successful
$results.Failed = $failed
if ($responseTimes.Count -gt 0) {
    $results.AvgResponseTime = [math]::Round(($responseTimes | Measure-Object -Average).Average, 2)
    $results.MaxResponseTime = ($responseTimes | Measure-Object -Maximum).Maximum
    $results.MinResponseTime = ($responseTimes | Measure-Object -Minimum).Minimum
}

# Report
Write-Host "`n=== Stress Test Results ===" -ForegroundColor Cyan
Write-Host "  Total attempts: $($results.TotalAttempts)"
Write-Host "  Successful: $($results.Successful)" -ForegroundColor Green
Write-Host "  Failed: $($results.Failed)" -ForegroundColor $(if ($results.Failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Success rate: $([math]::Round(($results.Successful / $results.TotalAttempts) * 100, 1))%"
Write-Host "`nResponse Times:"
Write-Host "  Average: $($results.AvgResponseTime)ms"
Write-Host "  Min: $($results.MinResponseTime)ms"
Write-Host "  Max: $($results.MaxResponseTime)ms"

# Verdict
$verdict = if ($results.Failed -eq 0 -and $results.AvgResponseTime -lt 100) { "EXCELLENT" }
           elseif ($results.Failed -lt 5 -and $results.AvgResponseTime -lt 500) { "GOOD" }
           else { "NEEDS IMPROVEMENT" }
Write-Host "`n  Verdict: $verdict" -ForegroundColor $(if ($verdict -eq "EXCELLENT") { "Green" } elseif ($verdict -eq "GOOD") { "Yellow" } else { "Red" })

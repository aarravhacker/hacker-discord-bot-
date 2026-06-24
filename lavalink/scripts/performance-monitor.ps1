# Lavalink Performance Monitor
# Real-time metrics dashboard

param(
    [int]$RefreshInterval = 5
)

while ($true) {
    Clear-Host
    Write-Host "=== Lavalink Performance Monitor ===" -ForegroundColor Cyan
    Write-Host "Refresh: ${RefreshInterval}s | Press Ctrl+C to stop`n"

    # Java process metrics
    $java = Get-Process -Name "java" -ErrorAction SilentlyContinue
    if ($java) {
        $memMB = [math]::Round($java.WorkingSet64 / 1MB, 2)
        $cpuSec = [math]::Round($java.CPU, 2)
        $threads = $java.Threads.Count
        $handles = $java.HandleCount
        
        Write-Host "Java Process:" -ForegroundColor Yellow
        Write-Host "  PID: $($java.Id)"
        Write-Host "  Memory: $memMB MB"
        Write-Host "  CPU Time: $cpuSec seconds"
        Write-Host "  Threads: $threads"
        Write-Host "  Handles: $handles"
    } else {
        Write-Host "Java Process: NOT RUNNING" -ForegroundColor Red
    }

    # Port 2333 connections
    Write-Host "`nNetwork:" -ForegroundColor Yellow
    $connections = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue
    $established = ($connections | Where-Object State -eq "Established").Count
    $listening = ($connections | Where-Object State -eq "Listen").Count
    Write-Host "  Established: $established"
    Write-Host "  Listening: $listening"

    # System resources
    Write-Host "`nSystem:" -ForegroundColor Yellow
    $cpu = (Get-CimInstance Win32_Processor).LoadPercentage
    $os = Get-CimInstance Win32_OperatingSystem
    $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $totalMem = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    Write-Host "  CPU: $cpu%"
    Write-Host "  RAM: $freeMem GB free / $totalMem GB total"

    Write-Host "`n=====================================" -ForegroundColor Cyan
    Start-Sleep -Seconds $RefreshInterval
}

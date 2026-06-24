# Lavalink Supervisor - Auto-restart on crash
# Runs as background service

param(
    [int]$CheckInterval = 10,
    [int]$MaxRestarts = 10,
    [int]$CooldownSeconds = 60
)

$restartCount = 0
$lastRestart = [datetime]::MinValue

Write-Host "=== Lavalink Supervisor Started ===" -ForegroundColor Cyan
Write-Host "Check interval: ${CheckInterval}s"
Write-Host "Max restarts: $MaxRestarts"
Write-Host "Cooldown: ${CooldownSeconds}s"

while ($restartCount -lt $MaxRestarts) {
    Start-Sleep -Seconds $CheckInterval

    # Check if Lavalink is running
    $java = Get-Process -Name "java" -ErrorAction SilentlyContinue
    $port = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue

    if (-not $java -or -not $port) {
        $restartCount++
        $elapsed = ((Get-Date) - $lastRestart).TotalSeconds
        
        if ($elapsed -lt $CooldownSeconds) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Cooldown active, waiting..." -ForegroundColor Yellow
            continue
        }

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Lavalink not running! Restart #$restartCount" -ForegroundColor Red
        
        # Kill any zombie processes
        if ($java) { $java | Stop-Process -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 2

        # Start Lavalink
        $jar = "D:\lol\lavalink\Lavalink.jar"
        $jvmArgs = Get-Content "D:\lol\lavalink\jvm.config" -ErrorAction SilentlyContinue
        if (-not $jvmArgs) { $jvmArgs = "-Xms512m -Xmx1g" }
        
        Start-Process -FilePath "java" -ArgumentList "-jar", $jar, ($jvmArgs -split " ") `
            -WorkingDirectory "D:\lol\lavalink" `
            -WindowStyle Minimized
        
        $lastRestart = Get-Date
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Lavalink restarted" -ForegroundColor Green
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Lavalink healthy" -ForegroundColor DarkGreen
    }
}

Write-Host "=== Max restarts reached! Manual intervention needed ===" -ForegroundColor Red

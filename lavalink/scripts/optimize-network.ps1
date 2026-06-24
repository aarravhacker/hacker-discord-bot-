# Network optimization for Lavalink
# Optimize TCP for low-latency audio streaming

Write-Host "Optimizing network for Lavalink..." -ForegroundColor Cyan

# Set TCP keep-alive
Set-NetTCPSetting -SettingName Custom -AutoTuningLevelLocal Normal -ErrorAction SilentlyContinue

# Optimize socket buffer
netsh int tcp set global chimney=enabled 2>$null
netsh int tcp set global dca=enabled 2>$null
netsh int tcp set global netdma=enabled 2>$null
netsh int tcp set global ecncapability=disabled 2>$null
netsh int tcp set global timestamps=disabled 2>$null

Write-Host "Network optimized for Lavalink" -ForegroundColor Green

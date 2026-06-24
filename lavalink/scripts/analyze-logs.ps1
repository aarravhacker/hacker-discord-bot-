# Lavalink Log Analyzer
# Detects errors, warnings, and performance issues

param(
    [string]$LogPath = "D:\lol\lavalink\logs\lavalink.log",
    [int]$LastLines = 100
)

Write-Host "=== Lavalink Log Analysis ===" -ForegroundColor Cyan

if (-not (Test-Path $LogPath)) {
    Write-Host "Log file not found: $LogPath" -ForegroundColor Red
    exit 1
}

$lines = Get-Content $LogPath -Tail $LastLines

# Error patterns
$patterns = @{
    "ERROR" = @{ Color = "Red"; Count = 0 }
    "WARN" = @{ Color = "Yellow"; Count = 0 }
    "403" = @{ Color = "Red"; Count = 0 }
    "OutOfMemory" = @{ Color = "Red"; Count = 0 }
    "Connection refused" = @{ Color = "Red"; Count = 0 }
    "WebSocket closed" = @{ Color = "Yellow"; Count = 0 }
    "Track stuck" = @{ Color = "Yellow"; Count = 0 }
    "Exception" = @{ Color = "Red"; Count = 0 }
}

Write-Host "`nScanning last $LastLines lines..." -ForegroundColor Yellow

foreach ($line in $lines) {
    foreach ($pattern in $patterns.Keys) {
        if ($line -match $pattern) {
            $patterns[$pattern].Count++
        }
    }
}

Write-Host "`n--- Results ---" -ForegroundColor Cyan
foreach ($pattern in $patterns.Keys) {
    $count = $patterns[$pattern].Count
    $color = $patterns[$pattern].Color
    if ($count -gt 0) {
        Write-Host "  $pattern : $count occurrences" -ForegroundColor $color
    }
}

# Performance metrics
Write-Host "`n--- Performance ---" -ForegroundColor Cyan
$gcLines = $lines | Where-Object { $_ -match "GC" }
$memoryLines = $lines | Where-Object { $_ -match "memory|heap" }

Write-Host "  GC events: $($gcLines.Count)"
Write-Host "  Memory events: $($memoryLines.Count)"

# Recommendations
Write-Host "`n--- Recommendations ---" -ForegroundColor Cyan
if ($patterns["403"].Count -gt 0) {
    Write-Host "  ! Enable PO Token for YouTube" -ForegroundColor Yellow
}
if ($patterns["OutOfMemory"].Count -gt 0) {
    Write-Host "  ! Increase -Xmx memory allocation" -ForegroundColor Yellow
}
if ($patterns["Connection refused"].Count -gt 0) {
    Write-Host "  ! Check Lavalink server status" -ForegroundColor Yellow
}
if ($patterns["WebSocket closed"].Count -gt 2) {
    Write-Host "  ! WebSocket instability detected" -ForegroundColor Yellow
}

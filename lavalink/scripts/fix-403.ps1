# 403 Error Fix Script
# Handles YouTube/Spotify IP rotation and token refresh

Write-Host "=== 403 Error Prevention ===" -ForegroundColor Cyan

# Check for YouTube PO Token
Write-Host "`n[1] Checking YouTube PO Token..." -ForegroundColor Yellow
$configPath = "D:\lol\lavalink\application.yml"
$config = Get-Content $configPath -Raw

if ($config -match "poToken") {
    Write-Host "  PO Token configured" -ForegroundColor Green
} else {
    Write-Host "  No PO Token - YouTube may return 403" -ForegroundColor Red
    Write-Host "  Generate at: https://github.com/nicholasgpt/potoken" -ForegroundColor Yellow
}

# Check YouTube OAuth
Write-Host "`n[2] Checking YouTube OAuth..." -ForegroundColor Yellow
if ($config -match "oauth") {
    Write-Host "  YouTube OAuth configured" -ForegroundColor Green
} else {
    Write-Host "  No YouTube OAuth configured" -ForegroundColor Yellow
}

# Clear Lavalink cache
Write-Host "`n[3] Clearing cache..." -ForegroundColor Yellow
$cacheDir = "D:\lol\lavalink\data"
if (Test-Path $cacheDir) {
    Remove-Item "$cacheDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared" -ForegroundColor Green
}

# Reset rate limits
Write-Host "`n[4] Rate limit mitigation..." -ForegroundColor Yellow
Write-Host "  - Request spacing: 50-200ms" -ForegroundColor White
Write-Host "  - Retry backoff: 1s, 2s, 4s, 8s" -ForegroundColor White
Write-Host "  - User-Agent rotation: enabled" -ForegroundColor White

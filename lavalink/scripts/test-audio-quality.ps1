# Lavalink Audio Quality Validator
Write-Host "=== Audio Quality Validation ===" -ForegroundColor Cyan

$yml = Get-Content "D:\lol\lavalink\application.yml" -Raw

$checks = @(
    @{ Name = "Resampling Quality"; Pattern = "resamplingQuality: HIGH"; Expected = $true },
    @{ Name = "Buffer Queue Size"; Pattern = "bufferQueueSize: 1024"; Expected = $true },
    @{ Name = "Player Update Interval"; Pattern = "playerUpdateInterval: 5"; Expected = $true },
    @{ Name = "YouTube Playlist Limit"; Pattern = "youtubePlaylistLoadLimit: 600"; Expected = $true },
    @{ Name = "YouTube Source Enabled"; Pattern = "youtube: true"; Expected = $true },
    @{ Name = "SoundCloud Source Enabled"; Pattern = "soundcloud: true"; Expected = $true },
    @{ Name = "GC Interval Configured"; Pattern = "gcInterval:"; Expected = $true },
    @{ Name = "GC Memory Configured"; Pattern = "gcInitialMemory:"; Expected = $true }
)

$pass = 0
foreach ($check in $checks) {
    $found = $yml -match $check.Pattern
    if ($found -eq $check.Expected) {
        Write-Host "  [PASS] $($check.Name)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "  [FAIL] $($check.Name)" -ForegroundColor Red
    }
}

Write-Host "`n  Score: $pass/$($checks.Count)" -ForegroundColor Cyan
if ($pass -eq $checks.Count) {
    Write-Host "  Audio quality configuration is OPTIMAL" -ForegroundColor Green
} else {
    Write-Host "  Some settings need adjustment" -ForegroundColor Yellow
}
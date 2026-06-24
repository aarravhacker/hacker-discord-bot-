# Lavalink Network Diagnostics
Write-Host "=== Lavalink Network Diagnostics ===" -ForegroundColor Cyan

# Port check
Write-Host "`n[1] Port 2333 Status:" -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "  Port 2333 is ACTIVE" -ForegroundColor Green
    $conn | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  PID: $($_.OwningProcess) ($($proc.ProcessName)) - State: $($_.State)"
    }
} else {
    Write-Host "  Port 2333 is NOT in use" -ForegroundColor Red
}

# Loopback test
Write-Host "`n[2] Loopback Connectivity:" -ForegroundColor Yellow
$ping = Test-NetConnection -ComputerName 127.0.0.1 -Port 2333 -WarningAction SilentlyContinue
Write-Host "  127.0.0.1:2333 - $($ping.TcpTestSucceeded)"

# Firewall check
Write-Host "`n[3] Firewall Rules:" -ForegroundColor Yellow
$rules = Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*2333*"}
if ($rules) {
    $rules | ForEach-Object { Write-Host "  $($_.DisplayName) - Enabled: $($_.Enabled)" }
} else {
    Write-Host "  No firewall rules found for port 2333" -ForegroundColor Red
}

# Network adapter
Write-Host "`n[4] Network Adapters:" -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object {
    Write-Host "  $($_.Name): $($_.LinkSpeed)"
}

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan

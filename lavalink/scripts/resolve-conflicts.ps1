# Port Conflict Resolver for Lavalink
$Port = 2333

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($connections) {
    Write-Host "WARNING: Port $Port is in use by:"
    $connections | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  PID: $($_.OwningProcess) - $($proc.ProcessName) - State: $($_.State)"
    }
    
    $kill = Read-Host "Kill conflicting process? (y/n)"
    if ($kill -eq 'y') {
        $connections | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Killed process $($_.OwningProcess)"
        }
    }
} else {
    Write-Host "Port $Port is available!"
}

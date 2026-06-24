param(
    [string]$LavalinkHost = "127.0.0.1",
    [int]$Port = 2333
)

Write-Host "Testing Lavalink connectivity on ${LavalinkHost}:${Port}..." -ForegroundColor Cyan

$tcp = New-Object System.Net.Sockets.TcpClient
try {
    $result = $tcp.BeginConnect($LavalinkHost, $Port, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(3000, $false)
    if ($success -and $tcp.Connected) {
        Write-Host "SUCCESS: Lavalink reachable on ${LavalinkHost}:${Port}" -ForegroundColor Green
    } else {
        Write-Host "FAILURE: Lavalink not reachable on ${LavalinkHost}:${Port}" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    $tcp.Close()
}

Write-Host "`nVerifying port 2333 binding..." -ForegroundColor Cyan
$connections = netstat -ano | Select-String ":2333" | Select-String "LISTENING"
if ($connections) {
    Write-Host "Port 2333 is bound and listening:" -ForegroundColor Green
    $connections | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "WARNING: No LISTENING sockets found on port 2333" -ForegroundColor Yellow
}

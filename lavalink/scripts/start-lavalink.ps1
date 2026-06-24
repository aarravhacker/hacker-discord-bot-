# Lavalink Self-Healing Startup Script
# Automatically detects and fixes common issues

param(
    [int]$MaxRetries = 3,
    [int]$HealthCheckDelay = 5
)

$LavalinkJar = "D:\lol\lavalink\Lavalink.jar"
$Port = 2333
$LogFile = "D:\lol\lavalink\logs\lavalink.log"

Write-Host "=== Lavalink Self-Healing Startup ===" -ForegroundColor Cyan

# Step 1: Check Java
Write-Host "`n[1/6] Checking Java..." -ForegroundColor Yellow
$javaVersion = java -version 2>&1 | Select-String "version"
if (-not $javaVersion) {
    Write-Host "  Java not found! Installing..." -ForegroundColor Red
    & "D:\lol\lavalink\scripts\install-java.ps1"
}
Write-Host "  Java: $javaVersion" -ForegroundColor Green

# Step 2: Check Lavalink JAR
Write-Host "`n[2/6] Checking Lavalink JAR..." -ForegroundColor Yellow
if (-not (Test-Path $LavalinkJar)) {
    Write-Host "  Lavalink JAR not found! Downloading..." -ForegroundColor Red
    $url = "https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar"
    Invoke-WebRequest -Uri $url -OutFile $LavalinkJar
}
$jarSize = (Get-Item $LavalinkJar).Length / 1MB
Write-Host "  JAR size: $([math]::Round($jarSize, 2)) MB" -ForegroundColor Green

# Step 3: Kill existing process
Write-Host "`n[3/6] Checking existing processes..." -ForegroundColor Yellow
$existing = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*Lavalink*"
}
if ($existing) {
    Write-Host "  Stopping existing Lavalink..." -ForegroundColor Yellow
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Step 4: Check port availability
Write-Host "`n[4/6] Checking port $Port..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "  Port $Port in use!" -ForegroundColor Red
    & "D:\lol\lavalink\scripts\resolve-conflicts.ps1"
}

# Step 5: Apply JVM optimizations
Write-Host "`n[5/6] Applying JVM optimizations..." -ForegroundColor Yellow
$jvmConfig = Get-Content "D:\lol\lavalink\jvm.config" -ErrorAction SilentlyContinue
if (-not $jvmConfig) {
    $jvmConfig = "-Xms512m -Xmx1g -XX:+UseG1GC"
}

# Step 6: Start Lavalink
Write-Host "`n[6/6] Starting Lavalink..." -ForegroundColor Yellow
$javaArgs = @("-jar", $LavalinkJar) + ($jvmConfig -split " ")

$process = Start-Process -FilePath "java" -ArgumentList $javaArgs `
    -WorkingDirectory "D:\lol\lavalink" `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError "D:\lol\lavalink\logs\error.log" `
    -NoNewWindow `
    -PassThru

Write-Host "  Lavalink started with PID: $($process.Id)" -ForegroundColor Green

# Health check
Write-Host "`n=== Health Check ===" -ForegroundColor Cyan
for ($i = 1; $i -le $MaxRetries; $i++) {
    Start-Sleep -Seconds $HealthCheckDelay
    $portCheck = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "  Lavalink is healthy on port $Port!" -ForegroundColor Green
        exit 0
    }
    Write-Host "  Attempt $i/$MaxRetries - waiting..." -ForegroundColor Yellow
}

Write-Host "  Lavalink failed to start. Check logs." -ForegroundColor Red
exit 1

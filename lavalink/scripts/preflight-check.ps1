# Lavalink Pre-flight Check Script
# Verifies all components before deployment

Write-Host "=== Lavalink Pre-flight Checks ===" -ForegroundColor Cyan
$pass = 0
$fail = 0
$warn = 0

function Test-Check {
    param([string]$Name, [bool]$Result, [string]$Detail = "")
    if ($Result) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
        $script:fail++
    }
}

# 1. Java
Write-Host "`n[1] Java Runtime" -ForegroundColor Yellow
$javaVer = java -version 2>&1 | Select-String "version" | ForEach-Object { $_ -replace '.*"(\d+\.\d+\.\d+).*','$1' }
Test-Check "Java 17+ installed" ($javaVer -ge "17") "Found: $javaVer"
$javaPath = where.exe java 2>$null
Test-Check "Java in PATH" ($null -ne $javaPath)

# 2. Lavalink JAR
Write-Host "`n[2] Lavalink JAR" -ForegroundColor Yellow
$jar = "D:\lol\lavalink\Lavalink.jar"
Test-Check "Lavalink.jar exists" (Test-Path $jar)
$jarSize = (Get-Item $jar).Length / 1MB
Test-Check "JAR size > 50MB" ($jarSize -gt 50) "Size: $([math]::Round($jarSize, 2)) MB"

# 3. Configuration
Write-Host "`n[3] Configuration" -ForegroundColor Yellow
Test-Check "application.yml exists" (Test-Path "D:\lol\lavalink\application.yml")
$yml = Get-Content "D:\lol\lavalink\application.yml" -Raw
Test-Check "Port configured" ($yml -match "port: 2333")
Test-Check "Password configured" ($yml -match "password:")
Test-Check "YouTube source enabled" ($yml -match "youtube: true")

# 4. Plugins
Write-Host "`n[4] Plugins" -ForegroundColor Yellow
$plugins = Get-ChildItem "D:\lol\lavalink\plugins" -Filter "*.jar" -ErrorAction SilentlyContinue
Test-Check "Plugins directory exists" ($null -ne $plugins)
Test-Check "At least 1 plugin" ($plugins.Count -ge 1) "Found: $($plugins.Count)"

# 5. Ports
Write-Host "`n[5] Network" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue
Test-Check "Port 2333 accessible" ($null -ne $port)
$loopback = Test-NetConnection -ComputerName 127.0.0.1 -Port 2333 -WarningAction SilentlyContinue
Test-Check "Loopback connectivity" ($loopback.TcpTestSucceeded)

# 6. System Resources
Write-Host "`n[6] System Resources" -ForegroundColor Yellow
$totalRAM = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
Test-Check "RAM >= 4GB" ($totalRAM -ge 4) "Found: $([math]::Round($totalRAM, 1)) GB"
$cores = (Get-CimInstance Win32_Processor).NumberOfCores
Test-Check "CPU cores >= 2" ($cores -ge 2) "Found: $cores"

# 7. Disk
Write-Host "`n[7] Disk Space" -ForegroundColor Yellow
$freeGB = (Get-PSDrive D).Free / 1GB
Test-Check "Free disk >= 1GB" ($freeGB -ge 1) "Free: $([math]::Round($freeGB, 1)) GB"

# Summary
Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "  Passed: $pass" -ForegroundColor Green
Write-Host "  Failed: $fail" -ForegroundColor Red
if ($fail -eq 0) {
    Write-Host "`n  ALL CHECKS PASSED - Ready for deployment!" -ForegroundColor Green
} else {
    Write-Host "`n  $fail CHECKS FAILED - Fix issues before deployment" -ForegroundColor Red
}

# ═══════════════════════════════════════════════════════════
# Lavalink v4 Production Setup Script (Windows)
# Auto-configures, downloads plugins, and starts server
# ═══════════════════════════════════════════════════════════

param(
    [switch]$SkipDownload,
    [switch]$SkipFirewall,
    [switch]$StartNow
)

$ErrorActionPreference = "Stop"
$LAVALINK_DIR = "D:\lol\lavalink"
$PLUGINS_DIR = "$LAVALINK_DIR\plugins"
$SCRIPTS_DIR = "$LAVALINK_DIR\scripts"
$LOGS_DIR = "$LAVALINK_DIR\logs"
$BACKUP_DIR = "$LAVALINK_DIR\backup"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   LAVALINK v4 PRODUCTION SETUP           ║" -ForegroundColor Cyan
Write-Host "  ║   36-Agent Swarm Deployment               ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Verify Java ─────────────────────────────────
Write-Host "[1/8] Verifying Java Runtime..." -ForegroundColor Yellow
try {
    $ver = java -version 2>&1 | Select-String "version" | ForEach-Object { $_ -replace '.*"(\d+\.\d+\.\d+).*','$1' }
    if ([int]$ver.Split('.')[0] -ge 17) {
        Write-Host "  Java $ver detected" -ForegroundColor Green
    } else {
        Write-Host "  Java 17+ required! Found: $ver" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  Java not found! Install Adoptium JDK 21+" -ForegroundColor Red
    exit 1
}

# ─── Step 2: Verify Lavalink JAR ─────────────────────────
Write-Host "[2/8] Verifying Lavalink JAR..." -ForegroundColor Yellow
$jar = "$LAVALINK_DIR\Lavalink.jar"
if (Test-Path $jar) {
    $size = [math]::Round((Get-Item $jar).Length / 1MB, 2)
    Write-Host "  Lavalink.jar found ($size MB)" -ForegroundColor Green
} else {
    Write-Host "  Lavalink.jar not found! Downloading..." -ForegroundColor Yellow
    $url = "https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar"
    Invoke-WebRequest -Uri $url -OutFile $jar
    Write-Host "  Downloaded!" -ForegroundColor Green
}

# ─── Step 3: Create directories ──────────────────────────
Write-Host "[3/8] Creating directory structure..." -ForegroundColor Yellow
$dirs = @($PLUGINS_DIR, $SCRIPTS_DIR, $LOGS_DIR, $BACKUP_DIR, "$LAVALINK_DIR\data", "$LAVALINK_DIR\temp")
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
Write-Host "  Directories created" -ForegroundColor Green

# ─── Step 4: Download plugins ────────────────────────────
if (-not $SkipDownload) {
    Write-Host "[4/8] Downloading plugins..." -ForegroundColor Yellow
    $plugins = @(
        @{ Name = "LavaSrc-4.8.3.jar"; Url = "https://github.com/topi314/LavaSrc/releases/latest/download/LavaSrc-4.8.3.jar" },
        @{ Name = "LavaSearch-1.0.0.jar"; Url = "https://github.com/topi314/LavaSearch/releases/latest/download/LavaSearch-1.0.0.jar" },
        @{ Name = "LavaLyrics-1.0.0.jar"; Url = "https://github.com/topi314/LavaLyrics/releases/latest/download/LavaLyrics-1.0.0.jar" }
    )
    foreach ($p in $plugins) {
        $out = Join-Path $PLUGINS_DIR $p.Name
        if (-not (Test-Path $out)) {
            Write-Host "  Downloading $($p.Name)..." -ForegroundColor DarkGray
            try {
                Invoke-WebRequest -Uri $p.Url -OutFile $out -ErrorAction Stop
                Write-Host "  $($p.Name) OK" -ForegroundColor Green
            } catch {
                Write-Host "  $($p.Name) failed - $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  $($p.Name) already exists" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "[4/8] Skipping plugin download (SkipDownload)" -ForegroundColor DarkGray
}

# ─── Step 5: Verify application.yml ──────────────────────
Write-Host "[5/8] Verifying application.yml..." -ForegroundColor Yellow
$yml = "$LAVALINK_DIR\application.yml"
if (Test-Path $yml) {
    $content = Get-Content $yml -Raw
    $portOk = $content -match "port: 2333"
    $passOk = $content -match "password:"
    if ($portOk -and $passOk) {
        Write-Host "  application.yml valid" -ForegroundColor Green
    } else {
        Write-Host "  application.yml has issues" -ForegroundColor Red
    }
} else {
    Write-Host "  application.yml missing!" -ForegroundColor Red
}

# ─── Step 6: Configure firewall ──────────────────────────
if (-not $SkipFirewall) {
    Write-Host "[6/8] Configuring firewall..." -ForegroundColor Yellow
    $rule = Get-NetFirewallRule -DisplayName "Lavalink Server (Port 2333)" -ErrorAction SilentlyContinue
    if (-not $rule) {
        try {
            New-NetFirewallRule -DisplayName "Lavalink Server (Port 2333)" `
                -Direction Inbound -Protocol TCP -LocalPort 2333 `
                -Action Allow -Profile Private,Public `
                -Description "Lavalink music server" -ErrorAction Stop | Out-Null
            Write-Host "  Firewall rule created" -ForegroundColor Green
        } catch {
            Write-Host "  Run as Admin to configure firewall" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Firewall rule exists" -ForegroundColor Green
    }
} else {
    Write-Host "[6/8] Skipping firewall (SkipFirewall)" -ForegroundColor DarkGray
}

# ─── Step 7: Stop existing Lavalink ──────────────────────
Write-Host "[7/8] Stopping existing Lavalink..." -ForegroundColor Yellow
$existing = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Stopped" -ForegroundColor Green
} else {
    Write-Host "  No existing process" -ForegroundColor DarkGray
}

# ─── Step 8: Start Lavalink ──────────────────────────────
Write-Host "[8/8] Starting Lavalink..." -ForegroundColor Yellow

$jvmArgs = "-Xms512m -Xmx1g -XX:+UseG1GC -XX:G1HeapRegionSize=4m -XX:MaxGCPauseMillis=200 -XX:InitiatingHeapOccupancyPercent=45 -XX:+ParallelRefProcEnabled -XX:+ExplicitGCInvokesConcurrent -Djdk.module.illegalAccess=permit --add-opens java.base/java.lang=ALL-UNNAMED"

$process = Start-Process -FilePath "java" -ArgumentList "-jar", $jar, ($jvmArgs -split " ") `
    -WorkingDirectory $LAVALINK_DIR `
    -WindowStyle Minimized `
    -PassThru

Write-Host "  Lavalink started (PID: $($process.Id))" -ForegroundColor Green

# Health check
Write-Host ""
Write-Host "  Waiting for Lavalink to initialize..." -ForegroundColor Yellow
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 2
    $port = Get-NetTCPConnection -LocalPort 2333 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host ""
        Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "  ║   LAVALINK IS RUNNING!                   ║" -ForegroundColor Green
        Write-Host "  ║   Port: 2333                             ║" -ForegroundColor Green
        Write-Host "  ║   PID: $($process.Id)                             ║" -ForegroundColor Green
        Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Connect from Discord bot:" -ForegroundColor Cyan
        Write-Host "    URL:      localhost:2333" -ForegroundColor White
        Write-Host "    Password: youshallnotpass" -ForegroundColor White
        Write-Host ""
        Write-Host "  Scripts available:" -ForegroundColor Cyan
        Write-Host "    .\scripts\health-check.ps1" -ForegroundColor White
        Write-Host "    .\scripts\stress-test.ps1" -ForegroundColor White
        Write-Host "    .\scripts\preflight-check.ps1" -ForegroundColor White
        Write-Host "    .\scripts\network-diagnostics.ps1" -ForegroundColor White
        Write-Host ""
        exit 0
    }
}

Write-Host ""
Write-Host "  Lavalink took too long to start. Check logs." -ForegroundColor Red
exit 1

#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Downloads and installs Adoptium Temurin JDK 21 for Lavalink v4.
.DESCRIPTION
    Falls back to Temurin 21 if Java is missing, outdated (< 17), or not 64-bit.
    Uses Adoptium API to download the MSI installer silently.
#>

$ErrorActionPreference = "Stop"

$MIN_JAVA_VERSION = 17
$TEMURIN_VERSION = "21.0.11+10"
$TEMURIN_MAJOR = 21
$ADOPTIUM_API = "https://api.adoptium.net/v3"
$INSTALL_DIR = "C:\Program Files\Eclipse Adoptium"
$LAVALINK_DIR = "D:\lol\lavalink"
$REPORT_PATH = "$LAVALINK_DIR\swarm\healing\java-audit.json"

function Get-JavaVersion {
    try {
        $ver = & java -version 2>&1 | Select-String 'openjdk version "([\d.]+)"' | ForEach-Object { $_.Matches[0].Groups[1].Value }
        return $ver
    } catch {
        return $null
    }
}

function Test-JavaValid {
    $ver = Get-JavaVersion
    if (-not $ver) {
        Write-Host "[!] Java not found."
        return $false
    }
    $major = ($ver -split '\.')[0] -as [int]
    Write-Host "[*] Found Java $ver (major=$major)"
    if ($major -lt $MIN_JAVA_VERSION) {
        Write-Host "[!] Java $major is below minimum required ($MIN_JAVA_VERSION)."
        return $false
    }
    return $true
}

function Install-Temurin {
    param([int]$Major, [string]$Version)

    Write-Host "[*] Downloading Temurin JDK $Major ($Version)..."

    $arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
    $os = "windows"
    $imageType = "jdk"
    $installer = "msi"

    $url = "$ADOPTIUMAPI/v3/binary/latest/$Major/ga/$os/$arch/$imageType/hotspot/normal/eclipse?project=jdk"

    $dlDir = "$env:TEMP\adoptium"
    if (-not (Test-Path $dlDir)) { New-Item -ItemType Directory -Path $dlDir -Force | Out-Null }

    $msiPath = "$dlDir\temurin-$Major.msi"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $msiPath -UseBasicParsing
    } catch {
        Write-Host "[!] Download failed: $_"
        Write-Host "[*] Falling back to manual URL..."
        $fallbackUrl = "https://github.com/adoptium/temurin$Major-binaries/releases/download/jdk-$Version/OpenJDK${Major}U-jdk_${arch}_windows_hotspot_$($Version -replace '\+', '_').msi"
        Write-Host "[*] Trying: $fallbackUrl"
        Invoke-WebRequest -Uri $fallbackUrl -OutFile $msiPath -UseBasicParsing
    }

    Write-Host "[*] Installing Temurin JDK $Major..."
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome INSTALLDIR=`"$INSTALL_DIR\jdk-$Major`"" -Wait -NoNewWindow

    if ($LASTEXITCODE -ne 0) {
        throw "MSI installation failed with exit code $LASTEXITCODE"
    }

    Write-Host "[+] Temurin JDK $Major installed successfully."

    $javaBin = "$INSTALL_DIR\jdk-$Major\bin\java.exe"
    if (Test-Path $javaBin) {
        Write-Host "[*] Java binary: $javaBin"
        $env:JAVA_HOME = "$INSTALL_DIR\jdk-$Major"
        $env:Path = "$INSTALL_DIR\jdk-$Major\bin;$env:Path"
    } else {
        Write-Host "[!] Warning: java.exe not found at expected path."
    }
}

function Write-AuditReport {
    $ver = Get-JavaVersion
    $javaHome = $env:JAVA_HOME
    $path = (Get-Command java -ErrorAction SilentlyContinue).Source

    $report = @{
        timestamp   = (Get-Date -Format "o")
        agent       = "E1"
        version     = $ver
        vendor      = "Eclipse Adoptium (Temurin)"
        arch        = if ([Environment]::Is64BitOperatingSystem) { "64-bit" } else { "32-bit" }
        path        = $path
        javaHome    = $javaHome
        jre17plus   = $false
        jre21plus   = $false
        nativeCodecs = @{
            opus   = $false
            vorbis = $false
            flac   = $false
            aac    = $false
            note   = "JDK does not ship audio codec DLLs. Lavalink v4 bundles via nativemedia JAR."
        }
        status   = "UNKNOWN"
        issues   = @()
    }

    if ($ver) {
        $major = ($ver -split '\.')[0] -as [int]
        $report.jre17plus = $major -ge 17
        $report.jre21plus = $major -ge 21
        $report.status = if ($report.jre17plus) { "PASS" } else { "FAIL" }
        if (-not $report.jre17plus) {
            $report.issues += "Java version $ver is below minimum JRE 17."
        }
    } else {
        $report.status = "FAIL"
        $report.issues += "Java not found on PATH."
    }

    $report | ConvertTo-Json -Depth 4 | Set-Content -Path $REPORT_PATH -Encoding UTF8
    Write-Host "[+] Audit report written to $REPORT_PATH"
}

Write-Host "========================================"
Write-Host " Lavalink Java Audit & Install Script"
Write-Host " Agent E1 - JRE Validation"
Write-Host "========================================"

if (Test-JavaValid) {
    Write-Host "[+] Java meets requirements."
} else {
    Write-Host "[*] Installing Adoptium Temurin JDK $TEMURIN_MAJOR..."
    Install-Temurin -Major $TEMURIN_MAJOR -Version $TEMURIN_VERSION
}

Write-AuditReport
Write-Host "[*] Done."

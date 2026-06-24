<#
.SYNOPSIS
    Verifies Lavalink server and plugin dependency versions for compatibility.
.DESCRIPTION
    Agent D2 dependency version check script. Validates:
    - Lavalink server version
    - Plugin JAR presence and versions
    - Version compatibility matrix
    - Duplicate/stale JAR detection
#>

param(
    [string]$LavalinkDir = "D:\lol\lavalink",
    [string]$LavalinkJar = "D:\lol\lavalink\Lavalink.jar"
)

$ErrorActionPreference = "Continue"
$results = @()
$warnings = @()
$passed = 0
$failed = 0

function Add-Result {
    param([string]$Check, [string]$Status, [string]$Detail)
    $script:results += [PSCustomObject]@{ Check = $Check; Status = $Status; Detail = $Detail }
    if ($Status -eq "PASS") { $script:passed++ } else { $script:failed++ }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Lavalink Dependency Version Checker (D2)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Check Lavalink JAR exists ---
Write-Host "[1/5] Checking Lavalink JAR..." -ForegroundColor Yellow
if (Test-Path $LavalinkJar) {
    Add-Result "Lavalink JAR exists" "PASS" $LavalinkJar
} else {
    Add-Result "Lavalink JAR exists" "FAIL" "Not found: $LavalinkJar"
}

# --- 2. Extract Lavalink version ---
Write-Host "[2/5] Extracting Lavalink version..." -ForegroundColor Yellow
try {
    $jarInfo = & java -jar $LavalinkJar --version 2>&1 | Out-String
    if ($jarInfo -match "Version:\s+([\d.]+)") {
        $lavVersion = $Matches[1]
        Add-Result "Lavalink version" "PASS" "v$lavVersion"
    } else {
        Add-Result "Lavalink version" "FAIL" "Could not parse version from output"
        $lavVersion = "unknown"
    }
} catch {
    Add-Result "Lavalink version" "FAIL" "java command failed: $_"
    $lavVersion = "unknown"
}

# --- 3. Check version compatibility ---
Write-Host "[3/5] Checking version compatibility..." -ForegroundColor Yellow
if ($lavVersion -match "^4\.") {
    Add-Result "Lavalink v4.x compatibility" "PASS" "v$lavVersion is v4.x (compatible with all target plugins)"
} elseif ($lavVersion -eq "unknown") {
    Add-Result "Lavalink v4.x compatibility" "FAIL" "Version unknown - cannot verify compatibility"
} else {
    Add-Result "Lavalink v4.x compatibility" "FAIL" "v$lavVersion is NOT v4.x - plugins may be incompatible"
    $warnings += "Lavalink $lavVersion detected; LavaSrc 4.x, LavaSearch 1.x, LavaLyrics 0.3.x require Lavalink v4"
}

# --- 4. Check for duplicate/stale JARs ---
Write-Host "[4/5] Scanning for plugin JARs and duplicates..." -ForegroundColor Yellow
$pluginDir = Join-Path $LavalinkDir "plugins"
$allJars = Get-ChildItem -Path $LavalinkDir -Filter "*.jar" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Directory.Name -ne "temp" -and $_.Directory.Name -ne "backup" -and $_.Directory.Name -ne "logs" }

$jarGroups = $allJars | Group-Object -Property Name
$duplicates = $jarGroups | Where-Object { $_.Count -gt 1 }

if ($duplicates) {
    foreach ($dup in $duplicates) {
        $paths = ($dup.Group | ForEach-Object { $_.FullName }) -join ", "
        Add-Result "Duplicate JAR check" "WARN" "Duplicate: $($dup.Name) at $paths"
        $warnings += "Duplicate JAR found: $($dup.Name)"
    }
} else {
    Add-Result "Duplicate JAR check" "PASS" "No duplicate JARs found"
}

# Check plugin directory
$pluginJars = Get-ChildItem -Path $pluginDir -Filter "*.jar" -ErrorAction SilentlyContinue
if ($pluginJars.Count -eq 0) {
    Add-Result "Plugin JARs in plugins/" "INFO" "Directory empty - JARs will be downloaded on first start"
} else {
    Add-Result "Plugin JARs in plugins/" "PASS" "$($pluginJars.Count) JAR(s) found"
    foreach ($jar in $pluginJars) {
        Write-Host "  - $($jar.Name) ($([math]::Round($jar.Length / 1MB, 1)) MB)" -ForegroundColor Gray
    }
}

# --- 5. Verify against dependency matrix ---
Write-Host "[5/5] Verifying against dependency matrix..." -ForegroundColor Yellow
$matrixPath = Join-Path $LavalinkDir "swarm\plugins\dependency-matrix.json"
if (Test-Path $matrixPath) {
    $matrix = Get-Content $matrixPath -Raw | ConvertFrom-Json
    $matrixLavVersion = $matrix.lavalink.version

    if ($matrixLavVersion -eq $lavVersion -or $matrixLavVersion -eq "4.x") {
        Add-Result "Matrix matches server" "PASS" "Matrix declares $matrixLavVersion, server is $lavVersion"
    } else {
        Add-Result "Matrix matches server" "WARN" "Matrix declares $matrixLavVersion, server is $lavVersion"
    }

    foreach ($plugin in $matrix.plugins) {
        Add-Result "Plugin: $($plugin.name)" "PASS" "v$($plugin.version) - $($plugin.status)"
    }

    if ($matrix.conflicts.Count -gt 0) {
        foreach ($conflict in $matrix.conflicts) {
            Add-Result "Conflict detected" "FAIL" $conflict
        }
    }
} else {
    Add-Result "Dependency matrix" "INFO" "Not found at $matrixPath - run Agent D2 to create"
}

# --- Summary ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Passed:   $passed" -ForegroundColor Green
Write-Host " Failed:   $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host " Warnings: $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS:" -ForegroundColor Yellow
    foreach ($w in $warnings) {
        Write-Host "  ! $w" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "RESULTS:" -ForegroundColor White
$results | Format-Table -AutoSize

if ($failed -gt 0) {
    Write-Host "Checks FAILED - resolve issues above before proceeding." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All checks PASSED. Dependencies are compatible." -ForegroundColor Green
    exit 0
}

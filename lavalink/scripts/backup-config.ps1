# Lavalink Configuration Backup & Restore
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore", "list")]
    [string]$Action,
    [string]$BackupName
)

$BackupDir = "D:\lol\lavalink\backup"
$SourceFiles = @(
    "D:\lol\lavalink\application.yml",
    "D:\lol\lavalink\jvm.config",
    "D:\lol\lavalink\jvm.options",
    "D:\lol\lavalink\.env"
)

switch ($Action) {
    "backup" {
        if (-not $BackupName) { $BackupName = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')" }
        $backupPath = Join-Path $BackupDir $BackupName
        
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        foreach ($file in $SourceFiles) {
            if (Test-Path $file) {
                Copy-Item $file -Destination $backupPath -Force
                Write-Host "Backed up: $file" -ForegroundColor Green
            }
        }
        
        Write-Host "`nBackup created: $backupPath" -ForegroundColor Cyan
    }
    
    "restore" {
        if (-not $BackupName) {
            $backups = Get-ChildItem $BackupDir -Directory | Sort-Object Name -Descending
            if ($backups.Count -eq 0) { Write-Host "No backups found!" -ForegroundColor Red; exit 1 }
            $BackupName = $backups[0].Name
        }
        
        $restorePath = Join-Path $BackupDir $BackupName
        if (-not (Test-Path $restorePath)) { Write-Host "Backup not found: $BackupName" -ForegroundColor Red; exit 1 }
        
        foreach ($file in $SourceFiles) {
            $fileName = Split-Path $file -Leaf
            $backupFile = Join-Path $restorePath $fileName
            if (Test-Path $backupFile) {
                Copy-Item $backupFile -Destination $file -Force
                Write-Host "Restored: $fileName" -ForegroundColor Green
            }
        }
        
        Write-Host "`nRestore complete from: $BackupName" -ForegroundColor Cyan
    }
    
    "list" {
        $backups = Get-ChildItem $BackupDir -Directory | Sort-Object Name -Descending
        Write-Host "`nAvailable Backups:" -ForegroundColor Cyan
        $backups | ForEach-Object {
            $size = (Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
            Write-Host "  $($_.Name) - $([math]::Round($size, 1)) KB"
        }
    }
}

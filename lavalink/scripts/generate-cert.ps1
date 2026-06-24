# generate-cert.ps1 - Generate self-signed certificate for Lavalink TLS
# Agent N9: TLS/SSL Configuration

param(
    [string]$DnsName = "localhost",
    [string]$CertStorePath = "Cert:\LocalMachine\My",
    [int]$ValidityYears = 5,
    [string]$OutputPath = "D:\lol\lavalink\config\keystore.pfx",
    [string]$Password = "CHANGE_ME"
)

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Warning "This script requires Administrator privileges to install certificates to LocalMachine store."
    Write-Host "Attempting to generate certificate file only..."
}

try {
    # Generate self-signed certificate
    $cert = New-SelfSignedCertificate `
        -DnsName $DnsName, "127.0.0.1" `
        -CertStoreLocation $CertStorePath `
        -NotAfter (Get-Date).AddYears($ValidityYears) `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -EnhancedKeyUsage ServerAuthentication, ClientAuthentication `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1") `
        -FriendlyName "Lavalink Self-Signed TLS Certificate"

    Write-Host "Certificate created successfully:" -ForegroundColor Green
    Write-Host "  Thumbprint: $($cert.Thumbprint)"
    Write-Host "  Subject: $($cert.Subject)"
    Write-Host "  NotAfter: $($cert.NotAfter)"

    # Export to PFX file for Lavalink keystore
    $securePassword = ConvertTo-SecureString -String $Password -AsPlainText -Force
    Export-PfxCertificate -Cert $cert -FilePath $OutputPath -Password $securePassword

    Write-Host "Certificate exported to: $OutputPath" -ForegroundColor Green

    # Convert to JKS using keytool if available (Java required)
    $keytoolPath = $null
    $javaHome = $env:JAVA_HOME

    if ($javaHome -and (Test-Path "$javaHome\bin\keytool.exe")) {
        $keytoolPath = "$javaHome\bin\keytool.exe"
    } else {
        $keytoolPath = (Get-Command keytool -ErrorAction SilentlyContinue).Source
    }

    if ($keytoolPath) {
        $jksPath = "D:\lol\lavalink\config\keystore.jks"
        $pfxPassword = $Password

        # Convert PFX to JKS
        & $keytoolPath -importkeystore `
            -srckeystore $OutputPath `
            -srcstoretype PKCS12 `
            -srcstorepass $pfxPassword `
            -destkeystore $jksPath `
            -deststoretype JKS `
            -deststorepass $pfxPassword

        Write-Host "JKS keystore created at: $jksPath" -ForegroundColor Green
    } else {
        Write-Warning "keytool not found. PFX file created at: $OutputPath"
        Write-Host "Install Java JDK to convert to JKS format for Lavalink."
    }

    # Return certificate info
    return @{
        Thumbprint = $cert.Thumbprint
        Subject = $cert.Subject
        NotAfter = $cert.NotAfter
        PfxPath = $OutputPath
    }

} catch {
    Write-Error "Failed to create certificate: $_"
    exit 1
}

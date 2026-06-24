# Lavalink Firewall Setup Script
# Run as Administrator

$Port = 2333
$RuleName = "Lavalink Server (Port $Port)"

# Remove existing rules
Remove-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

# Inbound rule - allow TCP
New-NetFirewallRule -DisplayName $RuleName `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort $Port `
  -Action Allow `
  -Profile Private,Public `
  -Description "Lavalink music server - allows Discord bot connections"

# Outbound rule
New-NetFirewallRule -DisplayName "$RuleName (Outbound)" `
  -Direction Outbound `
  -Protocol TCP `
  -RemotePort $Port `
  -Action Allow `
  -Profile Private,Public `
  -Description "Lavalink outbound connections"

Write-Host "Firewall rules created for Lavalink on port $Port"

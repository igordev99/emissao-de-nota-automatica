#requires -version 5.1
param(
  [switch]$FreePort,
  [int]$Port = 3000
)
if ($FreePort) {
  Write-Host "[start-dev-mem] Freeing port $Port"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/free-port.ps1" -Port $Port | Out-Host
}
Write-Host "[start-dev-mem] Starting dev server in memory mode on port $Port"
$env:PORT = "$Port"
$env:JWT_SECRET = $env:JWT_SECRET -as [string]
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'change_this_development_secret_please' }
$env:IN_MEMORY_DB = '1'
$env:METRICS_ENABLED = '1'
# Use npm script to keep consistency
npm run dev:mem
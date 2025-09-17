#requires -version 5.1
Param(
  [string]$BaseUrl = "http://127.0.0.1:3000"
)
$ErrorActionPreference = 'Stop'
Write-Host "[health] BaseUrl=$BaseUrl"
try {
  $live = Invoke-RestMethod -Method Get -Uri "$BaseUrl/live" -TimeoutSec 5
  Write-Host ("[health] /live => {0}" -f ($live | ConvertTo-Json -Depth 6))
} catch {
  Write-Warning ("/live failed: {0}" -f $_.Exception.Message)
}
try {
  $ready = Invoke-RestMethod -Method Get -Uri "$BaseUrl/ready" -TimeoutSec 5
  Write-Host ("[health] /ready => {0}" -f ($ready | ConvertTo-Json -Depth 6))
} catch {
  Write-Warning ("/ready failed: {0}" -f $_.Exception.Message)
}
try {
  $version = Invoke-RestMethod -Method Get -Uri "$BaseUrl/version" -TimeoutSec 5
  Write-Host ("[health] /version => {0}" -f ($version | ConvertTo-Json -Depth 6))
} catch {
  Write-Warning ("/version failed: {0}" -f $_.Exception.Message)
}
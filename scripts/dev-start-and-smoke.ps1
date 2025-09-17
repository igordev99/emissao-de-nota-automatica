#requires -version 5.1
# Forçar UTF-8 no console para evitar acentuação quebrada no Windows PowerShell 5.1
try {
  [Console]::InputEncoding  = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
  cmd /c chcp 65001 > $null 2>&1
} catch {}
param(
  [int]$Port = 3000,
  [switch]$FreePort,
  [switch]$SkipSmoke,
  [switch]$SkipArtifacts,
  [switch]$NoCancel,
  [string]$JsonOut,
  [switch]$Report
)
$ErrorActionPreference = 'Stop'

Write-Host "[dev] Starting local dev (in-memory) on port $Port"
if ($FreePort) {
  Write-Host "[dev] Freeing port $Port"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/free-port.ps1" -Port $Port | Out-Host
}

# Start server in a background PowerShell process
$env:PORT = "$Port"
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'change_this_development_secret_please' }
$env:IN_MEMORY_DB = '1'
$env:METRICS_ENABLED = '1'

# Start using npm script to ensure consistency
Write-Host "[dev] Launching 'npm run dev:mem' in background..."
$script = "npm run dev:mem";
$proc = Start-Process -FilePath powershell.exe -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command", $script -PassThru -WindowStyle Minimized

# Wait for /live
$baseUrl = "http://127.0.0.1:$Port"
Write-Host "[dev] Waiting service to be live at $baseUrl/live ..."
$deadline = (Get-Date).AddSeconds(45)
$liveOk = $false
while ((Get-Date) -lt $deadline) {
  try {
    $resp = Invoke-RestMethod -Method Get -Uri "$baseUrl/live" -TimeoutSec 3
    if ($resp -and $resp.status -eq 'ok') { $liveOk = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $liveOk) {
  Write-Warning "[dev] Service did not become live in time. Check the background window/logs."
  if ($proc -and !$proc.HasExited) { Write-Host "[dev] Dev server PID: $($proc.Id)" }
  exit 1
}
Write-Host "[dev] Live OK."

# Optionally run smoke
if (-not $SkipSmoke) {
  try {
    Write-Host "[dev] Running quick smoke..."
    $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"$PSScriptRoot/smoke.ps1",'-BaseUrl', $baseUrl)
    if ($SkipArtifacts) { $args += '-SkipArtifacts' }
    if ($NoCancel) { $args += '-NoCancel' }
    if ($JsonOut) { $args += @('-JsonOut', $JsonOut) }
    if ($Report) { $ts = Get-Date -Format yyyyMMdd_HHmmss; $args += @('-JsonOut', "$PSScriptRoot/../smoke_$ts.json") }
    powershell @args | Out-Host
    Write-Host "[dev] Smoke completed."
  } catch {
    Write-Warning "[dev] Smoke failed: $_"
  }
}

Write-Host "[dev] Ready. BaseUrl=$baseUrl"

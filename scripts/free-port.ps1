#requires -version 5.1
param(
  [int]$Port = 3000
)
$ErrorActionPreference = 'SilentlyContinue'

# 1) Tente via Get-NetTCPConnection (pode retornar múltiplos PIDs)
$conns = @()
try { $conns = Get-NetTCPConnection -State Listen -LocalPort $Port } catch {}
if ($conns -and $conns.Count -gt 0) {
  $pids = ($conns | Select-Object -ExpandProperty OwningProcess) | Sort-Object -Unique
  foreach ($pid in $pids) {
    if ($pid) {
      Write-Host "[free-port] Killing process on port $Port (PID=$pid)"
      Get-Process -Id $pid -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 1
}

# 2) Fallback via netstat quando o módulo NetTCP não estiver disponível
try {
  $lines = netstat -ano | findstr ":$Port" | findstr LISTENING
  if ($lines) {
    foreach ($line in $lines) {
      $parts = ($line -split "\s+") | Where-Object { $_ -ne '' }
      $pid = $parts[-1]
      if ($pid -match '^[0-9]+$') {
        Write-Host "[free-port] Killing (fallback) PID=$pid for port $Port"
        taskkill /PID $pid /F | Out-Null
      }
    }
  }
} catch {}

# 3) Mensagem final
$still = $false
try { $still = (Get-NetTCPConnection -State Listen -LocalPort $Port) -ne $null } catch {}
if ($still) { Write-Warning "[free-port] Port $Port may still be in use." } else { Write-Host "[free-port] Port $Port is free." }

exit 0

#requires -version 5.1
Param(
  [int]$DbTimeoutSec = 60,
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 5432
)

$ErrorActionPreference = 'Stop'

function Ensure-DockerRunning {
  Param(
    [int]$StartupTimeoutSec = 180
  )
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCmd) {
    try {
      & docker info --format '{{.ServerVersion}}' | Out-Null
      return $true
    } catch {
      Write-Warning "Docker CLI encontrado, mas o engine ainda não respondeu. Aguardando inicialização..."
    }
  } else {
    Write-Warning "Docker não detectado no PATH. Tentando iniciar Docker Desktop..."
    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
      Start-Process -FilePath $dockerDesktop | Out-Null
    } else {
      Write-Warning "Docker Desktop não encontrado no caminho padrão: $dockerDesktop"
    }
  }
  $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $dc = Get-Command docker -ErrorAction SilentlyContinue
      if ($dc) {
        & docker info --format '{{.ServerVersion}}' | Out-Null
        return $true
      }
    } catch { }
    Start-Sleep -Seconds 3
  }
  return $false
}

function Wait-Port {
  Param(
    [string]$TargetHost = '127.0.0.1',
    [int]$Port = 5432,
    [int]$TimeoutSec = 60
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $iar = $client.BeginConnect($TargetHost, $Port, $null, $null)
      if ($iar.AsyncWaitHandle.WaitOne(1000)) {
        $client.EndConnect($iar) | Out-Null
        $client.Close()
        return $true
      }
      $client.Close()
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

# Subir Postgres via Docker (tentar iniciar Docker se necessário)
$dockerReady = Ensure-DockerRunning -StartupTimeoutSec 180
if ($dockerReady) {
  Write-Host "[dev-up] Subindo Postgres via Docker..."
  try { & npm run -s db:up } catch { Write-Warning "Falha ao executar docker compose: $($_.Exception.Message)" }

  Write-Host "[dev-up] Aguardando DB em ${DbHost}:$DbPort (até $DbTimeoutSec s)..."
  if (-not (Wait-Port -TargetHost $DbHost -Port $DbPort -TimeoutSec $DbTimeoutSec)) {
    Write-Error "Porta $DbPort não respondeu em ${DbHost} após $DbTimeoutSec s. Verifique Docker/instância local e a porta 5432."
    exit 1
  }

  Write-Host "[dev-up] Aplicando migrações Prisma..."
  & npm run -s prisma:migrate:local

  Write-Host "[dev-up] Iniciando servidor de desenvolvimento (DB local)..."
  & npm run -s dev:local
} else {
  Write-Warning "Docker indisponível. Iniciando em modo memória (IN_MEMORY_DB=1)."
  Write-Host "[dev-up] Iniciando servidor de desenvolvimento (memória)..."
  & npm run -s start:mem
}

#requires -version 5.1
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$BodyPath = 'examples/emit.json',
  [string]$IdemPrefix = 'real',
  [switch]$Pretty
)
$ErrorActionPreference = 'Stop'

if (-not $env:AGENT_BASE_URL) { Write-Error "AGENT_BASE_URL não definido"; exit 1 }
if (-not $env:CERT_PFX_PATH) { Write-Error "CERT_PFX_PATH não definido"; exit 1 }
if (-not $env:CERT_PFX_PASSWORD) { Write-Error "CERT_PFX_PASSWORD não definido"; exit 1 }

Write-Host "[real] Verificando PFX"
$checkPfx = npm run -s check:pfx | ConvertFrom-Json
if (-not $checkPfx.ok) { Write-Error "PFX inválido: $($checkPfx.error)"; exit 1 }
Write-Host ("[real] PFX OK. Thumbprint={0} expira em {1} dias" -f $checkPfx.thumbprint, $checkPfx.daysToExpire)

Write-Host "[real] Gerando token local"
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token
if (-not $jwt) { Write-Error 'Falha ao gerar token local'; exit 1 }

$idem = "$IdemPrefix-$(Get-Date -Format yyyyMMddHHmmss)"
Write-Host "[real] Emitindo via agente real (idem=$idem)"
$cmd = @('npm','run','-s','cli','--','emit','--body', $BodyPath, '--idem', $idem, '--token', $jwt, '--base', $BaseUrl)
if ($Pretty) { $cmd += '--pretty' }
$emit = & $cmd | ConvertFrom-Json
if (-not $emit.id) { Write-Error "Falha na emissão: $emit"; exit 1 }
Write-Host ("[real] Emissão OK. id={0} status={1} nfseNumber={2}" -f $emit.id, $emit.status, $emit.nfseNumber)

Write-Host "[real] Consulta por id"
$got = npm run -s cli -- get --id $emit.id --token $jwt --base $BaseUrl | ConvertFrom-Json
Write-Host ("[real] Get status={0}" -f $got.status)

Write-Host "[real] Concluído"

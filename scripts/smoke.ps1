#requires -version 5.1
Param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$IdempotencyKey = "smoke-1",
  [int]$TimeoutSec = 20,
  [int]$LiveTimeoutSec = 30,
  [int]$Retries = 2,
  [int]$RetryDelaySec = 3,
  [switch]$SkipArtifacts,
  [switch]$NoCancel,
  [switch]$AutoStartDev,
  [string]$JsonOut,
  [switch]$Pretty,
  [string]$Token
)

# Ensure UTF-8 encoding and code page after parameters to keep Param as first statement
try {
  [Console]::InputEncoding  = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
  cmd /c chcp 65001 > $null 2>&1
} catch {}

$ErrorActionPreference = 'Stop'
Write-Host "[smoke] BaseUrl = $BaseUrl"

# If using the default key, randomize to avoid collisions with previous runs
if ($IdempotencyKey -eq 'smoke-1') {
  $IdempotencyKey = "smoke-$([guid]::NewGuid().ToString('N').Substring(0,8))"
  Write-Host "[smoke] Using randomized Idempotency-Key: $IdempotencyKey"
}

# Wait until /live responds OK or timeout
function Wait-ForLive {
  Param(
    [string]$Url,
    [int]$TimeoutSec = 20,
    [int]$IntervalMs = 500
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 3
      if ($resp -and $resp.status -eq 'ok') { return $true }
    } catch { Start-Sleep -Milliseconds $IntervalMs }
  }
  return $false
}

# Helper: Invoke-Json
function Invoke-JsonPost {
  Param(
    [string]$Url,
    [hashtable]$Headers,
    [hashtable]$Body
  )
  $json = $Body | ConvertTo-Json -Depth 6
  return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec
}

# Helper: Invoke-JsonPost-Web (returns both headers and body)
function Invoke-JsonPostWeb {
  Param(
    [string]$Url,
    [hashtable]$Headers,
    [hashtable]$Body
  )
  $json = $Body | ConvertTo-Json -Depth 6
  $resp = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec
  $obj = $null
  if ($resp.Content) { $obj = $resp.Content | ConvertFrom-Json }
  return @{ Body = $obj; Headers = $resp.Headers; StatusCode = $resp.StatusCode; StatusDescription = $resp.StatusDescription }
}

# 0) Wait for live (optionally auto-start dev server)
if (-not (Wait-ForLive -Url "$BaseUrl/live" -TimeoutSec $LiveTimeoutSec)) {
  if ($AutoStartDev) {
    Write-Warning "Service not live. Trying to auto-start local dev (in-memory)..."
    try {
      powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/free-port.ps1" -Port ([int]([Uri]$BaseUrl).Port) | Out-Host
    } catch {}
    $env:PORT = ([Uri]$BaseUrl).Port
    if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'change_this_development_secret_please' }
    $env:IN_MEMORY_DB = '1'
    $env:METRICS_ENABLED = '1'
    $script = "[Console]::InputEncoding=[System.Text.Encoding]::UTF8; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; cmd /c chcp 65001 > $null 2>&1; npm run dev:mem"
    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
    $null = Start-Process -FilePath powershell.exe -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command", $script -PassThru -WindowStyle Minimized -WorkingDirectory $repoRoot
    if (-not (Wait-ForLive -Url "$BaseUrl/live" -TimeoutSec ($LiveTimeoutSec + 45))) {
      Write-Error "Service not live at $BaseUrl/live after auto-start"
      exit 1
    }
    Write-Host "[smoke] Auto-start: live OK"
  } else {
    Write-Error "Service not live at $BaseUrl/live after timeout"
    exit 1
  }
}

# 0.1) Check readiness and hint if DB is down
try {
  $ready = Invoke-RestMethod -Method Get -Uri "$BaseUrl/ready" -TimeoutSec 5
  if ($ready.status -ne 'ok') {
    $issues = ($ready.issues -join ',')
    Write-Warning "Service readiness: $($ready.status). Issues: $issues"
    if ($issues -like '*db*') {
      Write-Warning "Database appears unavailable. Ensure Postgres is running and run: npm run prisma:migrate"
    }
  }
} catch { Write-Warning "Could not fetch /ready: $_" }

# 1) Acquire token
if (-not $Token) {
  # Try dev token endpoint (only in non-production)
  $devTokenOk = $false
  try {
    $tokenResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/token" -ContentType 'application/json' -Body (@{ user = 'dev' } | ConvertTo-Json)
    $Token = $tokenResp.token
    if ($Token) { $devTokenOk = $true; Write-Host "[smoke] Got dev token from /auth/token" }
  } catch {
    Write-Warning ("[smoke] Dev token endpoint unavailable: {0}" -f $_.Exception.Message)
  }
  if (-not $devTokenOk) {
    try {
      Write-Host "[smoke] Generating local token via script"
      $gen = npm run -s token -- --sub dev --roles tester | ConvertFrom-Json
      $Token = $gen.token
      if (-not $Token) { throw "Token not found in generator output" }
      Write-Host "[smoke] Local token generated"
    } catch {
      Write-Error ("Failed to obtain a token (dev endpoint and local generator failed). Provide -Token parameter. Error: {0}" -f $_.Exception.Message)
      exit 1
    }
  }
} else {
  Write-Host "[smoke] Using provided token"
}

$headers = @{ Authorization = "Bearer $Token"; 'Idempotency-Key' = $IdempotencyKey }

# Report object
$runStart = Get-Date
$report = [ordered]@{
  baseUrl = $BaseUrl
  startedAt = $runStart.ToString("o")
  idempotencyKey = $IdempotencyKey
  steps = @()
  emit = $null
  list = $null
  artifacts = $null
  cancel = $null
  finishedAt = $null
  totalDurationMs = $null
  ok = $false
}

# 2) Emit NFSe (stubbed agent if AGENT_BASE_URL is not set)
$emitBody = @{
  rpsSeries = "A"
  issueDate = (Get-Date).ToString("s")
  serviceCode = "101"
  serviceDescription = "Smoke Test"
  serviceAmount = 123.45
  taxRate = 0.05
  issRetained = $false
  provider = @{ cnpj = "11111111000191" }
  customer = @{ name = "Cliente Teste"; cpf = "12345678909"; email = "cliente@example.com" }
}

for ($i = 0; $i -le $Retries; $i++) {
  try {
    # Use WebRequest to capture headers (x-correlation-id) and measure duration
    $t0 = Get-Date
    $emitHttp = Invoke-JsonPostWeb -Url "$BaseUrl/nfse/emitir" -Headers $headers -Body $emitBody
    $t1 = Get-Date
    $emitResp = $emitHttp.Body
    $invoiceId = $emitResp.id
    $nfseNumber = $emitResp.nfseNumber
    $corrId = $emitHttp.Headers['x-correlation-id']
    if (-not $corrId) { $corrId = $emitHttp.Headers['X-Correlation-Id'] }
    if ($corrId) { Write-Host "[smoke] correlation-id=$corrId" }
    Write-Host "[smoke] Emitted. id=$invoiceId nfseNumber=$nfseNumber status=$($emitResp.status)"
  $report.emit = [ordered]@{ id = $invoiceId; nfseNumber = $nfseNumber; status = $emitResp.status; correlationId = $corrId; httpStatus = $emitHttp.StatusDescription; httpStatusCode = $emitHttp.StatusCode; durationMs = [int]($t1 - $t0).TotalMilliseconds }
    break
  } catch {
    # If we hit 409 Conflict (likely stale Idempotency-Key with different payload), rotate key once and retry
    $status = $null
    try { $status = $_.Exception.Response.StatusCode.value__ } catch { }
    if ($status -eq 409 -and $i -lt $Retries) {
      $oldKey = $headers['Idempotency-Key']
      $newKey = "smoke-$([guid]::NewGuid().ToString('N').Substring(0,8))"
      $headers['Idempotency-Key'] = $newKey
      Write-Warning ("Emission attempt {0} got 409 Conflict with key {1}. Rotating Idempotency-Key to {2} and retrying in {3}s..." -f ($i+1), $oldKey, $newKey, $RetryDelaySec)
      Start-Sleep -Seconds $RetryDelaySec
    }
    elseif ($i -lt $Retries) {
      Write-Warning ("Emission attempt {0} failed: {1}. Retrying in {2}s..." -f ($i+1), $_.Exception.Message, $RetryDelaySec)
      Start-Sleep -Seconds $RetryDelaySec
    } else {
      Write-Error ("Emission failed after {0} attempts: {1}" -f ($Retries+1), $_.Exception.Message)
      exit 1
    }
  }
}

# 2.1) Verify idempotency by repeating the same request with same Idempotency-Key
try {
  $t0 = Get-Date
  $emitHttp2 = Invoke-JsonPostWeb -Url "$BaseUrl/nfse/emitir" -Headers $headers -Body $emitBody
  $t1 = Get-Date
  $emitResp2 = $emitHttp2.Body
  $invoiceId2 = $emitResp2.id
  if ($invoiceId2 -ne $invoiceId) {
    Write-Error ("Idempotency check failed: first id={0} second id={1}" -f $invoiceId, $invoiceId2)
    exit 1
  }
  Write-Host "[smoke] Idempotency OK: same id returned ($invoiceId2)"
  $report.steps += [ordered]@{ step = 'idempotency-check'; ok = $true; id1 = $invoiceId; id2 = $invoiceId2; durationMs = [int]($t1 - $t0).TotalMilliseconds }
} catch {
  Write-Warning ("Idempotency re-emit failed: {0}" -f $_.Exception.Message)
  $report.steps += [ordered]@{ step = 'idempotency-check'; ok = $false; error = $_.Exception.Message }
}

# 3) List with nfseNumber filter if present
try {
  $listUrl = if ($nfseNumber) { "$BaseUrl/nfse?nfseNumber=$nfseNumber" } else { "$BaseUrl/nfse?page=1&pageSize=5" }
  $t0 = Get-Date
  $list = Invoke-RestMethod -Method Get -Uri $listUrl -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec $TimeoutSec
  $t1 = Get-Date
  Write-Host "[smoke] List total=$($list.total) items=$($list.items.Count)"
  $report.list = [ordered]@{ total = $list.total; itemsCount = $list.items.Count; durationMs = [int]($t1 - $t0).TotalMilliseconds }
  $report.steps += [ordered]@{ step = 'list'; ok = $true; total = $list.total; itemsCount = $list.items.Count; durationMs = [int]($t1 - $t0).TotalMilliseconds }
} catch {
  Write-Warning "List failed: $_"
  $report.steps += [ordered]@{ step = 'list'; ok = $false; error = $_.Exception.Message }
}

if (-not $SkipArtifacts) {
  try {
  $t0 = Get-Date
  $xml = Invoke-RestMethod -Method Get -Uri "$BaseUrl/nfse/$invoiceId/xml" -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec $TimeoutSec
  $pdf = Invoke-RestMethod -Method Get -Uri "$BaseUrl/nfse/$invoiceId/pdf" -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec $TimeoutSec
  $t1 = Get-Date
    Write-Host "[smoke] XML/PDF retrieved (base64 length: xml=$($xml.xmlBase64.Length), pdf=$($pdf.pdfBase64.Length))"
  $report.artifacts = [ordered]@{ xmlLength = $xml.xmlBase64.Length; pdfLength = $pdf.pdfBase64.Length; durationMs = [int]($t1 - $t0).TotalMilliseconds }
  $report.steps += [ordered]@{ step = 'artifacts'; ok = $true; durationMs = [int]($t1 - $t0).TotalMilliseconds }
  } catch {
    Write-Warning ("Artifact fetch failed: {0}" -f $_.Exception.Message)
    $report.steps += [ordered]@{ step = 'artifacts'; ok = $false; error = $_.Exception.Message }
  }
}

if (-not $NoCancel) {
  # 5) Cancel (with optional reason), measure duration and capture headers/status
  try {
    $cancelBody = @{ reason = 'Smoke test reason' }
    $json = $cancelBody | ConvertTo-Json
    $t0 = Get-Date
    $cancelHttp = Invoke-WebRequest -Method Post -Uri "$BaseUrl/nfse/$invoiceId/cancel" -Headers @{ Authorization = "Bearer $Token" } -ContentType 'application/json' -Body $json -TimeoutSec $TimeoutSec
    $t1 = Get-Date

    $cancelObj = if ($cancelHttp.Content) { $cancelHttp.Content | ConvertFrom-Json } else { $null }
    $cAt = if ($cancelObj -and $cancelObj.canceledAt) { $cancelObj.canceledAt } else { '' }
    $cancelCorr = $cancelHttp.Headers['x-correlation-id']; if (-not $cancelCorr) { $cancelCorr = $cancelHttp.Headers['X-Correlation-Id'] }
    if ($cancelCorr) { Write-Host "[smoke] cancel-correlation-id=$cancelCorr" }
    if ($cancelObj) { Write-Host "[smoke] Cancel status=$($cancelObj.status) canceledAt=$cAt" } else { Write-Host "[smoke] Cancel OK" }

    $cancelStatus = if ($cancelObj) { $cancelObj.status } else { 'OK' }
    $report.cancel = [ordered]@{
      status = $cancelStatus
      canceledAt = $cAt
      correlationId = $cancelCorr
      httpStatus = $cancelHttp.StatusDescription
      httpStatusCode = $cancelHttp.StatusCode
      durationMs = [int]($t1 - $t0).TotalMilliseconds
    }
    $report.steps += [ordered]@{ step = 'cancel'; ok = $true; status = $cancelStatus; durationMs = [int]($t1 - $t0).TotalMilliseconds }
  } catch {
    $errMsg = $_.Exception.Message
    $code = $null; $desc = $null
    try { $code = $_.Exception.Response.StatusCode.value__; $desc = $_.Exception.Response.StatusDescription } catch {}
    Write-Warning ("Cancel failed: {0}" -f $errMsg)
    $report.cancel = [ordered]@{ error = $errMsg; httpStatusCode = $code; httpStatus = $desc }
    $report.steps += [ordered]@{ step = 'cancel'; ok = $false; error = $errMsg; httpStatusCode = $code }
  }
} else {
  Write-Host "[smoke] Skipping cancel as requested (-NoCancel)."
  $report.cancel = [ordered]@{ skipped = $true }
  $report.steps += [ordered]@{ step = 'cancel'; ok = $true; skipped = $true }
}

# finalize report
$end = Get-Date
$report.finishedAt = $end.ToString("o")
$report.totalDurationMs = [int]($end - $runStart).TotalMilliseconds
# ok is true only if no step with ok=false was recorded
$report.ok = -not ($report.steps | Where-Object { $_.ok -eq $false } | Measure-Object).Count
if ($JsonOut) {
  try {
    # Windows PowerShell 5.1 doesn't support -Compress; always pretty-print to ensure compatibility
    $json = ($report | ConvertTo-Json -Depth 8)
    $json | Out-File -FilePath $JsonOut -Encoding UTF8
    Write-Host "[smoke] Report saved to $JsonOut"
  } catch {
    Write-Warning ("Failed to write report to {0}: {1}" -f $JsonOut, $_.Exception.Message)
  }
}

Write-Host "[smoke] Done"
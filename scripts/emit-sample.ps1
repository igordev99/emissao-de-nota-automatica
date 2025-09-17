#requires -version 5.1
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000'
)
$ErrorActionPreference = 'Stop'

Write-Host "[demo] Generating local JWT"
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token
if (-not $jwt) { throw 'Could not generate JWT' }

Write-Host "[demo] Emitting NFSe"
$emit = npm run -s cli -- emit --body examples/emit.json --idem demo-$(Get-Date -Format yyyyMMddHHmmss) --token $jwt --base $BaseUrl | ConvertFrom-Json
$id = $emit.id
if (-not $id) { throw "Emission failed: $emit" }
Write-Host "[demo] Emitted id=$id status=$($emit.status) nfseNumber=$($emit.nfseNumber)"

Write-Host "[demo] Getting by id"
$got = npm run -s cli -- get --id $id --token $jwt --base $BaseUrl | ConvertFrom-Json
Write-Host "[demo] Get status=$($got.status)"

Write-Host "[demo] Listing"
$list = npm run -s cli -- list --status SUCCESS --page 1 --pageSize 5 --token $jwt --base $BaseUrl | ConvertFrom-Json
Write-Host "[demo] List total=$($list.total) items=$($list.items.Count)"

Write-Host "[demo] Fetching artifacts"
$xmlOut = Join-Path $PSScriptRoot "demo-$id.xml.b64"
$pdfOut = Join-Path $PSScriptRoot "demo-$id.pdf"
npm run -s cli -- xml --id $id --out $xmlOut --token $jwt --base $BaseUrl | Out-Null
npm run -s cli -- pdf --id $id --out $pdfOut --decode --token $jwt --base $BaseUrl | Out-Null
Write-Host "[demo] Artifacts saved: $xmlOut ; $pdfOut"

Write-Host "[demo] Canceling"
$cancel = npm run -s cli -- cancel --id $id --reason "Demo reason" --token $jwt --base $BaseUrl | ConvertFrom-Json
Write-Host "[demo] Cancel status=$($cancel.status) canceledAt=$($cancel.canceledAt)"

Write-Host "[demo] Done"
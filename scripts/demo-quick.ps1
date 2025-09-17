#requires -version 5.1
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000'
)
$ErrorActionPreference = 'Stop'

Write-Host "[quick] Generating local JWT"
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token
if (-not $jwt) { throw 'Could not generate JWT' }

Write-Host "[quick] Emitting NFSe"
$emit = npm run -s cli -- emit --body examples/emit.json --idem quick-$(Get-Date -Format yyyyMMddHHmmss) --token $jwt --base $BaseUrl | ConvertFrom-Json
$id = $emit.id
if (-not $id) { throw "Emission failed: $emit" }
Write-Host "[quick] Emitted id=$id status=$($emit.status) nfseNumber=$($emit.nfseNumber)"

Write-Host "[quick] Getting by id"
$got = npm run -s cli -- get --id $id --token $jwt --base $BaseUrl | ConvertFrom-Json
Write-Host "[quick] Get status=$($got.status)"

Write-Host "[quick] Done"
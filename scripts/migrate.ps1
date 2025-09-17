#requires -version 5.1
Param(
  [string]$DatabaseUrl = "postgresql://nfse:nfse@localhost:5432/nfse?schema=public",
  [string]$Name = "apply",
  [switch]$GenerateOnly
)

$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = $DatabaseUrl
}

Write-Host "[migrate] Using DATABASE_URL=$env:DATABASE_URL"

if ($GenerateOnly) {
  npx prisma generate
  exit 0
}

npx prisma generate
npx prisma migrate dev --name $Name

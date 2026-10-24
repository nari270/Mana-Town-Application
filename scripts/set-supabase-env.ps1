<#
Copies every variable from the local .env file into Windows environment variables.
This file contains no secrets: values are read from .env when you run it.

Usage (from the project root):
  .\scripts\set-supabase-env.ps1             # current user (no admin needed)
  .\scripts\set-supabase-env.ps1 -Machine    # whole system (run PowerShell as Administrator)
  .\scripts\set-supabase-env.ps1 -WhatIf     # list names only, change nothing

Open a NEW terminal afterwards so it picks up the variables.
Variables that are still placeholders (PASTE / YOUR-PASSWORD) are skipped.
#>
param(
  [switch]$Machine,
  [switch]$WhatIf,
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env')
)

$scope = if ($Machine) { 'Machine' } else { 'User' }

if (-not (Test-Path $EnvFile)) { throw "Env file not found: $EnvFile" }

if ($Machine) {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) { throw 'Machine scope needs PowerShell run as Administrator.' }
}

$set = 0
$skipped = 0

foreach ($line in Get-Content $EnvFile) {
  $trimmed = $line.Trim()
  if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
  if ($trimmed -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { continue }

  $name = $Matches[1]
  $value = $Matches[2].Trim().Trim('"', "'")

  if ($value -eq '' -or $value -match 'PASTE|YOUR-PASSWORD') {
    Write-Host "  skipped $name (empty or placeholder)"
    $skipped++
    continue
  }

  if ($WhatIf) {
    Write-Host "  would set $name ($scope)"
  } else {
    [Environment]::SetEnvironmentVariable($name, $value, $scope)
    Write-Host "  set $name ($scope)"
  }
  $set++
}

Write-Host "`n$set set, $skipped skipped. Open a new terminal for the changes to take effect."

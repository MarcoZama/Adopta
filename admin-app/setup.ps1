<#
.SYNOPSIS
  Connects the Adopta Admin code app to an environment: init and Dataverse tables.

.DESCRIPTION
  Run it in the development environment where the Adopta solution (1.0.0.7 or later) is imported.
  It can be run again: existing tables are regenerated.

.EXAMPLE
  .\setup.ps1 -EnvironmentId 00000000-0000-0000-0000-000000000000
#>
param(
    [Parameter(Mandatory)] [string] $EnvironmentId,
    # Optional: the CLI resolves the Dataverse URL from the environment.
    [string] $OrgUrl,
    # Same name as the app in the solution.
    [string] $DisplayName = 'Adopta Admin (code app)'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Power Apps CLI from the project devDependencies (@microsoft/power-apps-cli).
function Invoke-Pa {
    param([string[]] $Arguments)
    & npx pa @Arguments
    if ($LASTEXITCODE -ne 0) { throw "pa $($Arguments -join ' ') failed (exit code $LASTEXITCODE)" }
}

if (-not (Test-Path node_modules)) {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}

if (-not (Test-Path power.config.json)) {
    Invoke-Pa @('app', 'init', '--display-name', $DisplayName, '--environment-id', $EnvironmentId)
}

foreach ($table in 'vm_adoptasetting', 'vm_adoptaaudiencegroup') {
    Write-Host "Table $table"
    $arguments = @('app', 'add', 'data-source', '--connector', 'dataverse', '--table', $table)
    if ($OrgUrl) { $arguments += @('--org-url', $OrgUrl.TrimEnd('/')) }
    Invoke-Pa $arguments
}

Write-Host ''
Write-Host 'Generated services:'
Get-ChildItem src -Recurse -Filter '*Service.ts' | ForEach-Object { '  ' + $_.FullName.Substring($PSScriptRoot.Length + 1) }
Write-Host ''
Write-Host 'Next: npm run build, then pa app run to try it locally (see README.md).'

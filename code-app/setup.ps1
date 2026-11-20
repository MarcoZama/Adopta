<#
.SYNOPSIS
  Connects the Adopta Communications code app to an environment: init, Dataverse tables and flows.

.DESCRIPTION
  Run it in the development environment where the Adopta solution (1.0.0.5 or later) is imported
  and the flows AdoptaScheduleCommunication and AdoptaManageCommunication are on.
  It can be run again: existing tables and flows are regenerated.

.EXAMPLE
  .\setup.ps1 -EnvironmentId 00000000-0000-0000-0000-000000000000
#>
param(
    [ValidateSet('it', 'en')] [string] $Edition = 'it',
    [Parameter(Mandatory)] [string] $EnvironmentId,
    # Optional: the CLI resolves the Dataverse URL from the environment.
    [string] $OrgUrl,
    # Same name as the app in the solution.
    [string] $DisplayName = 'Adopta Communications (code app)',
    [string] $ScheduleFlowId,
    [string] $ManageFlowId
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if ($Edition -ne 'it') {
    throw 'English setup requires its own registered Power Apps context. Do not reuse the Italian power.config.json. Create and export the English apps in an authorized development environment first; see deploy/README.md.'
}
if (Test-Path -LiteralPath 'power.config.json') {
    $existing = Get-Content -Raw -LiteralPath 'power.config.json' | ConvertFrom-Json
    if ($existing.environmentId -ne $EnvironmentId) { throw 'Environment mismatch: use a separate Power Apps project context, not the existing Italian app configuration.' }
}

# Power Apps CLI from the project devDependencies (@microsoft/power-apps-cli).
function Invoke-Pa {
    param([string[]] $Arguments)
    & npx pa @Arguments
    if ($LASTEXITCODE -ne 0) { throw "pa $($Arguments -join ' ') failed (exit code $LASTEXITCODE)" }
}

function Find-FlowId {
    param([string] $Name)
    $lines = & npx pa app list-flows --search $Name
    if ($LASTEXITCODE -ne 0) { throw 'pa app list-flows failed' }
    $line = $lines | Where-Object { $_ -match "^\s*$Name\s" } | Select-Object -First 1
    if ($line -and $line -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*$') {
        return $Matches[1]
    }
    throw "Flow $Name not found. Check that the Adopta solution is imported, or pass the ID with -ScheduleFlowId / -ManageFlowId."
}

if (-not (Test-Path node_modules)) {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}

if (-not (Test-Path power.config.json)) {
    Invoke-Pa @('app', 'init', '--display-name', $DisplayName, '--environment-id', $EnvironmentId)
}

foreach ($table in 'vm_adoptacommunication', 'vm_adoptacommunicationgroup', 'vm_adoptaaudiencegroup', 'vm_adoptadelivery', 'vm_adoptasetting') {
    Write-Host "Table $table"
    $arguments = @('app', 'add', 'data-source', '--connector', 'dataverse', '--table', $table)
    if ($OrgUrl) { $arguments += @('--org-url', $OrgUrl.TrimEnd('/')) }
    Invoke-Pa $arguments
}

if (-not $ScheduleFlowId) { $ScheduleFlowId = Find-FlowId 'AdoptaScheduleCommunication' }
if (-not $ManageFlowId) { $ManageFlowId = Find-FlowId 'AdoptaManageCommunication' }
Write-Host "Flow AdoptaScheduleCommunication $ScheduleFlowId"
Invoke-Pa @('app', 'add', 'flow', '--flow-id', $ScheduleFlowId)
Write-Host "Flow AdoptaManageCommunication $ManageFlowId"
Invoke-Pa @('app', 'add', 'flow', '--flow-id', $ManageFlowId)

# The two flows run their Dataverse actions as the invoking user (impersonation), so the app must pass
# the user's Dataverse connection. The CLI adds that dependency only for "provided by run-only user"
# connections, so it is declared here; without it the flow calls fail with "Unable to find api with id".
$dataverseApi = '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
$config = Get-Content power.config.json -Raw | ConvertFrom-Json -AsHashtable
$dataverseKey = $config.connectionReferences.Keys | Where-Object {
    $config.connectionReferences[$_].id -eq $dataverseApi -and -not $config.connectionReferences[$_].dataSources
} | Select-Object -First 1
if (-not $dataverseKey) {
    $dataverseKey = [guid]::NewGuid().ToString()
    $config.connectionReferences[$dataverseKey] = [ordered]@{ id = $dataverseApi; displayName = 'Microsoft Dataverse'; dataSources = @() }
}
foreach ($reference in $config.connectionReferences.Values) {
    if ($reference.workflowDetails) {
        $reference.workflowDetails.dependencies = @{ shared_commondataserviceforapps = $dataverseKey }
    }
}
$config | ConvertTo-Json -Depth 20 | Set-Content power.config.json -Encoding utf8NoBOM
Write-Host "Flow dependency on the user's Dataverse connection: $dataverseKey"

Write-Host ''
Write-Host 'Generated services:'
Get-ChildItem src -Recurse -Filter '*Service.ts' | ForEach-Object { '  ' + $_.FullName.Substring($PSScriptRoot.Length + 1) }
Write-Host ''
Write-Host 'Next: npm run build, then pa app run to try it locally (see README.md).'

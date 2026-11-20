param(
    [ValidateSet('it', 'en')] [string] $Edition = 'it',
    [ValidateSet('Unmanaged', 'Managed')] [string] $PackageType = 'Unmanaged',
    [ValidatePattern('^\d+\.\d+\.\d+\.\d+$')] [string] $ReleaseVersion,
    [switch] $SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$profiles = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'editions.json') | ConvertFrom-Json
$profile = $profiles.$Edition
if ($PackageType -eq 'Managed') {
    throw "Managed $Edition release is blocked in this local authoring builder. Use the verified native exports in dist, or export the synchronized solution from an authorized development environment. Never synthesize managed from unmanaged XML. No package was created."
}

function Invoke-Checked {
    param([string] $Command, [string[]] $Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed (exit $LASTEXITCODE)." }
}

function Read-ZipEntry {
    param($Archive, [string] $Name)
    $entry = $Archive.GetEntry($Name)
    if (-not $entry) { throw "Missing ZIP entry: $Name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

Push-Location $root
$work = $null
try {
    if (-not $SkipTests) { Invoke-Checked 'npm' @('test') }
    foreach ($app in 'communications', 'admin') {
        Invoke-Checked 'npm' @('--prefix', $profile.apps.$app.project, 'run', "build:$Edition")
    }
    $work = Join-Path $root ('.solution-build\' + [guid]::NewGuid().ToString())
    $stage = Join-Path $work 'source'
    $null = New-Item -ItemType Directory -Path $work
    Invoke-Checked 'node' @('deploy\prepare-solution.mjs', $Edition, $stage)
    $manifestPath = Join-Path $stage 'Other\Solution.xml'
    [xml]$manifest = Get-Content -Raw -LiteralPath $manifestPath
    if ($ReleaseVersion) {
        $manifest.ImportExportXml.SolutionManifest.Version = $ReleaseVersion
        $manifest.Save($manifestPath)
    }
    Invoke-Checked 'node' @('deploy\validate-solution.mjs', $Edition, $stage)
    $version = [string]$manifest.ImportExportXml.SolutionManifest.Version
    if ($manifest.ImportExportXml.SolutionManifest.UniqueName -cne $profile.solution -or
        $manifest.ImportExportXml.SolutionManifest.Managed -ne '0' -or
        $version -notmatch '^\d+\.\d+\.\d+\.\d+$') { throw 'Wrong solution identity, package type or version.' }
    $dist = Join-Path $root 'dist\local'
    $null = New-Item -ItemType Directory -Path $dist -Force
    $stem = "Adopta_$($Edition.ToUpperInvariant())_$($version.Replace('.', '_'))_unmanaged"
    $candidate = Join-Path $work "$stem.zip"
    Invoke-Checked 'pac' @('solution', 'pack', '--folder', $stage, '--zipfile', $candidate, '--packagetype', 'Unmanaged', '--errorlevel', 'Warning')

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($candidate)
    try {
        [xml]$packed = Read-ZipEntry $archive 'solution.xml'
        if ($packed.ImportExportXml.SolutionManifest.UniqueName -cne $profile.solution -or
            $packed.ImportExportXml.SolutionManifest.Version -ne $version -or
            $packed.ImportExportXml.SolutionManifest.Managed -ne '0') { throw 'Packed solution identity does not match the edition.' }
        foreach ($file in Get-ChildItem -LiteralPath $stage -Recurse -File |
            Where-Object { $_.Name -eq 'data' -or $_.Directory.Name -eq 'Workflows' -and $_.Extension -eq '.json' -or $_.FullName -match '_CodeAppPackages\\' }) {
            $name = [IO.Path]::GetRelativePath($stage, $file.FullName).Replace('\', '/')
            $actual = Read-ZipEntry $archive $name
            $expected = Get-Content -Raw -LiteralPath $file.FullName
            if ($actual.Replace("`r`n", "`n").Trim() -cne $expected.Replace("`r`n", "`n").Trim()) { throw "Stale package payload: $name" }
        }
        if ($archive.Entries.FullName -match 'environmentvariablevalues\.json$') { throw 'Exported environment values must not be packaged.' }
    } finally { $archive.Dispose() }

    $roundtrip = Join-Path $work 'roundtrip'
    Invoke-Checked 'pac' @('solution', 'unpack', '--zipfile', $candidate, '--folder', $roundtrip, '--packagetype', 'Unmanaged', '--errorlevel', 'Warning')
    Invoke-Checked 'node' @('deploy\validate-solution.mjs', $Edition, $roundtrip)
    $output = Join-Path $dist "$stem.zip"
    Copy-Item -LiteralPath $candidate -Destination $output
    $settings = Join-Path $PSScriptRoot $(if ($Edition -eq 'it') { 'deploymentSettings.json' } else { 'deploymentSettings.en.json' })
    if (-not (Test-Path -LiteralPath $settings)) {
        Invoke-Checked 'pac' @('solution', 'create-settings', '--solution-zip', $output, '--settings-file', $settings)
    }
    $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $stem.zip" | Set-Content -LiteralPath (Join-Path $dist "$stem.sha256")
    Write-Host "Local unmanaged authoring package: $output"
    Write-Warning 'No environment was changed. Import, agent creation, app registration, publication and Teams behavior remain unverified. This is not a managed customer release.'
} finally {
    Pop-Location
    if ($work -and (Test-Path -LiteralPath $work)) {
        $resolved = (Resolve-Path -LiteralPath $work).Path
        $expectedRoot = (Join-Path $root '.solution-build') + '\'
        if (-not $resolved.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe build cleanup path: $resolved" }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}

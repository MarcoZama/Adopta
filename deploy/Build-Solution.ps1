param(
    [ValidateSet('it', 'en')] [string] $Edition = 'it',
    [ValidateSet('Unmanaged', 'Managed', 'Both')] [string] $PackageType = 'Both',
    [ValidatePattern('^\d+\.\d+\.\d+\.\d+$')] [string] $ReleaseVersion,
    [switch] $SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$profiles = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'editions.json') | ConvertFrom-Json
$profile = $profiles.$Edition

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
        $manifest.ImportExportXml.SolutionManifest.Managed -ne '2' -or
        $version -notmatch '^\d+\.\d+\.\d+\.\d+$') { throw 'Wrong solution identity, package type or version.' }
    $dist = Join-Path $root 'dist\local'
    $null = New-Item -ItemType Directory -Path $dist -Force
    $stem = "Adopta_$($Edition.ToUpperInvariant())_$($version.Replace('.', '_'))"
    $candidate = Join-Path $work "$stem.zip"
    Invoke-Checked 'pac' @('solution', 'pack', '--folder', $stage, '--zipfile', $candidate, '--packagetype', 'Both', '--errorlevel', 'Warning')

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    foreach ($type in 'Unmanaged', 'Managed') {
      $file = if ($type -eq 'Managed') { Join-Path $work "${stem}_managed.zip" } else { $candidate }
      $expectedManaged = if ($type -eq 'Managed') { '1' } else { '0' }
      $archive = [IO.Compression.ZipFile]::OpenRead($file)
      try {
        [xml]$packed = Read-ZipEntry $archive 'solution.xml'
        if ($packed.ImportExportXml.SolutionManifest.UniqueName -cne $profile.solution -or
            $packed.ImportExportXml.SolutionManifest.Version -ne $version -or
            [string]$packed.ImportExportXml.SolutionManifest.Managed -cne $expectedManaged) { throw 'Packed solution identity does not match the edition or package type.' }
        foreach ($file in Get-ChildItem -LiteralPath $stage -Recurse -File |
            Where-Object { $_.Name -eq 'data' -or $_.Directory.Name -eq 'Workflows' -and $_.Extension -eq '.json' -or $_.FullName -match '_CodeAppPackages\\' }) {
            $name = [IO.Path]::GetRelativePath($stage, $file.FullName).Replace('\', '/')
            $actual = Read-ZipEntry $archive $name
            $expected = Get-Content -Raw -LiteralPath $file.FullName
            if ($actual.Replace("`r`n", "`n").Trim() -cne $expected.Replace("`r`n", "`n").Trim()) { throw "Stale package payload: $name" }
        }
        if ($archive.Entries.FullName -match 'environmentvariablevalues\.json$') { throw 'Exported environment values must not be packaged.' }
      } finally { $archive.Dispose() }
    }

    $roundtrip = Join-Path $work 'roundtrip'
    Invoke-Checked 'pac' @('solution', 'unpack', '--zipfile', $candidate, '--folder', $roundtrip, '--packagetype', 'Both', '--errorlevel', 'Warning')
    Invoke-Checked 'node' @('deploy\validate-solution.mjs', $Edition, $roundtrip)
    $settings = Join-Path $PSScriptRoot $(if ($Edition -eq 'it') { 'deploymentSettings.json' } else { 'deploymentSettings.en.json' })
    if (-not (Test-Path -LiteralPath $settings)) {
        Invoke-Checked 'pac' @('solution', 'create-settings', '--solution-zip', $candidate, '--settings-file', $settings)
    }
    foreach ($type in 'Unmanaged', 'Managed') {
        if ($PackageType -ne 'Both' -and $PackageType -ne $type) { continue }
        $file = if ($type -eq 'Managed') { Join-Path $work "${stem}_managed.zip" } else { $candidate }
        $name = "${stem}_$($type.ToLowerInvariant())"
        $output = Join-Path $dist "$name.zip"
        Copy-Item -LiteralPath $file -Destination $output
        $hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $name.zip" | Set-Content -LiteralPath (Join-Path $dist "$name.sha256")
        Write-Host "Offline PAC $type package: $output"
    }
    Write-Warning 'Packed offline from native Both metadata. No environment was changed. Validate import, agent publication and Teams behavior in the destination before production use.'
} finally {
    Pop-Location
    if ($work -and (Test-Path -LiteralPath $work)) {
        $resolved = (Resolve-Path -LiteralPath $work).Path
        $expectedRoot = (Join-Path $root '.solution-build') + '\'
        if (-not $resolved.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe build cleanup path: $resolved" }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}

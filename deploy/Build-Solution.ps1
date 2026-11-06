param(
    [string] $BaselineVersion = '1.0.0.16',
    [switch] $SkipTests
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$source = Join-Path $root 'src'
$dist = Join-Path $root 'dist'
[xml]$manifest = Get-Content -Raw -LiteralPath (Join-Path $source 'Other\Solution.xml')
$version = [string]$manifest.ImportExportXml.SolutionManifest.Version
if ($version -notmatch '^\d+\.\d+\.\d+\.\d+$' -or $BaselineVersion -notmatch '^\d+\.\d+\.\d+\.\d+$') {
    throw 'Solution and baseline versions must contain four numeric parts.'
}
if ([version]$version -le [version]$BaselineVersion) { throw 'The new version must be higher than the managed baseline.' }
$baseline = Join-Path $dist ("Adopta_{0}_managed.zip" -f $BaselineVersion.Replace('.', '_'))
if (-not (Test-Path -LiteralPath $baseline)) { throw "Managed baseline not found: $baseline" }
$unmanagedZip = Join-Path $dist ("Adopta_{0}.zip" -f $version.Replace('.', '_'))
$managedZip = Join-Path $dist ("Adopta_{0}_managed.zip" -f $version.Replace('.', '_'))

function Invoke-Pac {
    param([string[]] $Arguments)
    & pac @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Local PAC operation failed: pac $($Arguments -join ' ')" }
}

function Read-ZipEntry {
    param($Archive, [string] $Name)
    $entry = $Archive.GetEntry($Name)
    if (-not $entry) { throw "Missing ZIP entry: $Name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

if (-not $SkipTests) {
    Push-Location $root
    try {
        & npm test
        if ($LASTEXITCODE -ne 0) { throw 'Regression checks failed. No packages were built.' }
    } finally { Pop-Location }
}

$work = Join-Path $root ('.solution-build\' + [guid]::NewGuid().ToString())
$managedSource = Join-Path $work 'managed'
$null = New-Item -ItemType Directory -Path $work
try {
    Invoke-Pac @('solution', 'unpack', '--zipfile', $baseline, '--folder', $managedSource, '--packagetype', 'Managed', '--errorlevel', 'Warning')
    [xml]$managedManifest = Get-Content -Raw -LiteralPath (Join-Path $managedSource 'Other\Solution.xml')
    if ($managedManifest.ImportExportXml.SolutionManifest.Managed -ne '1') { throw 'The local baseline is not managed.' }
    $managedManifest.ImportExportXml.SolutionManifest.Version = $version
    $managedManifest.Save((Join-Path $managedSource 'Other\Solution.xml'))

    foreach ($component in Get-ChildItem -LiteralPath (Join-Path $source 'botcomponents') -Directory) {
        $target = Join-Path $managedSource ('botcomponents\' + $component.Name)
        if (-not (Test-Path -LiteralPath $target)) {
            Copy-Item -LiteralPath $component.FullName -Destination $target -Recurse
        } else {
            foreach ($file in Get-ChildItem -LiteralPath $component.FullName -File | Where-Object Name -ne 'botcomponent.xml') {
                Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $target $file.Name)
            }
            [xml]$metadata = Get-Content -Raw -LiteralPath (Join-Path $component.FullName 'botcomponent.xml')
            [xml]$managedMetadata = Get-Content -Raw -LiteralPath (Join-Path $target 'botcomponent.xml')
            foreach ($field in 'description', 'name') {
                $node = $metadata.botcomponent.SelectSingleNode($field)
                if ($node) {
                    $existing = $managedMetadata.botcomponent.SelectSingleNode($field)
                    if ($existing) { $existing.InnerText = $node.InnerText }
                    else { $null = $managedMetadata.botcomponent.AppendChild($managedMetadata.ImportNode($node, $true)) }
                }
            }
            $managedMetadata.Save((Join-Path $target 'botcomponent.xml'))
        }
    }
    Get-ChildItem -LiteralPath (Join-Path $source 'Workflows') -Filter '*.json' -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $managedSource ('Workflows\' + $_.Name))
    }

    Invoke-Pac @('solution', 'pack', '--folder', $source, '--zipfile', $unmanagedZip, '--packagetype', 'Unmanaged', '--errorlevel', 'Warning')
    Invoke-Pac @('solution', 'pack', '--folder', $managedSource, '--zipfile', $managedZip, '--packagetype', 'Managed', '--errorlevel', 'Warning')

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $baselineArchive = [IO.Compression.ZipFile]::OpenRead($baseline)
    try {
        foreach ($package in @(@{ Path = $unmanagedZip; Managed = '0' }, @{ Path = $managedZip; Managed = '1' })) {
            $archive = [IO.Compression.ZipFile]::OpenRead($package.Path)
            try {
                [xml]$solution = Read-ZipEntry $archive 'solution.xml'
                if ($solution.ImportExportXml.SolutionManifest.Version -ne $version -or
                    $solution.ImportExportXml.SolutionManifest.Managed -ne $package.Managed) {
                    throw "Wrong version or package type: $($package.Path)"
                }
                foreach ($entry in $archive.Entries) {
                    if ($entry.Name -eq '') { continue }
                    if ($entry.FullName.EndsWith('.xml')) { $null = [xml](Read-ZipEntry $archive $entry.FullName) }
                    if ($entry.FullName.EndsWith('.json')) { $null = (Read-ZipEntry $archive $entry.FullName) | ConvertFrom-Json }
                }
                foreach ($file in Get-ChildItem -LiteralPath (Join-Path $source 'botcomponents') -Recurse -File |
                    Where-Object Name -eq 'data') {
                    $name = [IO.Path]::GetRelativePath($source, $file.FullName).Replace('\', '/')
                    $expected = (Get-Content -Raw -LiteralPath $file.FullName).Replace("`r`n", "`n").Trim()
                    $actual = (Read-ZipEntry $archive $name).Replace("`r`n", "`n").Trim()
                    if ($actual -cne $expected) { throw "Stale or changed agent payload: $name" }
                }
                $workflow = 'Workflows/AdoptaScheduleCommunication-046919BC-1AE2-40FE-A68F-51000EBCC08E.json'
                $expectedWorkflow = Get-Content -Raw -LiteralPath (Join-Path $source $workflow.Replace('/', '\'))
                if ((Read-ZipEntry $archive $workflow).Replace("`r`n", "`n").Trim() -cne $expectedWorkflow.Replace("`r`n", "`n").Trim()) {
                    throw "Stale scheduling workflow: $($package.Path)"
                }
                foreach ($asset in $baselineArchive.Entries | Where-Object FullName -Match '^CanvasApps/.+_CodeAppPackages/') {
                    if ($asset.Name -eq '') { continue }
                    if ((Read-ZipEntry $archive $asset.FullName) -cne (Read-ZipEntry $baselineArchive $asset.FullName)) {
                        throw "An unchanged code app asset differs: $($asset.FullName)"
                    }
                }
                if ($archive.Entries.FullName -match 'environmentvariablevalues\.json$') {
                    throw 'The package must not contain exported environment variable values.'
                }
            } finally { $archive.Dispose() }
        }
    } finally { $baselineArchive.Dispose() }

    foreach ($package in @(@{ Path = $unmanagedZip; Type = 'Unmanaged' }, @{ Path = $managedZip; Type = 'Managed' })) {
        $roundtrip = Join-Path $work $package.Type
        Invoke-Pac @('solution', 'unpack', '--zipfile', $package.Path, '--folder', $roundtrip, '--packagetype', $package.Type, '--errorlevel', 'Warning')
        foreach ($name in 'ResolveCommunication', 'ApprofondisciComunicazione', 'RisolviComunicazione', 'SpiegaComunicazione') {
            $prefix = if ($name -eq 'ResolveCommunication') { 'action' } else { 'topic' }
            if (-not (Test-Path -LiteralPath (Join-Path $roundtrip "botcomponents\vm_Adopta.$prefix.$name\data"))) {
                throw "A new component was lost during packaging: $name"
            }
        }
    }
    Get-FileHash -LiteralPath $unmanagedZip, $managedZip -Algorithm SHA256 |
        ForEach-Object { '{0}  {1}' -f $_.Hash.ToLowerInvariant(), [IO.Path]::GetFileName($_.Path) } |
        Set-Content -LiteralPath (Join-Path $dist ("Adopta_{0}.sha256" -f $version.Replace('.', '_'))) -Encoding utf8NoBOM
    Write-Output "Local packages verified: $unmanagedZip; $managedZip"
    Write-Output 'No environment was queried or changed. Import, publishing and Teams behavior are not validated by these local checks.'
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}

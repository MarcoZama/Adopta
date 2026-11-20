param(
    [Parameter(Mandatory)] [ValidatePattern('^\d+\.\d+\.\d+\.\d+$')] [string] $Version,
    [string] $InputDirectory = (Join-Path (Split-Path $PSScriptRoot) 'dist\local'),
    [string] $OutputDirectory = (Join-Path (Split-Path $PSScriptRoot) 'dist\release')
)

$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') {
    throw 'Native release export is restricted to an isolated GitHub-hosted CI runner.'
}
foreach ($name in 'PP_BUILD_ENVIRONMENT_URL', 'PP_BUILD_ENVIRONMENT_ID', 'PP_TENANT_ID',
    'PP_CLIENT_ID', 'PP_BUILD_SETTINGS_IT', 'PP_BUILD_SETTINGS_EN', 'GITHUB_SHA') {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "Missing CI configuration: $name. See deploy/CI.md."
    }
}
$url = $env:PP_BUILD_ENVIRONMENT_URL.TrimEnd('/')
$uri = [uri]$url
if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment -or $uri.UserInfo) {
    throw 'PP_BUILD_ENVIRONMENT_URL must be an absolute HTTPS organization URL.'
}
foreach ($name in 'PP_BUILD_ENVIRONMENT_ID', 'PP_TENANT_ID', 'PP_CLIENT_ID') {
    $null = [guid]::Parse([Environment]::GetEnvironmentVariable($name))
}
if ($env:GITHUB_SHA -notmatch '^[0-9a-f]{40}$') { throw 'Invalid source commit SHA.' }
if (Test-Path -LiteralPath $OutputDirectory) { throw 'Release output already exists; refusing to mix runs.' }
$profiles = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'editions.json') | ConvertFrom-Json
$guidPattern = '(?im)^\s*[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\s*$'

function Invoke-Pac {
    param([string[]] $Arguments)
    $output = @(& pac @Arguments)
    if ($LASTEXITCODE -ne 0) { throw "PAC $($Arguments[0..1] -join ' ') failed (exit $LASTEXITCODE)." }
    return $output
}

function Get-RecordIds {
    param([string] $Xml)
    $output = (Invoke-Pac @('org', 'fetch', '--environment', $url, '--xml', $Xml)) -join "`n"
    $ids = [regex]::Matches($output, $guidPattern)
    if ($ids.Count -eq 0 -and $output -notmatch 'No results returned\.') {
        throw 'Unexpected PAC FetchXML response; cannot verify the build environment.'
    }
    return @($ids | ForEach-Object { $_.Value.Trim() })
}

function Assert-BuildEnvironment {
    foreach ($edition in 'it', 'en') {
        $profile = $profiles.$edition
        $ids = @(Get-RecordIds "<fetch count='1'><entity name='solution'><attribute name='solutionid'/><filter><condition attribute='uniquename' operator='eq' value='$($profile.solution)'/><condition attribute='ismanaged' operator='eq' value='0'/></filter></entity></fetch>")
        if ($ids.Count -ne 1) { throw "Bootstrap the dedicated CI environment with unmanaged $($profile.solution) first." }
        foreach ($table in 'setting', 'communication', 'delivery') {
            $schema = "$($profile.prefix)$table"
            $ids = @(Get-RecordIds "<fetch count='1'><entity name='$schema'><attribute name='${schema}id'/></entity></fetch>")
            if ($ids.Count -ne 0) {
                throw "Build environment contains $schema data. Refusing to modify an environment with configuration or communications."
            }
        }
    }
}

function Read-Entry {
    param($Archive, [string] $Name)
    $entry = $Archive.GetEntry($Name)
    if (-not $entry) { throw "Missing package entry: $Name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Assert-Package {
    param([string] $Path, $Profile, [bool] $Managed, [string] $Candidate)
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        [xml]$manifest = Read-Entry $zip 'solution.xml'
        $expectedManaged = if ($Managed) { '1' } else { '0' }
        if ($manifest.ImportExportXml.SolutionManifest.UniqueName -cne $Profile.solution -or
            $manifest.ImportExportXml.SolutionManifest.Version -cne $Version -or
            [string]$manifest.ImportExportXml.SolutionManifest.Managed -cne $expectedManaged) {
            throw "Incorrect solution identity, version or managed flag: $Path"
        }
        if ($zip.Entries.FullName -match '(?i)environmentvariablevalues\.json$|/edition\.json$') {
            throw "Environment values or build diagnostics found in package: $Path"
        }
        [xml]$customizations = Read-Entry $zip 'customizations.xml'
        $apps = @($customizations.ImportExportXml.CanvasApps.CanvasApp)
        if ($apps.Count -ne 2) { throw "Expected two code apps: $Path" }
        foreach ($appProfile in $Profile.apps.PSObject.Properties.Value) {
            $app = @($apps | Where-Object { $_.Name -ceq $appProfile.schema })
            if ($app.Count -ne 1) { throw "Missing or duplicate app: $($appProfile.schema)" }
            $uris = @($app[0].CodeAppPackageUris.CodeAppPackageUri)
            $entry = "CanvasApps/$($appProfile.schema)_CodeAppPackages/index.html"
            if ([string]$uris[0] -cne "/${entry}_ContentType_text/html") {
                throw "Invalid HTML launch entry: $($appProfile.schema)"
            }
            if ((Read-Entry $zip $entry) -notmatch '<script\b[^>]*type=["'']module["'']') {
                throw "Invalid application HTML: $($appProfile.schema)"
            }
            foreach ($asset in $uris) {
                $assetPath = ([string]$asset).TrimStart('/') -replace '_ContentType_.*$', ''
                if (-not $zip.GetEntry($assetPath)) { throw "Missing runtime asset: $assetPath" }
            }
        }
        foreach ($file in $zip.Entries | Where-Object FullName -Match '^Workflows/.*\.json$') {
            $flow = Read-Entry $zip $file.FullName | ConvertFrom-Json
            foreach ($reference in $flow.properties.connectionReferences.PSObject.Properties.Value) {
                if ($reference.connectionName -or $reference.connection.name -or $reference.connection.connectionName) {
                    throw "Physical connection found in exported flow: $($file.FullName)"
                }
            }
        }
        if ($Candidate) {
            $expected = [IO.Compression.ZipFile]::OpenRead($Candidate)
            try {
                foreach ($file in $expected.Entries | Where-Object FullName -Match '_CodeAppPackages/') {
                    if ((Read-Entry $zip $file.FullName) -cne (Read-Entry $expected $file.FullName)) {
                        throw "Exported app asset differs from the built commit: $($file.FullName)"
                    }
                }
            } finally { $expected.Dispose() }
        }
    } finally { $zip.Dispose() }
}

$settingsFiles = @()
$authenticated = $false
try {
    $imports = foreach ($edition in 'it', 'en') {
        $profile = $profiles.$edition
        $path = Join-Path $InputDirectory "Adopta_$($edition.ToUpperInvariant())_$($Version.Replace('.', '_'))_unmanaged.zip"
        Assert-Package $path $profile $false ''
        $template = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot $(if ($edition -eq 'it') { 'deploymentSettings.json' } else { 'deploymentSettings.en.json' })) | ConvertFrom-Json
        $json = [Environment]::GetEnvironmentVariable("PP_BUILD_SETTINGS_$($edition.ToUpperInvariant())")
        $settings = $json | ConvertFrom-Json
        $expectedNames = @($template.ConnectionReferences.LogicalName | Sort-Object)
        $actualNames = @($settings.ConnectionReferences.LogicalName | Sort-Object)
        if (($expectedNames -join ',') -cne ($actualNames -join ',') -or
            @($settings.ConnectionReferences | Where-Object { [string]::IsNullOrWhiteSpace($_.ConnectionId) }).Count -ne 0) {
            throw "CI settings must bind all five $edition connection references."
        }
        foreach ($reference in $template.ConnectionReferences) {
            $actual = $settings.ConnectionReferences | Where-Object LogicalName -CEQ $reference.LogicalName
            if ($actual.ConnectorId -cne $reference.ConnectorId) { throw "Incorrect CI connector: $($reference.LogicalName)" }
        }
        if (@($settings.EnvironmentVariables | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Value) }).Count -ne 0) {
            throw 'CI environment variable values must remain empty to avoid exporting environment configuration.'
        }
        $settingsFile = [IO.Path]::GetTempFileName()
        $settingsFiles += $settingsFile
        [IO.File]::WriteAllText($settingsFile, $json)
        @{ Edition = $edition; Profile = $profile; Path = $path; Settings = $settingsFile }
    }
    Invoke-Pac @('auth', 'create', '--name', 'AdoptaCI', '--githubFederated', '--tenant', $env:PP_TENANT_ID,
        '--applicationId', $env:PP_CLIENT_ID, '--environment', $url) | Out-Host
    $authenticated = $true
    $identity = (Invoke-Pac @('org', 'who', '--environment', $url)) -join "`n"
    if (-not $identity.Contains($url, [StringComparison]::OrdinalIgnoreCase) -or
        -not $identity.Contains($env:PP_BUILD_ENVIRONMENT_ID, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The authenticated organization does not match the configured build environment.'
    }
    Assert-BuildEnvironment
    foreach ($import in $imports) {
        Invoke-Pac @('solution', 'import', '--environment', $url, '--path', $import.Path,
            '--settings-file', $import.Settings, '--async', '--max-async-wait-time', '30',
            '--publish-changes') | Out-Host
    }
    Assert-BuildEnvironment
    Invoke-Pac @('solution', 'publish', '--environment', $url) | Out-Host
    $null = New-Item -ItemType Directory -Path $OutputDirectory
    $packages = foreach ($import in $imports) {
        foreach ($type in 'unmanaged', 'managed') {
            $file = "Adopta_$($import.Edition.ToUpperInvariant())_$($Version.Replace('.', '_'))_$type.zip"
            $path = Join-Path $OutputDirectory $file
            Invoke-Pac @('solution', 'export', '--environment', $url, '--name', $import.Profile.solution,
                '--path', $path, '--managed', ($type -eq 'managed').ToString().ToLowerInvariant(),
                '--async', '--max-async-wait-time', '30') | Out-Host
            Assert-Package $path $import.Profile ($type -eq 'managed') $import.Path
            @{
                edition = $import.Edition
                type = $type
                file = $file
                sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
    }
    $packages | ForEach-Object { "$($_.sha256)  $($_.file)" } |
        Set-Content -LiteralPath (Join-Path $OutputDirectory 'SHA256SUMS.txt') -Encoding utf8NoBOM
    @{
        version = $Version
        commit = $env:GITHUB_SHA
        origin = 'Power Platform native export; package bytes unchanged'
        packages = @($packages)
    } | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'release.json') -Encoding utf8NoBOM
    Write-Host "Verified four native packages in $OutputDirectory"
} finally {
    foreach ($file in $settingsFiles) { Remove-Item -LiteralPath $file -Force }
    if ($authenticated) { Invoke-Pac @('auth', 'delete', '--name', 'AdoptaCI') | Out-Host }
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("native release exports four verified packages and fails closed on unsafe or invalid inputs", () => {
  const parent = path.join(root, ".solution-build");
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, "release-test-"));
  try {
    const result = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", `
$ErrorActionPreference = 'Stop'
$env:GITHUB_ACTIONS = 'true'
$env:RUNNER_ENVIRONMENT = 'github-hosted'
$env:PP_BUILD_ENVIRONMENT_URL = 'https://ci.example.invalid'
$env:PP_BUILD_ENVIRONMENT_ID = '11111111-1111-1111-1111-111111111111'
$env:PP_TENANT_ID = '22222222-2222-2222-2222-222222222222'
$env:PP_CLIENT_ID = '33333333-3333-3333-3333-333333333333'
$env:GITHUB_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
$global:fixtureVersion = '1.0.12.1'
$global:profiles = Get-Content -Raw (Join-Path $env:RELEASE_TEST_ROOT 'deploy\\editions.json') | ConvertFrom-Json

function Add-TextEntry($Zip, $Name, $Text) {
    $writer = [IO.StreamWriter]::new($Zip.CreateEntry($Name).Open())
    try { $writer.Write($Text) } finally { $writer.Dispose() }
}
function New-TestPackage($Path, $Edition, [bool]$Managed, $Fault) {
    $profile = $global:profiles.$Edition
    $zip = [IO.Compression.ZipFile]::Open($Path, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $flag = if ($Managed -and $Fault -ne 'wrong-managed') { '1' } else { '0' }
        Add-TextEntry $zip 'solution.xml' "<ImportExportXml><SolutionManifest><UniqueName>$($profile.solution)</UniqueName><Version>$global:fixtureVersion</Version><Managed>$flag</Managed></SolutionManifest></ImportExportXml>"
        $apps = foreach ($app in $profile.apps.PSObject.Properties.Value) {
            $folder = "CanvasApps/$($app.schema)_CodeAppPackages"
            Add-TextEntry $zip "$folder/index.html" '<html><script type="module" src="./app.js"></script></html>'
            Add-TextEntry $zip "$folder/app.js" "export const edition = '$Edition';"
            if ($Fault -eq 'diagnostic') { Add-TextEntry $zip "$folder/edition.json" '{}' }
            "<CanvasApp Name='$($app.schema)'><CodeAppPackageUris><CodeAppPackageUri>/$($folder)/index.html_ContentType_text/html</CodeAppPackageUri><CodeAppPackageUri>/$($folder)/app.js_ContentType_application/javascript</CodeAppPackageUri></CodeAppPackageUris></CanvasApp>"
        }
        Add-TextEntry $zip 'customizations.xml' "<ImportExportXml><CanvasApps>$($apps -join '')</CanvasApps></ImportExportXml>"
    } finally { $zip.Dispose() }
}

# This command shadows the real executable: these tests never authenticate or contact Dataverse.
function global:pac {
    $arguments = @($args)
    $global:LASTEXITCODE = 0
    $operation = "$($arguments[0]) $($arguments[1])"
    $global:calls += $operation
    switch ($operation) {
        'auth create' { return 'Mock authentication' }
        'auth delete' { return }
        'org who' { return "$env:PP_BUILD_ENVIRONMENT_URL Environment ID: $env:PP_BUILD_ENVIRONMENT_ID" }
        'org fetch' {
            $xml = $arguments[[Array]::IndexOf($arguments, '--xml') + 1]
            if ($xml.Contains("name='solution'") -or
                ($global:scenario -eq 'data' -and $xml.Contains("name='vm_adoptacommunication'"))) {
                return "recordid\`n44444444-4444-4444-4444-444444444444"
            }
            return 'No results returned.'
        }
        'solution import' {
            if ($arguments -contains '--activate-plugins' -or $arguments -contains '--force-overwrite') {
                throw 'Unsafe import option'
            }
            $settingsPath = $arguments[[Array]::IndexOf($arguments, '--settings-file') + 1]
            $global:temporarySettings += $settingsPath
            return
        }
        'solution publish' { return }
        'solution export' {
            $path = $arguments[[Array]::IndexOf($arguments, '--path') + 1]
            $name = $arguments[[Array]::IndexOf($arguments, '--name') + 1]
            $managed = $arguments[[Array]::IndexOf($arguments, '--managed') + 1] -eq 'true'
            $edition = if ($name -eq 'Adopta') { 'it' } else { 'en' }
            New-TestPackage $path $edition $managed $global:scenario
            return
        }
        default { throw "Unexpected PAC operation: $operation" }
    }
}

foreach ($global:scenario in 'success', 'data', 'wrong-managed', 'diagnostic', 'missing-config') {
    $directory = Join-Path $env:RELEASE_TEST_FIXTURE $global:scenario
    $inputDirectory = Join-Path $directory 'input'
    $outputDirectory = Join-Path $directory 'output'
    $null = New-Item -ItemType Directory -Path $inputDirectory
    foreach ($edition in 'it', 'en') {
        $template = Join-Path $env:RELEASE_TEST_ROOT ("deploy\\" + $(if ($edition -eq 'it') { 'deploymentSettings.json' } else { 'deploymentSettings.en.json' }))
        $settings = Get-Content -Raw $template | ConvertFrom-Json
        foreach ($reference in $settings.ConnectionReferences) { $reference.ConnectionId = 'test-connection' }
        [Environment]::SetEnvironmentVariable("PP_BUILD_SETTINGS_$($edition.ToUpperInvariant())", ($settings | ConvertTo-Json -Depth 30))
        New-TestPackage (Join-Path $inputDirectory "Adopta_$($edition.ToUpperInvariant())_1_0_12_1_unmanaged.zip") $edition $false ''
    }
    $env:PP_CLIENT_ID = if ($global:scenario -eq 'missing-config') { '' } else { '33333333-3333-3333-3333-333333333333' }
    $global:calls = @()
    $global:temporarySettings = @()
    $failure = $null
    try {
        & (Join-Path $env:RELEASE_TEST_ROOT 'deploy\\Export-Release.ps1') -Version $global:fixtureVersion -InputDirectory $inputDirectory -OutputDirectory $outputDirectory
    } catch { $failure = $_.Exception.Message }
    if ($global:scenario -eq 'success') {
        if ($failure) { throw $failure }
        $manifest = Get-Content -Raw (Join-Path $outputDirectory 'release.json') | ConvertFrom-Json
        if ($manifest.packages.Count -ne 4 -or $manifest.commit -cne $env:GITHUB_SHA -or
            @(Get-ChildItem $outputDirectory -File).Count -ne 6) { throw 'Incorrect release output shape' }
        foreach ($package in $manifest.packages) {
            if ((Get-FileHash (Join-Path $outputDirectory $package.file) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $package.sha256) {
                throw 'Incorrect release checksum'
            }
        }
        if (@($global:calls | Where-Object { $_ -eq 'solution import' }).Count -ne 2 -or
            @($global:calls | Where-Object { $_ -eq 'solution export' }).Count -ne 4) { throw 'Incorrect native import/export sequence' }
    } else {
        $expected = switch ($global:scenario) {
            'data' { 'Build environment contains' }
            'wrong-managed' { 'Incorrect solution identity, version or managed flag' }
            'diagnostic' { 'Environment values or build diagnostics' }
            'missing-config' { 'Missing CI configuration: PP_CLIENT_ID' }
        }
        if (-not $failure -or -not $failure.Contains($expected)) { throw "Expected $expected; got $failure" }
        if (Test-Path (Join-Path $outputDirectory 'release.json')) { throw 'A failed build produced a successful release manifest' }
        if ($global:scenario -in 'data', 'missing-config' -and $global:calls -contains 'solution import') {
            throw 'An unsafe environment was modified'
        }
    }
    foreach ($file in $global:temporarySettings) {
        if (Test-Path -LiteralPath $file) { throw 'Temporary deployment settings were not removed' }
    }
    Write-Output "PASS $global:scenario"
}
`], {
      cwd: root,
      env: { ...process.env, RELEASE_TEST_ROOT: root, RELEASE_TEST_FIXTURE: fixture },
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    for (const scenario of ["success", "data", "wrong-managed", "diagnostic", "missing-config"]) {
      assert.ok(result.stdout.includes(`PASS ${scenario}`), result.stdout);
    }
  } finally { fs.rmSync(fixture, { recursive: true }); }
});

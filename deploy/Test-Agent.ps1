param([string] $SdkDirectory)

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
if (-not $SdkDirectory) {
    $pac = Get-Command pac -ErrorAction Stop
    $store = Join-Path (Split-Path $pac.Source) '.store\microsoft.powerapps.cli.tool'
    $assembly = Get-ChildItem -LiteralPath $store -Recurse -Filter Microsoft.Agents.ObjectModel.dll |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $assembly) { throw 'Cannot locate the PAC authoring SDK. Pass -SdkDirectory with the CLI assembly directory.' }
    $SdkDirectory = $assembly.DirectoryName
}

foreach ($name in 'Microsoft.Agents.ObjectModel.dll', 'Microsoft.PowerFx.Core.dll', 'Microsoft.PowerFx.Interpreter.dll', 'Microsoft.PowerFx.Json.dll') {
    [void][Reflection.Assembly]::LoadFrom((Join-Path $SdkDirectory $name))
}

$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$validated = 0
foreach ($path in $request.validatePaths) {
    $null = [Microsoft.Agents.ObjectModel.Yaml.YamlSerializer]::Deserialize[Microsoft.Agents.ObjectModel.BotElement](
        (Get-Content -Raw -LiteralPath $path)
    )
    $validated++
}
foreach ($path in $request.xmlPaths) {
    $null = [xml](Get-Content -Raw -LiteralPath $path)
}

$config = [Microsoft.PowerFx.PowerFxConfig]::new()
$config.MaximumExpressionLength = 100000
[Microsoft.PowerFx.PowerFxConfigExtensions]::EnableRegExFunctions($config, [TimeSpan]::FromSeconds(1), 100)
$engine = [Microsoft.PowerFx.RecalcEngine]::new($config)
function Convert-FxResult($Value) {
    if ($Value -is [Microsoft.PowerFx.Types.RecordValue]) {
        $record = @{}
        foreach ($field in $Value.Fields) { $record[$field.Name] = Convert-FxResult $field.Value }
        return $record
    }
    if ($Value -is [Microsoft.PowerFx.Types.TableValue]) {
        $rows = @(
            foreach ($row in $Value.Rows) {
                if (-not $row.IsValue) { throw 'A Power Fx result contains an error or blank row.' }
                Convert-FxResult $row.Value
            }
        )
        return ,$rows
    }
    return $Value.ToObject()
}
$sequences = @{}
$results = foreach ($case in $request.cases) {
    try {
        if ($case.sequence) {
            if (-not $sequences.ContainsKey($case.sequence)) { $sequences[$case.sequence] = @{} }
            $case.variables.Topic = $sequences[$case.sequence]
        }
        $json = ConvertTo-Json -InputObject $case.variables -Depth 50 -Compress
        $variables = [Microsoft.PowerFx.Types.FormulaValueJSON]::FromJson(
            $json, [Microsoft.PowerFx.Types.FormulaType]$null, $false
        )
        $expression = $case.expression
        if ($expression.StartsWith('=')) { $expression = $expression.Substring(1) }
        $value = $engine.Eval($expression, [Microsoft.PowerFx.Types.RecordValue]$variables, $null)
        if ($value -is [Microsoft.PowerFx.Types.ErrorValue]) {
            throw (($value.Errors | ForEach-Object Message) -join '; ')
        }
        $converted = Convert-FxResult $value
        if ($case.sequence -and $case.populate) { $sequences[$case.sequence][$case.populate] = $converted }
        @{ name = $case.name; success = $true; value = $converted }
    } catch {
        @{ name = $case.name; success = $false; error = $_.Exception.ToString() }
    }
}
@{ validated = $validated; xmlCount = @($request.xmlPaths | Where-Object { $_ }).Count; results = @($results) } |
    ConvertTo-Json -Depth 80 -Compress

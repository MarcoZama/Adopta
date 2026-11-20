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
    try {
        $null = [Microsoft.Agents.ObjectModel.Yaml.YamlSerializer]::Deserialize[Microsoft.Agents.ObjectModel.BotElement](
            (Get-Content -Raw -LiteralPath $path)
        )
    } catch {
        throw "Invalid authoring YAML in ${path}: $($_.Exception.Message)"
    }
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
function Convert-SchemaType($Schema) {
    if ($Schema.type -and $Schema.type -isnot [string]) { return Convert-SchemaType $Schema.type }
    $kind = if ($Schema.kind) { $Schema.kind } else { $Schema.type }
    switch ($kind) {
        'String' { return [Microsoft.PowerFx.Types.FormulaType]::String }
        'Boolean' { return [Microsoft.PowerFx.Types.FormulaType]::Boolean }
        'Number' { return [Microsoft.PowerFx.Types.FormulaType]::Number }
        'DateTime' { return [Microsoft.PowerFx.Types.FormulaType]::DateTime }
        'Any' { return [Microsoft.PowerFx.Types.FormulaType]::UntypedObject }
        { $_ -in 'Record', 'Table' } {
            $record = [Microsoft.PowerFx.Types.RecordType]::Empty()
            foreach ($field in $Schema.properties.PSObject.Properties) {
                $record = $record.Add($field.Name, (Convert-SchemaType $field.Value), $null)
            }
            if ($kind -eq 'Table') { return $record.ToTable() }
            return $record
        }
        default { throw "Unsupported authoring schema kind: $kind" }
    }
}
$typeChecks = foreach ($case in $request.typeChecks) {
    $expression = $case.expression
    if ($expression.StartsWith('=')) { $expression = $expression.Substring(1) }
    $checked = $engine.Check($expression, (Convert-SchemaType $case.schema), $null)
    @{
        name = $case.name
        success = $checked.IsSuccess -and @($checked.Errors).Count -eq 0
        returnType = if ($checked.IsSuccess) { $checked.ReturnType.ToString() } else { $null }
        errors = @($checked.Errors | ForEach-Object Message)
    }
}
$semanticErrors = @()
if ($request.semanticRoot) {
    [void][Reflection.Assembly]::LoadFrom((Join-Path $SdkDirectory 'Microsoft.Agents.ObjectModel.PowerFx.dll'))
    Add-Type -ReferencedAssemblies (Join-Path $SdkDirectory 'Microsoft.Agents.ObjectModel.dll') -TypeDefinition @'
public sealed class AdoptaLocalAuthoringFeatures : Microsoft.Agents.ObjectModel.Abstractions.IFeatureConfiguration
{
    public bool IsEnvironmentFeatureEnabled(string name, bool defaultValue) => defaultValue;
    public bool IsTenantFeatureEnabled(string name, bool defaultValue) => defaultValue;
    public long GetInt64Value(string name, long defaultValue) => defaultValue;
    public string GetStringValue(string name, string defaultValue) => defaultValue;
}
'@
    $features = [AdoptaLocalAuthoringFeatures]::new()
    $checker = [Microsoft.Agents.ObjectModel.PowerFx.PowerFxExpressionChecker]::new($features)
    $components = [Collections.Generic.List[Microsoft.Agents.ObjectModel.BotComponentBase]]::new()
    $botSchema = if ($request.semanticBotSchema) { [string]$request.semanticBotSchema } else { 'vm_Adopta' }
    foreach ($folder in Get-ChildItem -LiteralPath $request.semanticRoot -Directory -Filter "$botSchema.*") {
        $override = $request.semanticOverrides.PSObject.Properties | Where-Object Name -eq $folder.Name
        $raw = if ($override) { [string]$override.Value } else { Get-Content -Raw -LiteralPath (Join-Path $folder.FullName 'data') }
        if ($raw -notmatch '^kind: (AdaptiveDialog|TaskDialog)') { continue }
        $wrapped = "kind: DialogComponent`nschemaName: $($folder.Name)`ndialog:`n" +
            (($raw -split "`n" | ForEach-Object { '  ' + $_ }) -join "`n")
        $components.Add([Microsoft.Agents.ObjectModel.Yaml.YamlSerializer]::Deserialize[Microsoft.Agents.ObjectModel.BotComponentBase]($wrapped))
    }
    $entity = [Microsoft.Agents.ObjectModel.Yaml.YamlSerializer]::Deserialize[Microsoft.Agents.ObjectModel.BotEntity](
        "kind: BotEntity`nschemaName: $botSchema"
    )
    $definition = [Microsoft.Agents.ObjectModel.BotDefinition]::Empty.WithComponents($components).WithEntity($entity)
    $validatedDefinition = [Microsoft.Agents.ObjectModel.ValidationExtensions]::Validate[Microsoft.Agents.ObjectModel.BotDefinition](
        $definition, $false, $checker, $features, $null, $false, $null, $null
    )
    $semanticErrors = @(
        foreach ($component in $validatedDefinition.Components) {
            if ($component.SchemaName -notin $request.semanticTargets) { continue }
            foreach ($node in $component.DescendantsAndSelf()) {
                foreach ($diagnostic in $node.Diagnostics) {
                    @{
                        component = [string]$component.SchemaName
                        node = $node.GetType().Name
                        code = [string]$diagnostic.ErrorCode
                        message = $diagnostic.ErrorMessage
                    }
                }
            }
        }
    )
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
@{ validated = $validated; xmlCount = @($request.xmlPaths | Where-Object { $_ }).Count; results = @($results); typeChecks = @($typeChecks); semanticErrors = $semanticErrors } |
    ConvertTo-Json -Depth 80 -Compress

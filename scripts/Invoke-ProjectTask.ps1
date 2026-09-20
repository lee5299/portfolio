[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('test', 'build', 'deploy')]
    [string]$Task,
    [string]$ProjectPath
)

if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Split-Path -Parent $PSScriptRoot }

$configPath = Join-Path $ProjectPath 'config/automation.json'
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Missing automation configuration: $configPath"
}

try {
    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
} catch {
    throw "Invalid JSON in ${configPath}: $($_.Exception.Message)"
}

$definition = $config.$Task
if ($null -eq $definition -or [string]::IsNullOrWhiteSpace($definition.command)) {
    throw "No $Task command is configured in config/automation.json."
}

$arguments = @()
if ($null -ne $definition.arguments) { $arguments = @($definition.arguments) }

Push-Location $ProjectPath
try {
    & $definition.command @arguments
    $taskExitCode = $LASTEXITCODE
    if ($taskExitCode -ne 0) {
        throw "$Task command failed with exit code $taskExitCode."
    }
    $global:LASTEXITCODE = 0
} finally {
    Pop-Location
}

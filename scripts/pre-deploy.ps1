[CmdletBinding()]
param([string]$ProjectPath)

if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Split-Path -Parent $PSScriptRoot }

& (Join-Path $PSScriptRoot 'validate-project.ps1') -ProjectPath $ProjectPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $PSScriptRoot 'Invoke-ProjectTask.ps1') -Task test -ProjectPath $ProjectPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$config = Get-Content -Raw -LiteralPath (Join-Path $ProjectPath 'config/automation.json') | ConvertFrom-Json
if (-not [string]::IsNullOrWhiteSpace($config.build.command)) {
    & (Join-Path $PSScriptRoot 'Invoke-ProjectTask.ps1') -Task build -ProjectPath $ProjectPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

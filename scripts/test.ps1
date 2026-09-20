[CmdletBinding()]
param([string]$ProjectPath)

if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Split-Path -Parent $PSScriptRoot }

& (Join-Path $PSScriptRoot 'Invoke-ProjectTask.ps1') -Task test -ProjectPath $ProjectPath
exit $LASTEXITCODE

[CmdletBinding()]
param(
    [switch]$ConfirmDeployment,
    [string]$ProjectPath
)

if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Split-Path -Parent $PSScriptRoot }

if (-not $ConfirmDeployment) {
    throw 'Deployment is not run implicitly. Review the release checklist, then rerun with -ConfirmDeployment.'
}

& (Join-Path $PSScriptRoot 'pre-deploy.ps1') -ProjectPath $ProjectPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $PSScriptRoot 'Invoke-ProjectTask.ps1') -Task deploy -ProjectPath $ProjectPath
exit $LASTEXITCODE

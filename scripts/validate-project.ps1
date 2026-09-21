[CmdletBinding()]
param([string]$ProjectPath)

if ([string]::IsNullOrWhiteSpace($ProjectPath)) { $ProjectPath = Split-Path -Parent $PSScriptRoot }

$requiredPaths = @(
    'AGENTS.md', 'README.md', 'PROJECT.md', '.env.example', '.gitignore', '.vercelignore', 'vercel.json', 'server.js',
    'scripts/generate-db-credentials.mjs',
    'docs/PRD.md', 'docs/DESIGN.md', 'docs/DECISIONS.md', 'docs/CURRENT_STATE.md', 'docs/DEPLOYMENT.md',
    'supabase/migrations/20260920000000_initial.sql', 'supabase/checks/preflight_planner.sql',
    'supabase/checks/postflight_planner.sql', 'supabase/checks/connection_role_planner.sql',
    'supabase/checks/evidence_summary.sql',
    'supabase/rollback/remove_portfolio_passkey.sql',
    'checklists/development.md', 'checklists/testing.md', 'checklists/release.md', 'checklists/security-baseline.md',
    'config/automation.json'
)
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

foreach ($path in $requiredPaths) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath $path))) {
        $failures.Add("Missing required path: $path")
    }
}

$projectBrief = Join-Path $ProjectPath 'PROJECT.md'
if ((Test-Path -LiteralPath $projectBrief) -and (Select-String -LiteralPath $projectBrief -SimpleMatch '{{PROJECT_NAME}}' -Quiet)) {
    $failures.Add('PROJECT.md still contains {{PROJECT_NAME}}.')
}

$configPath = Join-Path $ProjectPath 'config/automation.json'
if (Test-Path -LiteralPath $configPath) {
    try { $null = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json } catch { $failures.Add("Invalid automation.json: $($_.Exception.Message)") }
}

$vercelConfigPath = Join-Path $ProjectPath 'vercel.json'
if (Test-Path -LiteralPath $vercelConfigPath) {
    try {
        $vercelConfig = Get-Content -Raw -LiteralPath $vercelConfigPath | ConvertFrom-Json
        if ($vercelConfig.framework -ne 'express') { $failures.Add('vercel.json must select the Express framework preset.') }
    } catch {
        $failures.Add("Invalid vercel.json: $($_.Exception.Message)")
    }
}

$vercelEntrypointPath = Join-Path $ProjectPath 'server.js'
if ((Test-Path -LiteralPath $vercelEntrypointPath) -and
    -not (Select-String -LiteralPath $vercelEntrypointPath -SimpleMatch "from 'express'" -Quiet)) {
    $failures.Add('server.js must import Express directly so Vercel can detect the function entrypoint.')
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    $insideWorkTree = git -C $ProjectPath rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -eq 0 -and $insideWorkTree -eq 'true') {
        $tracked = @(git -C $ProjectPath ls-files -- '.env' '.env.*' 2>$null)
        $tracked = $tracked | Where-Object { $_ -and $_ -ne '.env.example' }
        if ($tracked.Count -gt 0) { $failures.Add("Tracked environment file(s): $($tracked -join ', ')") }

        $trackedRuntimeData = @(git -C $ProjectPath ls-files -- 'runtime-data/**' 'evidence/raw/**' '*.runtime.json' 2>$null)
        $trackedRuntimeData = $trackedRuntimeData | Where-Object { $_ }
        if ($trackedRuntimeData.Count -gt 0) {
            $failures.Add("Tracked runtime authentication data file(s): $($trackedRuntimeData -join ', ')")
        }

        $trackedVercel = @(git -C $ProjectPath ls-files -- '.vercel/**' 2>$null) | Where-Object { $_ }
        if ($trackedVercel.Count -gt 0) { $failures.Add("Tracked Vercel local configuration: $($trackedVercel -join ', ')") }
    } else {
        $warnings.Add('Project is not a Git work tree; tracked secret and runtime authentication files could not be checked.')
    }
} else {
    $warnings.Add('Git is unavailable; tracked secret and runtime authentication files could not be checked.')
}

foreach ($warning in $warnings) { Write-Warning $warning }
foreach ($failure in $failures) { Write-Error $failure }
if ($failures.Count -gt 0) { exit 1 }

Write-Host 'Project validation passed.'
exit 0

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$pairForwardedArguments = @($args)
$pairExitCode = 1

try {
  $pairSourceRoot = [IO.Path]::GetFullPath($PSScriptRoot)
  $pairCorePath = [IO.Path]::GetFullPath((Join-Path $pairSourceRoot 'pair-compare-session-launcher-candidate.mjs'))
  if (-not $pairCorePath.StartsWith($pairSourceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'candidate core escaped source root'
  }
  if (-not (Test-Path -LiteralPath $pairCorePath -PathType Leaf)) {
    throw 'candidate core unavailable'
  }

  $pairNodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
  $pairNodeExecutable = [IO.Path]::GetFullPath($pairNodeCommand.Source)

  $pairAllowedEnvironmentNames = @(
    'SystemRoot',
    'WINDIR',
    'ProgramFiles',
    'ProgramFiles(x86)',
    'LOCALAPPDATA',
    'TEMP',
    'TMP'
  )
  $pairAllowedEnvironment = @{}
  foreach ($pairVariableName in $pairAllowedEnvironmentNames) {
    $pairVariableValue = [Environment]::GetEnvironmentVariable($pairVariableName, 'Process')
    if (-not [String]::IsNullOrEmpty($pairVariableValue)) {
      $pairAllowedEnvironment[$pairVariableName] = $pairVariableValue
    }
  }
  foreach ($pairEnvironmentEntry in @(Get-ChildItem Env:)) {
    [Environment]::SetEnvironmentVariable($pairEnvironmentEntry.Name, $null, 'Process')
  }
  foreach ($pairVariableName in $pairAllowedEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable(
      $pairVariableName,
      [string]$pairAllowedEnvironment[$pairVariableName],
      'Process'
    )
  }
  [Environment]::SetEnvironmentVariable(
    'HAKIMI_PAIR_COMPARE_SOURCE_WRAPPER_CANDIDATE',
    'powershell-no-profile-pair-compare-synthetic-launcher-v1',
    'Process'
  )

  Push-Location -LiteralPath $pairSourceRoot
  try {
    $pairNodeArguments = @($pairCorePath) + $pairForwardedArguments
    & $pairNodeExecutable @pairNodeArguments
    $pairExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} catch {
  [Console]::Error.WriteLine('PAIR_COMPARE_SYNTHETIC_WRAPPER_REJECTED WRAPPER_START_FAILED')
  $pairExitCode = 1
} finally {
  [Environment]::SetEnvironmentVariable('HAKIMI_PAIR_COMPARE_SOURCE_WRAPPER_CANDIDATE', $null, 'Process')
}

exit $pairExitCode

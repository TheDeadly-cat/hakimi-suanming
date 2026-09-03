$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$pilotForwardedArguments = @($args)
$pilotExitCode = 1

try {
  $pilotSourceRoot = [IO.Path]::GetFullPath($PSScriptRoot)
  $pilotCorePath = [IO.Path]::GetFullPath((Join-Path $pilotSourceRoot 'external-pin-prelaunch-candidate.mjs'))
  if (-not $pilotCorePath.StartsWith($pilotSourceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'candidate core escaped source root'
  }
  if (-not (Test-Path -LiteralPath $pilotCorePath -PathType Leaf)) {
    throw 'candidate core unavailable'
  }

  $pilotNodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
  $pilotNodeExecutable = [IO.Path]::GetFullPath($pilotNodeCommand.Source)

  foreach ($pilotVariableName in @('NODE_OPTIONS', 'NODE_PATH', 'npm_config_node_options', 'NPM_CONFIG_NODE_OPTIONS')) {
    [Environment]::SetEnvironmentVariable($pilotVariableName, $null, 'Process')
  }
  [Environment]::SetEnvironmentVariable(
    'HAKIMI_PILOT_SOURCE_WRAPPER_CANDIDATE',
    'powershell-no-profile-node-startup-options-cleared-candidate-v1',
    'Process'
  )

  Push-Location -LiteralPath $pilotSourceRoot
  try {
    $pilotNodeArguments = @($pilotCorePath) + $pilotForwardedArguments
    & $pilotNodeExecutable @pilotNodeArguments
    $pilotExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} catch {
  [Console]::Error.WriteLine('PILOT_EXTERNAL_PIN_WRAPPER_REJECTED WRAPPER_START_FAILED')
  $pilotExitCode = 1
} finally {
  [Environment]::SetEnvironmentVariable('HAKIMI_PILOT_SOURCE_WRAPPER_CANDIDATE', $null, 'Process')
}

exit $pilotExitCode

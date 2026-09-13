param(
  [string]$PackageRoot = "",
  [string]$InstallRoot = "",
  [string]$NodeExecutable = "",
  [switch]$NoShortcut
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($PackageRoot)) { $PackageRoot = Split-Path -Parent $PSScriptRoot }
if ([string]::IsNullOrWhiteSpace($InstallRoot)) { $InstallRoot = Join-Path $env:USERPROFILE "HakimiBaziWorkbenchCandidates" }
if ([string]::IsNullOrWhiteSpace($NodeExecutable)) { $NodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source }
$localNodePath = (Resolve-Path -LiteralPath $NodeExecutable).ProviderPath
$sourceRoot = (Resolve-Path -LiteralPath $PackageRoot).ProviderPath
$targetRoot = Join-Path ([IO.Path]::GetFullPath($InstallRoot)) "packages\4de42e9db980-package-v1"
$cliPath = Join-Path $sourceRoot "scripts\local-research-candidate.mjs"
if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) { throw "Extract the local engineering candidate package first and pass -PackageRoot. Source checkout installation does not build an artifact." }
$result = & $localNodePath $cliPath install --package-root $sourceRoot --destination $targetRoot
if ($LASTEXITCODE -ne 0) { throw "Local package installation refused. No existing package or browser data was replaced." }
$result | Write-Output
if ($NoShortcut) { exit 0 }
$launcher = Join-Path $targetRoot "scripts\launch-local-candidate.ps1"
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$title = (-join ([char[]]@(0x54C8,0x57FA,0x7C73,0x516B,0x5B57,0x7814,0x7A76,0x53F0))) + " - Candidate (5189)"
$shortcutPath = Join-Path $desktopPath ($title + ".lnk")
$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -PackageRoot "{1}" -NodeExecutable "{2}"' -f $launcher, $targetRoot, $localNodePath
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if (Test-Path -LiteralPath $shortcutPath) {
  if ($shortcut.TargetPath -ine $powershellPath -or $shortcut.Arguments -cne $arguments -or $shortcut.WorkingDirectory -ine $targetRoot) {
    throw "The desktop shortcut belongs to another installation. It was not overwritten: $shortcutPath"
  }
} else {
  $shortcut.TargetPath = $powershellPath
  $shortcut.Arguments = $arguments
  $shortcut.WorkingDirectory = $targetRoot
  $shortcut.Description = "Local engineering candidate artifact on 127.0.0.1:5189; no build or automatic data migration."
  $shortcut.Save()
}
Write-Output $shortcutPath

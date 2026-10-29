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
$cliPath = Join-Path $sourceRoot "scripts\local-research-trial-candidate.mjs"
if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) { throw "Extract the prepared free local trial package first. Installation does not build an artifact." }
$verifiedText = & $localNodePath $cliPath verify --package-root $sourceRoot
if ($LASTEXITCODE -ne 0) { throw "Candidate package verification failed; nothing was installed." }
$verified = ($verifiedText -join "`n") | ConvertFrom-Json
$buildVersion = [string]$verified.release.buildVersion
$revision = [string]$verified.release.packageRevision
if ($buildVersion -cnotmatch '^[a-f0-9]{12}$' -or $revision -cnotmatch '^[1-9][0-9]*$') { throw "Invalid verified package directory identity." }
$targetRoot = Join-Path ([IO.Path]::GetFullPath($InstallRoot)) ("trials\" + $buildVersion + "-package-v" + $revision)
$result = & $localNodePath $cliPath install --package-root $sourceRoot --destination $targetRoot
if ($LASTEXITCODE -ne 0) { throw "Local package installation refused. No existing package or browser data was replaced." }
$result | Write-Output
if ($NoShortcut) { exit 0 }
$launcher = Join-Path $targetRoot "scripts\launch-local-trial-candidate.ps1"
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
$desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$title = (-join ([char[]]@(0x54C8,0x57FA,0x7C73,0x516B,0x5B57,0x7814,0x7A76,0x53F0))) + " - Free Trial (5199)"
$shortcutPath = Join-Path $desktopPath ($title + ".lnk")
$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -PackageRoot "{1}" -NodeExecutable "{2}" -OpenSystemBrowser' -f $launcher, $targetRoot, $localNodePath
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
  $shortcut.Description = "Verify and open the independent free local trial; existing daily browser data is not copied."
  $shortcut.Save()
}
Write-Output $shortcutPath

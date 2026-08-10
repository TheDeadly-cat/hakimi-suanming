param(
  [string]$ShortcutName = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $PSScriptRoot "launch-hakimi-workbench.ps1"
$desktopPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$defaultShortcutName = -join ([char[]]@(0x54C8, 0x57FA, 0x7C73, 0x516B, 0x5B57, 0x7814, 0x7A76, 0x53F0))
if ([string]::IsNullOrWhiteSpace($ShortcutName)) { $ShortcutName = $defaultShortcutName }
$shortcutPath = Join-Path $desktopPath "$ShortcutName.lnk"
$powershellPath = (Get-Command powershell.exe -ErrorAction Stop).Source

if (-not (Test-Path -LiteralPath $launcherPath)) {
  throw "Desktop launcher script was not found: $launcherPath"
}

$edgeCandidates = @(
  (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
  (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
)
$edgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $launcherPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Launch the local-first Hakimi Bazi Workbench (default legacy-v13)"
if ($null -ne $edgePath) {
  $shortcut.IconLocation = "{0},0" -f $edgePath
}
$shortcut.Save()

Write-Output $shortcutPath

param(
  [string]$PackageRoot = "",
  [string]$NodeExecutable = "",
  [string]$LogRoot = "",
  [switch]$OpenSystemBrowser,
  [switch]$NoDialogs
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$mutex = $null
$acquired = $false
try {
  if ([string]::IsNullOrWhiteSpace($PackageRoot)) { $PackageRoot = Split-Path -Parent $PSScriptRoot }
  if ([string]::IsNullOrWhiteSpace($NodeExecutable)) { $NodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source }
  if ([string]::IsNullOrWhiteSpace($LogRoot)) { $LogRoot = Join-Path $env:USERPROFILE "HakimiBaziWorkbenchCandidates\deep-reading-launch-logs" }
  $sourceRoot = (Resolve-Path -LiteralPath $PackageRoot).ProviderPath
  $localNodePath = (Resolve-Path -LiteralPath $NodeExecutable).ProviderPath
  $logAbsolute = [IO.Path]::GetFullPath($LogRoot)
  if (($logAbsolute + '\').StartsWith(($sourceRoot.TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Logs must stay outside the immutable package directory."
  }
  $cliPath = Join-Path $sourceRoot "scripts\local-research-deep-reading-candidate.mjs"
  if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf)) { throw "Extract the prepared deep reading local trial package before launching it." }
  $runRoot = Join-Path $logAbsolute ([DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ") + "-" + [Guid]::NewGuid().ToString("N"))
  [void][IO.Directory]::CreateDirectory($runRoot)
  $verifiedText = & $localNodePath $cliPath verify --package-root $sourceRoot 2> (Join-Path $runRoot "verify.stderr.log")
  $verifyCode = $LASTEXITCODE
  $verifiedText | Set-Content -LiteralPath (Join-Path $runRoot "verify.stdout.log") -Encoding UTF8
  if ($verifyCode -ne 0) { throw "The candidate package did not pass verification. See the verification logs." }
  $verified = ($verifiedText -join "`n") | ConvertFrom-Json
  $origin = [string]$verified.release.origin
  $originUri = [Uri]$origin
  if ($originUri.Scheme -cne "http" -or $originUri.Host -cne "127.0.0.1" -or $originUri.AbsolutePath -cne "/" -or $originUri.Query -or $originUri.Fragment -or $originUri.UserInfo -or ($originUri.Port -in @(5188, 5189, 5197, 5199))) {
    throw "The verified candidate must use its own explicit loopback origin and cannot use existing daily or development ports 5188/5189/5197/5199."
  }
  $port = $originUri.Port
  $mutex = New-Object Threading.Mutex($false, ("Local\HakimiBaziLocalCandidate-" + $port))
  try { $acquired = $mutex.WaitOne([TimeSpan]::FromSeconds(30)) }
  catch [Threading.AbandonedMutexException] { $acquired = $true }
  if (-not $acquired) { throw "Another local launch is still in progress." }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  if (@($listeners | Where-Object { $_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "The candidate port is not loopback-only. No service was stopped and no port was changed."
  }
  $probe = & $localNodePath $cliPath probe --package-root $sourceRoot 2>> (Join-Path $runRoot "probe.stderr.log")
  $probeCode = $LASTEXITCODE
  $probe | Add-Content -LiteralPath (Join-Path $runRoot "probe.stdout.log") -Encoding UTF8
  $started = $false
  if ($probeCode -ne 0) {
    if ($probeCode -ne 2 -or $listeners.Count -gt 0) { throw "The candidate port belongs to a different or unverified service. Startup stopped; the service was not terminated." }
    $arguments = '"{0}" serve --package-root "{1}" --log-root "{2}"' -f $cliPath, $sourceRoot, $runRoot
    $child = Start-Process -FilePath $localNodePath -ArgumentList $arguments -WorkingDirectory $sourceRoot -WindowStyle Hidden -PassThru
    $startedProcessId = $child.Id
    $started = $true
    $timer = [Diagnostics.Stopwatch]::StartNew()
    do {
      if ($null -eq (Get-Process -Id $startedProcessId -ErrorAction SilentlyContinue)) { throw "Local server exited. See server-failure.json in this run directory." }
      Start-Sleep -Milliseconds 250
      $probe = & $localNodePath $cliPath probe --package-root $sourceRoot 2>> (Join-Path $runRoot "probe.stderr.log")
      $probeCode = $LASTEXITCODE
      $probe | Add-Content -LiteralPath (Join-Path $runRoot "probe.stdout.log") -Encoding UTF8
    } while ($probeCode -ne 0 -and $timer.Elapsed.TotalSeconds -lt 30)
    if ($probeCode -ne 0) { throw "The new listener did not return the candidate artifact. See diagnostic logs." }
  }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne "127.0.0.1") { throw "Expected exactly one loopback candidate listener." }
  $browserOpened = $false
  $guidance = "深度解读试用服务已就绪：$origin 。这是独立资料空间，首次打开为空库；不会自动看到 5199、5189 或 Codex 中的资料。可在原入口正常导出备份，再从试用版的数据管理导入。"
  if ($OpenSystemBrowser) {
    $openConfirmed = $true
    if ($NoDialogs) { Write-Warning "试用版使用独立资料空间，不会自动读取 5199、5189、5197 或 Codex 中的资料。" }
    if (-not $NoDialogs) {
      Add-Type -AssemblyName System.Windows.Forms
      $answer = [Windows.Forms.MessageBox]::Show("深度解读试用版是独立资料空间，首次为空库，不会自动读取 5199 或其他旧入口资料。现在打开试用版吗？", "打开另一资料空间", [Windows.Forms.MessageBoxButtons]::YesNo)
      $openConfirmed = $answer -eq [Windows.Forms.DialogResult]::Yes
    }
    if ($openConfirmed) { Start-Process $origin | Out-Null; $browserOpened = $true }
  } elseif (-not $NoDialogs) {
    Add-Type -AssemblyName System.Windows.Forms
    [void][Windows.Forms.MessageBox]::Show($guidance, "哈基米深度解读试用版")
  }
  $record = [ordered]@{ at=[DateTime]::UtcNow.ToString("o"); origin=$origin; packageRoot=$sourceRoot; started=$started; listenerPid=$listeners[0].OwningProcess; rebuilt=$false; dataMigrated=$false; browserOpened=$browserOpened; systemBrowserRequested=[bool]$OpenSystemBrowser; dataEntry="independent-deep-reading-browser"; browserDataShared=$false; guidance=$guidance }
  $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot "startup.json") -Encoding UTF8
  $record | ConvertTo-Json -Compress | Write-Output
} catch {
  $message = $_.Exception.Message
  [Console]::Error.WriteLine($message)
  if (-not $NoDialogs) {
    Add-Type -AssemblyName System.Windows.Forms
    [void][Windows.Forms.MessageBox]::Show($message, "Hakimi local candidate")
  }
  exit 1
} finally {
  if ($acquired) { $mutex.ReleaseMutex() }
  if ($null -ne $mutex) { $mutex.Dispose() }
}

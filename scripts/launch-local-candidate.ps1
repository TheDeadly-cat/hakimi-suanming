param(
  [string]$PackageRoot = "",
  [string]$NodeExecutable = "",
  [string]$LogRoot = "",
  [switch]$NoBrowser,
  [switch]$NoDialogs
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$origin = "http://127.0.0.1:5189/"
$mutex = $null
$acquired = $false
try {
  if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
    $PackageRoot = Join-Path $env:USERPROFILE "HakimiBaziWorkbenchCandidates\packages\4de42e9db980-package-v2"
  }
  if ([string]::IsNullOrWhiteSpace($NodeExecutable)) { $NodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source }
  if ([string]::IsNullOrWhiteSpace($LogRoot)) { $LogRoot = Join-Path $env:USERPROFILE "HakimiBaziWorkbenchCandidates\candidate-launch-logs" }
  $sourceRoot = (Resolve-Path -LiteralPath $PackageRoot).ProviderPath
  $localNodePath = (Resolve-Path -LiteralPath $NodeExecutable).ProviderPath
  $logAbsolute = [IO.Path]::GetFullPath($LogRoot)
  if (($logAbsolute + '\').StartsWith(($sourceRoot.TrimEnd('\') + '\'), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Logs must stay outside the immutable package directory."
  }
  $runRoot = Join-Path $logAbsolute ([DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ") + "-" + [Guid]::NewGuid().ToString("N"))
  [void][IO.Directory]::CreateDirectory($runRoot)
  $cliPath = Join-Path $sourceRoot "scripts\local-research-candidate.mjs"
  $mutex = New-Object Threading.Mutex($false, "Local\HakimiBaziLocalCandidate-5189")
  try { $acquired = $mutex.WaitOne([TimeSpan]::FromSeconds(30)) }
  catch [Threading.AbandonedMutexException] { $acquired = $true }
  if (-not $acquired) { throw "Another local launch is still in progress." }
  & $localNodePath $cliPath verify --package-root $sourceRoot *> (Join-Path $runRoot "verify.log")
  if ($LASTEXITCODE -ne 0) { throw "The candidate package did not pass verification. See verify.log." }
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 5189 -ErrorAction SilentlyContinue)
  if (@($listeners | Where-Object { $_.LocalAddress -ne "127.0.0.1" }).Count -gt 0) {
    throw "Port 5189 is not loopback-only. No service was stopped and no port was changed."
  }
  $probe = & $localNodePath $cliPath probe --package-root $sourceRoot 2>> (Join-Path $runRoot "probe.stderr.log")
  $probeCode = $LASTEXITCODE
  $probe | Add-Content -LiteralPath (Join-Path $runRoot "probe.stdout.log") -Encoding UTF8
  $started = $false
  if ($probeCode -ne 0) {
    if ($probeCode -ne 2 -or $listeners.Count -gt 0) { throw "Port 5189 belongs to a different or unverified service. Startup stopped; the service was not terminated." }
    $arguments = '"{0}" serve --package-root "{1}" --log-root "{2}"' -f $cliPath, $sourceRoot, $runRoot
    # ShellExecute gives the service a hidden console without inheriting the
    # launcher's capture pipes. The server writes its own diagnostic files.
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
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 5189 -ErrorAction SilentlyContinue)
  if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne "127.0.0.1") { throw "Expected exactly one loopback listener on 5189." }
  $record = [ordered]@{ at=[DateTime]::UtcNow.ToString("o"); origin=$origin; packageRoot=$sourceRoot; started=$started; listenerPid=$listeners[0].OwningProcess; rebuilt=$false; dataMigrated=$false }
  $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runRoot "startup.json") -Encoding UTF8
  $record | ConvertTo-Json -Compress | Write-Output
  if (-not $NoBrowser) { Start-Process $origin | Out-Null }
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

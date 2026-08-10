param(
  [switch]$NoBrowser,
  [switch]$NoDialogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$previewPort = 4173
$appUrl = "http://127.0.0.1:$previewPort/"
$serviceWorkerUrl = "http://127.0.0.1:$previewPort/sw.js"
$distIndexPath = Join-Path $projectRoot "dist\web\index.html"
$distServiceWorkerPath = Join-Path $projectRoot "dist\web\sw.js"
$launcherLogDirectory = Join-Path $env:LOCALAPPDATA "HakimiBaziWorkbench"
$buildLogPath = Join-Path $launcherLogDirectory "build.log"
$previewOutputPath = Join-Path $launcherLogDirectory "preview-output.log"
$previewErrorPath = Join-Path $launcherLogDirectory "preview-error.log"
$legacyReleaseSwMarker = 'const RELEASE_DATABASE = JSON.parse("{\"protocolVersion\":1,\"dbGeneration\":\"legacy-v13\",\"databaseName\":\"hakimi-bazi-research\",\"targetSchema\":13,'
$legacyReleaseIndexMarker = 'name="hakimi-release-database" content="{&quot;protocolVersion&quot;:1,&quot;dbGeneration&quot;:&quot;legacy-v13&quot;,&quot;databaseName&quot;:&quot;hakimi-bazi-research&quot;,&quot;targetSchema&quot;:13,'
$startedPreview = $null
$launcherMutex = $null
$mutexAcquired = $false

function Show-LauncherError {
  param([Parameter(Mandatory = $true)][string]$Message)

  $fullMessage = "$Message`r`n`r`nLogs: $launcherLogDirectory"
  if ($NoDialogs) {
    [Console]::Error.WriteLine($fullMessage)
    return
  }
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show(
      $fullMessage,
      "Hakimi Bazi Workbench",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    )
  }
  catch {
    [Console]::Error.WriteLine($fullMessage)
  }
}

function Get-WebContent {
  param([Parameter(Mandatory = $true)][string]$Uri)

  try {
    return (Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 2).Content
  }
  catch {
    return $null
  }
}

function Get-WorkbenchSnapshot {
  $index = Get-WebContent -Uri $appUrl
  $serviceWorker = Get-WebContent -Uri $serviceWorkerUrl
  if ($null -eq $index -and $null -eq $serviceWorker) { return $null }
  return [pscustomobject]@{
    Index = $index
    ServiceWorker = $serviceWorker
  }
}

function Test-LegacyWorkbenchSnapshot {
  param([AllowNull()][object]$Snapshot)

  return $null -ne $Snapshot `
    -and $null -ne $Snapshot.Index `
    -and $null -ne $Snapshot.ServiceWorker `
    -and $Snapshot.Index.Contains($legacyReleaseIndexMarker) `
    -and $Snapshot.ServiceWorker.Contains($legacyReleaseSwMarker)
}

function Get-LocalArtifact {
  if (-not (Test-Path -LiteralPath $distIndexPath) -or -not (Test-Path -LiteralPath $distServiceWorkerPath)) {
    return $null
  }
  $index = Get-Content -Raw -Encoding utf8 -LiteralPath $distIndexPath
  $serviceWorker = Get-Content -Raw -Encoding utf8 -LiteralPath $distServiceWorkerPath
  if (-not $index.Contains($legacyReleaseIndexMarker) -or -not $serviceWorker.Contains($legacyReleaseSwMarker)) {
    return $null
  }

  $indexVersion = [regex]::Match($index, 'name="hakimi-build-version" content="(?<version>[a-f0-9]{12})"')
  $workerVersion = [regex]::Match($serviceWorker, 'const CACHE_VERSION = "(?<version>[a-f0-9]{12})";')
  if (-not $indexVersion.Success -or -not $workerVersion.Success) { return $null }
  if ($indexVersion.Groups["version"].Value -ne $workerVersion.Groups["version"].Value) { return $null }

  return [pscustomobject]@{
    Index = $index
    ServiceWorker = $serviceWorker
    BuildVersion = $indexVersion.Groups["version"].Value
  }
}

function Test-SnapshotMatchesArtifact {
  param(
    [AllowNull()][object]$Snapshot,
    [AllowNull()][object]$Artifact
  )

  if (-not (Test-LegacyWorkbenchSnapshot -Snapshot $Snapshot) -or $null -eq $Artifact) { return $false }
  $indexVersion = [regex]::Match($Snapshot.Index, 'name="hakimi-build-version" content="(?<version>[a-f0-9]{12})"')
  $workerVersion = [regex]::Match($Snapshot.ServiceWorker, 'const CACHE_VERSION = "(?<version>[a-f0-9]{12})";')
  return $indexVersion.Success `
    -and $workerVersion.Success `
    -and $indexVersion.Groups["version"].Value -eq $Artifact.BuildVersion `
    -and $workerVersion.Groups["version"].Value -eq $Artifact.BuildVersion
}

function Get-ListeningProcessId {
  $listener = Get-NetTCPConnection -LocalPort $previewPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $listener) { return $null }
  return $listener.OwningProcess
}

function Get-EdgePath {
  $candidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  $command = Get-Command msedge.exe -ErrorAction SilentlyContinue
  if ($null -ne $command) { return $command.Source }
  return $null
}

try {
  New-Item -ItemType Directory -Path $launcherLogDirectory -Force | Out-Null
  $launcherMutex = New-Object System.Threading.Mutex($false, "Local\HakimiBaziWorkbench-4173")
  try {
    $mutexAcquired = $launcherMutex.WaitOne([TimeSpan]::FromSeconds(45))
  }
  catch [System.Threading.AbandonedMutexException] {
    $mutexAcquired = $true
  }
  if (-not $mutexAcquired) {
    throw "Another launcher instance did not finish within 45 seconds."
  }

  $localArtifact = Get-LocalArtifact
  $runningSnapshot = Get-WorkbenchSnapshot
  if (Test-SnapshotMatchesArtifact -Snapshot $runningSnapshot -Artifact $localArtifact) {
    $ready = $true
  }
  else {
    $listenerProcessId = Get-ListeningProcessId
    if ($null -ne $listenerProcessId -or $null -ne $runningSnapshot) {
      throw "Port $previewPort is occupied by a service that does not exactly match the local legacy-v13 artifact. No process was terminated."
    }

    $npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
    Push-Location $projectRoot
    try {
      $previousErrorActionPreference = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      try {
        $buildOutput = & $npmCommand run build 2>&1
        $buildExitCode = $LASTEXITCODE
      }
      finally {
        $ErrorActionPreference = $previousErrorActionPreference
      }
      $buildOutput | Out-File -LiteralPath $buildLogPath -Encoding utf8
      if ($buildExitCode -ne 0) {
        throw "The default production build failed. See $buildLogPath"
      }
    }
    finally {
      Pop-Location
    }

    $localArtifact = Get-LocalArtifact
    if ($null -eq $localArtifact) {
      throw "The default artifact is not a self-consistent legacy-v13 / targetSchema 13 build."
    }

    $nodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
    $viteCliPath = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
    $viteConfigPath = Join-Path $projectRoot "apps\web\vite.config.ts"
    if (-not (Test-Path -LiteralPath $viteCliPath)) {
      throw "The workspace Vite CLI was not found: $viteCliPath"
    }

    Remove-Item -LiteralPath $previewOutputPath, $previewErrorPath -Force -ErrorAction SilentlyContinue
    $previewArguments = @{
      FilePath = $nodeCommand
      ArgumentList = @($viteCliPath, "preview", "--config", $viteConfigPath, "--host", "127.0.0.1", "--port", "$previewPort", "--strictPort")
      WorkingDirectory = $projectRoot
      WindowStyle = "Hidden"
      RedirectStandardOutput = $previewOutputPath
      RedirectStandardError = $previewErrorPath
      PassThru = $true
    }
    $startedPreview = Start-Process @previewArguments

    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    $ready = $false
    do {
      Start-Sleep -Milliseconds 250
      if ($startedPreview.HasExited) {
        throw "The local preview service failed to start. See $previewErrorPath"
      }
      $runningSnapshot = Get-WorkbenchSnapshot
      $ready = Test-SnapshotMatchesArtifact -Snapshot $runningSnapshot -Artifact $localArtifact
    } while (-not $ready -and [DateTime]::UtcNow -lt $deadline)

    if (-not $ready) {
      throw "The local preview was not ready with the expected build $($localArtifact.BuildVersion) within 30 seconds."
    }
  }

  if (-not $NoBrowser) {
    $edgePath = Get-EdgePath
    if ($null -ne $edgePath) {
      Start-Process -FilePath $edgePath -ArgumentList @("--app=$appUrl", "--start-maximized") | Out-Null
    }
    else {
      Start-Process $appUrl | Out-Null
    }
  }
}
catch {
  if ($null -ne $startedPreview -and -not $startedPreview.HasExited) {
    Stop-Process -Id $startedPreview.Id -Force -ErrorAction SilentlyContinue
  }
  Show-LauncherError -Message $_.Exception.Message
  exit 1
}
finally {
  if ($mutexAcquired -and $null -ne $launcherMutex) {
    try { $launcherMutex.ReleaseMutex() } catch { }
  }
  if ($null -ne $launcherMutex) { $launcherMutex.Dispose() }
}

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedInputPath = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutputDirectory = (Resolve-Path -LiteralPath (Split-Path -Parent $OutputPath)).Path
$resolvedOutputPath = Join-Path $resolvedOutputDirectory (Split-Path -Leaf $OutputPath)
$inputEnvelope = Get-Content -Raw -Encoding UTF8 -LiteralPath $resolvedInputPath | ConvertFrom-Json

if ([string]$inputEnvelope.payload.format -ne "hakimi-p0-03-calendar-differential-input") {
  throw "Input is not a Hakimi P0-03 calendar differential batch."
}

$calendar = [System.Globalization.ChineseLunisolarCalendar]::new()
$calendarType = [System.Globalization.ChineseLunisolarCalendar]
$assembly = $calendarType.Assembly
$fileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($assembly.Location).FileVersion
$assemblyHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $assembly.Location).Hash.ToLowerInvariant()
$results = [System.Collections.Generic.List[object]]::new()

foreach ($candidate in $inputEnvelope.payload.cases) {
  $gregorian = [datetime]::ParseExact(
    [string]$candidate.localDate,
    "yyyy-MM-dd",
    [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::None
  )

  if ($gregorian -lt $calendar.MinSupportedDateTime.Date -or $gregorian -gt $calendar.MaxSupportedDateTime.Date) {
    $results.Add([ordered]@{
      caseId = [string]$candidate.caseId
      status = "unsupported"
      unsupportedCode = "date_out_of_range"
      reason = "ChineseLunisolarCalendar supports $($calendar.MinSupportedDateTime.ToString('yyyy-MM-dd')) through $($calendar.MaxSupportedDateTime.ToString('yyyy-MM-dd')); input was $([string]$candidate.localDate)."
    })
    continue
  }

  try {
    $lunarYear = $calendar.GetYear($gregorian)
    $insertedMonth = $calendar.GetMonth($gregorian)
    $lunarDay = $calendar.GetDayOfMonth($gregorian)
    $leapMonthIndex = $calendar.GetLeapMonth($lunarYear)
    $isLeapMonth = $leapMonthIndex -gt 0 -and $insertedMonth -eq $leapMonthIndex
    $lunarMonth = if ($leapMonthIndex -gt 0 -and $insertedMonth -ge $leapMonthIndex) {
      $insertedMonth - 1
    } else {
      $insertedMonth
    }
    $results.Add([ordered]@{
      caseId = [string]$candidate.caseId
      status = "observation"
      observedCalendar = [ordered]@{
        lunarDate = ("{0:D4}-{1:D2}-{2:D2}" -f $lunarYear, $lunarMonth, $lunarDay)
        lunarLeapMonth = $isLeapMonth
      }
    })
  } catch {
    $results.Add([ordered]@{
      caseId = [string]$candidate.caseId
      status = "unsupported"
      unsupportedCode = "runtime_failure"
      reason = "ChineseLunisolarCalendar rejected the in-range input: $($_.Exception.GetType().FullName)."
    })
  }
}

$output = [ordered]@{
  tool = [ordered]@{
    name = "System.Globalization.ChineseLunisolarCalendar"
    version = $fileVersion
    runtime = "$($assembly.FullName); CLR $($assembly.ImageRuntimeVersion); PowerShell $($PSVersionTable.PSVersion)"
    sourceRef = "runtime-assembly-sha256:$assemblyHash"
  }
  results = @($results)
}

$json = $output | ConvertTo-Json -Depth 8 -Compress
$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($resolvedOutputPath, $json, $utf8WithoutBom)

[ordered]@{
  total = $results.Count
  observations = @($results | Where-Object { $_.status -eq "observation" }).Count
  unsupported = @($results | Where-Object { $_.status -eq "unsupported" }).Count
  outputPath = $resolvedOutputPath
} | ConvertTo-Json -Compress

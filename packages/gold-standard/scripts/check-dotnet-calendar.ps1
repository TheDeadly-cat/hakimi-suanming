[CmdletBinding()]
param(
  [string]$FixturePath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($FixturePath)) {
  $FixturePath = Join-Path $PSScriptRoot "..\fixtures\calendar-conversion-candidates.v1.json"
}
$resolvedFixturePath = (Resolve-Path -LiteralPath $FixturePath).Path
$fixture = Get-Content -Raw -Encoding UTF8 -LiteralPath $resolvedFixturePath | ConvertFrom-Json
$calendar = [System.Globalization.ChineseLunisolarCalendar]::new()
$calendarType = [System.Globalization.ChineseLunisolarCalendar]
$assembly = $calendarType.Assembly
$fileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($assembly.Location).FileVersion
$assemblyHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $assembly.Location).Hash.ToLowerInvariant()

$matched = [System.Collections.Generic.List[string]]::new()
$unsupported = [System.Collections.Generic.List[string]]::new()
$mismatches = [System.Collections.Generic.List[object]]::new()
$caseResults = [System.Collections.Generic.List[object]]::new()

foreach ($candidate in $fixture.cases) {
  $gregorian = [datetime]::ParseExact(
    [string]$candidate.expectedGregorianDate,
    "yyyy-MM-dd",
    [System.Globalization.CultureInfo]::InvariantCulture,
    [System.Globalization.DateTimeStyles]::None
  )

  if ($gregorian -lt $calendar.MinSupportedDateTime.Date -or $gregorian -gt $calendar.MaxSupportedDateTime.Date) {
    $unsupported.Add([string]$candidate.id)
    $caseResults.Add([ordered]@{
      caseId = [string]$candidate.id
      outcome = "unsupported"
      gregorianDate = [string]$candidate.expectedGregorianDate
      actualLunarDate = $null
      actualLunarLeapMonth = $null
    })
    continue
  }

  $lunarYear = $calendar.GetYear($gregorian)
  $insertedMonth = $calendar.GetMonth($gregorian)
  $lunarDay = $calendar.GetDayOfMonth($gregorian)
  $leapMonthIndex = $calendar.GetLeapMonth($lunarYear)
  $isLeapMonth = $leapMonthIndex -gt 0 -and $insertedMonth -eq $leapMonthIndex

  if ($leapMonthIndex -gt 0 -and $insertedMonth -ge $leapMonthIndex) {
    $lunarMonth = $insertedMonth - 1
  } else {
    $lunarMonth = $insertedMonth
  }

  $actualLunarDate = "{0:D4}-{1:D2}-{2:D2}" -f $lunarYear, $lunarMonth, $lunarDay
  $matches = $actualLunarDate -eq [string]$candidate.lunarDate -and
    $isLeapMonth -eq [bool]$candidate.lunarLeapMonth

  if ($matches) {
    $matched.Add([string]$candidate.id)
    $outcome = "matched"
  } else {
    $outcome = "mismatch"
    $expectedLeapLabel = if ([bool]$candidate.lunarLeapMonth) { "leap" } else { "regular" }
    $actualLeapLabel = if ($isLeapMonth) { "leap" } else { "regular" }
    $mismatches.Add([ordered]@{
      caseId = [string]$candidate.id
      expected = ("{0}|{1}" -f ([string]$candidate.lunarDate), $expectedLeapLabel)
      actual = ("{0}|{1}" -f $actualLunarDate, $actualLeapLabel)
    })
  }

  $caseResults.Add([ordered]@{
    caseId = [string]$candidate.id
    outcome = $outcome
    gregorianDate = [string]$candidate.expectedGregorianDate
    actualLunarDate = $actualLunarDate
    actualLunarLeapMonth = $isLeapMonth
  })
}

$frozenRun = @($fixture.independentCrossCheckRuns | Where-Object {
  $_.sourceId -eq "dotnet-framework-4-8-chinese-lunisolar"
})[0]
if ($null -eq $frozenRun) {
  throw "Fixture does not contain the expected frozen .NET cross-check run."
}
$sourceRecord = @($fixture.sources | Where-Object {
  $_.sourceId -eq "dotnet-framework-4-8-chinese-lunisolar"
})[0]
if ($null -eq $sourceRecord) {
  throw "Fixture does not contain the expected .NET source record."
}

$sameMatched = (@($matched | Sort-Object) -join "`n") -eq
  (@($frozenRun.matchedCaseIds | Sort-Object) -join "`n")
$sameUnsupported = (@($unsupported | Sort-Object) -join "`n") -eq
  (@($frozenRun.unsupportedCaseIds | Sort-Object) -join "`n")
$actualMismatchJson = @($mismatches | Sort-Object caseId) | ConvertTo-Json -Compress -Depth 5
$frozenMismatchJson = @($frozenRun.mismatches | Sort-Object caseId) | ConvertTo-Json -Compress -Depth 5
$runtimeArtifactMatched = $assemblyHash -eq ([string]$sourceRecord.artifactSha256).ToLowerInvariant()
$frozenRecordMatched = $runtimeArtifactMatched -and $sameMatched -and
  $sameUnsupported -and $actualMismatchJson -eq $frozenMismatchJson

$result = [ordered]@{
  datasetId = [string]$fixture.datasetId
  fixtureVersion = [string]$fixture.fixtureVersion
  sourceId = "dotnet-framework-4-8-chinese-lunisolar"
  runtime = [ordered]@{
    assemblyFullName = $assembly.FullName
    fileVersion = $fileVersion
    clrVersion = $assembly.ImageRuntimeVersion
    assemblySha256 = $assemblyHash
    minSupportedGregorianDate = $calendar.MinSupportedDateTime.ToString("yyyy-MM-dd")
    maxSupportedGregorianDate = $calendar.MaxSupportedDateTime.ToString("yyyy-MM-dd")
  }
  summary = [ordered]@{
    matched = $matched.Count
    unsupported = $unsupported.Count
    mismatches = $mismatches.Count
    runtimeArtifactMatched = $runtimeArtifactMatched
    frozenRecordMatched = $frozenRecordMatched
  }
  matchedCaseIds = @($matched)
  unsupportedCaseIds = @($unsupported)
  mismatches = @($mismatches)
  cases = @($caseResults)
}

$result | ConvertTo-Json -Depth 8
if (-not $frozenRecordMatched) {
  exit 2
}

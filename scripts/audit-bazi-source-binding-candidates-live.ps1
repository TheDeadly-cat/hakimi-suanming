$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDirectory
$selectorPath = Join-Path $scriptDirectory "resolve-bazi-current-source-binding.mjs"
$selectorOutput = @(& node $selectorPath)
if ($LASTEXITCODE -ne 0 -or $selectorOutput.Count -ne 1) {
  throw "Live Bazi source-binding candidate audit failed: canonical current selection unavailable."
}
$selection = $selectorOutput[0] | ConvertFrom-Json
if ([string]$selection.purpose -cne "bazi_source_binding" `
  -or [bool]$selection.currentAvailable -ne $true `
  -or [string]$selection.selection.familyKey -cne "content/bazi-strength-source-binding-candidates") {
  throw "Live Bazi source-binding candidate audit failed: canonical current selection shape drifted."
}
$ledgerPath = [string]$selection.artifact.absolutePath
if (-not (Test-Path -LiteralPath $ledgerPath -PathType Leaf)) {
  throw "Live Bazi source-binding candidate audit failed: selected ledger path is unavailable."
}
$ledger = Get-Content -LiteralPath $ledgerPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($ledger.accessBoundary.apiEndpoint -ne "https://zh.wikisource.org/w/api.php") {
  throw "Live Bazi source-binding candidate audit failed: unexpected API endpoint."
}
if ($ledger.facsimileAccessBoundary.apiEndpoints[0] -ne "https://commons.wikimedia.org/w/api.php" `
  -or $ledger.facsimileAccessBoundary.apiEndpoints[1] -ne "https://zh.wikisource.org/w/api.php") {
  throw "Live Bazi source-binding candidate audit failed: unexpected facsimile API endpoints."
}

function Get-Utf8Sha256([string]$value) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

$headers = @{ "User-Agent" = "HakimiSourceAudit/1.0 (read-only public revision verification)" }
$results = @()
$facsimileResults = @()
$pageRevisionResults = @()
$collationResults = @()

function New-ApiUri([string]$endpoint, [hashtable]$parameters) {
  $query = ($parameters.GetEnumerator() | ForEach-Object {
      [Uri]::EscapeDataString([string]$_.Key) + "=" + [Uri]::EscapeDataString([string]$_.Value)
    }) -join "&"
  return $endpoint + "?" + $query
}

function Invoke-PublicApi([string]$uri) {
  $delays = @(4, 12)
  for ($attempt = 1; $attempt -le 3; $attempt += 1) {
    try {
      return Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 45
    } catch {
      $rateLimited = [string]$_.Exception.Message -match "too many requests|rate.?limit|\b429\b"
      if (-not $rateLimited -or $attempt -eq 3) {
        throw
      }
      Start-Sleep -Seconds $delays[$attempt - 1]
    }
  }
}

$sourceRevisionIds = @($ledger.candidates | ForEach-Object {
    [string]$_.carrierIdentity.revisionId
})
$sourceRevisionUri = New-ApiUri $ledger.accessBoundary.apiEndpoint @{
  action = "query"
  format = "json"
  formatversion = "2"
  prop = "revisions"
  revids = [string]::Join("|", $sourceRevisionIds)
  rvprop = "ids|timestamp|sha1|contentmodel|content"
  rvslots = "main"
}
$sourceRevisionBatch = Invoke-PublicApi $sourceRevisionUri
$sourcePageByRevisionId = @{}
foreach ($page in @($sourceRevisionBatch.query.pages)) {
  foreach ($revision in @($page.revisions)) {
    $sourcePageByRevisionId[[string]$revision.revid] = $page
  }
}

$facsimileTitles = @($ledger.candidates.facsimileAnchors | ForEach-Object {
    [string]$_.carrierFileTitle
} | Sort-Object -Unique)
$facsimileUri = New-ApiUri $ledger.facsimileAccessBoundary.apiEndpoints[0] @{
  action = "query"
  format = "json"
  formatversion = "2"
  prop = "imageinfo"
  titles = [string]::Join("|", $facsimileTitles)
  iiprop = "timestamp|url|size|sha1|mime|mediatype|extmetadata"
}
$facsimileBatch = Invoke-PublicApi $facsimileUri
$filePageByTitle = @{}
foreach ($filePage in @($facsimileBatch.query.pages)) {
  $filePageByTitle[[string]$filePage.title] = $filePage
}

$pageRevisionIds = @($ledger.candidates.facsimileAnchors.pageRefs | Where-Object {
    $null -ne $_.pageRevisionId
  } | ForEach-Object {
    [string]$_.pageRevisionId
  } | Sort-Object -Unique)
$pageRevisionById = @{}
if ($pageRevisionIds.Count -gt 0) {
  $pageRevisionUri = New-ApiUri $ledger.facsimileAccessBoundary.apiEndpoints[1] @{
    action = "query"
    format = "json"
    formatversion = "2"
    prop = "revisions"
    revids = [string]::Join("|", $pageRevisionIds)
    rvprop = "ids|timestamp|sha1|content"
    rvslots = "main"
  }
  $pageRevisionBatch = Invoke-PublicApi $pageRevisionUri
  foreach ($page in @($pageRevisionBatch.query.pages)) {
    foreach ($revision in @($page.revisions)) {
      $pageRevisionById[[string]$revision.revid] = [pscustomobject]@{
        page = $page
        revision = $revision
      }
    }
  }
}

foreach ($candidate in $ledger.candidates) {
  $carrier = $candidate.carrierIdentity
  $revisionId = [int64]$carrier.revisionId
  $page = $sourcePageByRevisionId[[string]$revisionId]
  if ($null -eq $page) {
    throw "Live Bazi source-binding candidate audit failed: missing batched source revision $revisionId."
  }
  $revision = $page.revisions[0]
  $slot = $revision.slots.main
  $body = [string]$slot.content

  $metadataMatches = [int64]$page.pageid -eq [int64]$carrier.pageId `
    -and [string]$page.title -ceq [string]$carrier.pageTitle `
    -and [int64]$revision.revid -eq $revisionId `
    -and [int64]$revision.parentid -eq [int64]$carrier.parentRevisionId `
    -and ([DateTimeOffset]$revision.timestamp).ToUniversalTime() -eq ([DateTimeOffset]$carrier.revisionTimestamp).ToUniversalTime() `
    -and [string]$revision.sha1 -ceq [string]$carrier.mediaWikiSha1 `
    -and [string]$slot.contentmodel -ceq [string]$carrier.contentModel `
    -and [string]$slot.contentformat -ceq [string]$carrier.contentFormat
  if (-not $metadataMatches) {
    throw "Live Bazi source-binding candidate audit failed: $($candidate.candidateId) public revision metadata drifted."
  }

  $bodyBytes = [System.Text.Encoding]::UTF8.GetByteCount($body)
  if ($body.Length -ne [int]$carrier.rawWikitextCharacters `
    -or $bodyBytes -ne [int]$carrier.rawWikitextUtf8Bytes `
    -or (Get-Utf8Sha256 $body) -cne [string]$carrier.rawWikitextSha256) {
    throw "Live Bazi source-binding candidate audit failed: $($candidate.candidateId) public revision body drifted."
  }

  $quoteTextsById = @{}
  foreach ($quote in $candidate.quoteCandidates) {
    $start = [int]$quote.rawCharacterStartZeroBased
    $length = [int]$quote.rawCharacterEndExclusive - $start
    $quoteText = $body.Substring($start, $length)
    $firstOccurrence = $body.IndexOf($quoteText, [System.StringComparison]::Ordinal)
    $secondOccurrence = $body.IndexOf(
      $quoteText,
      $start + 1,
      [System.StringComparison]::Ordinal
    )
    if ($quoteText.Length -ne [int]$quote.quoteCharacters `
      -or [System.Text.Encoding]::UTF8.GetByteCount($quoteText) -ne [int]$quote.quoteUtf8Bytes `
      -or (Get-Utf8Sha256 $quoteText) -cne [string]$quote.quoteSha256 `
      -or $firstOccurrence -ne $start `
      -or $secondOccurrence -ne -1) {
      throw "Live Bazi source-binding candidate audit failed: $($candidate.candidateId)/$($quote.quoteCandidateId) quote locator or digest drifted."
    }
    $quoteTextsById[[string]$quote.quoteCandidateId] = $quoteText
  }

  $results += [ordered]@{
    candidateId = [string]$candidate.candidateId
    revisionId = $revisionId
    mediaWikiSha1 = [string]$carrier.mediaWikiSha1
    rawWikitextSha256 = [string]$carrier.rawWikitextSha256
    quoteHashCount = @($candidate.quoteCandidates).Count
    sourceBodyStored = $false
    quoteTextsStored = $false
  }

  foreach ($anchor in $candidate.facsimileAnchors) {
    $filePage = $filePageByTitle[[string]$anchor.carrierFileTitle]
    if ($null -eq $filePage) {
      throw "Live Bazi source-binding candidate audit failed: missing batched facsimile metadata for $($anchor.anchorId)."
    }
    $imageInfo = $filePage.imageinfo[0]
    $fileMatches = [int64]$filePage.pageid -eq [int64]$anchor.carrierFilePageId `
      -and [string]$filePage.title -ceq [string]$anchor.carrierFileTitle `
      -and ([DateTimeOffset]$imageInfo.timestamp).ToUniversalTime() -eq ([DateTimeOffset]$anchor.carrierFileTimestamp).ToUniversalTime() `
      -and [string]$imageInfo.sha1 -ceq [string]$anchor.carrierMediaWikiSha1 `
      -and [int64]$imageInfo.size -eq [int64]$anchor.carrierBytes `
      -and [int64]$imageInfo.pagecount -eq [int64]$anchor.carrierPageCount `
      -and [string]$imageInfo.mime -ceq [string]$anchor.carrierMime `
      -and [string]$imageInfo.extmetadata.LicenseShortName.value -ceq "Public domain" `
      -and [string]$imageInfo.extmetadata.UsageTerms.value -ceq "Public domain" `
      -and [string]$imageInfo.extmetadata.AttributionRequired.value -ceq "false"
    if (-not $fileMatches) {
      throw "Live Bazi source-binding candidate audit failed: $($anchor.anchorId) public facsimile carrier metadata drifted."
    }

    foreach ($pageRef in $anchor.pageRefs) {
      if ($null -eq $pageRef.pageRevisionId) {
        continue
      }
      $pageReceipt = $pageRevisionById[[string]$pageRef.pageRevisionId]
      if ($null -eq $pageReceipt) {
        throw "Live Bazi source-binding candidate audit failed: missing batched Page revision $($pageRef.pageRevisionId)."
      }
      $page = $pageReceipt.page
      $revision = $pageReceipt.revision
      $pageBody = [string]$revision.slots.main.content
      $qualityMatch = [regex]::Match($pageBody, '<pagequality\s+level="(?<level>\d+)"')
      $qualityLevel = if ($qualityMatch.Success) { [int]$qualityMatch.Groups['level'].Value } else { $null }
      $pageMatches = [int64]$page.pageid -eq [int64]$pageRef.pageId `
        -and [int64]$revision.revid -eq [int64]$pageRef.pageRevisionId `
        -and ([DateTimeOffset]$revision.timestamp).ToUniversalTime() -eq ([DateTimeOffset]$pageRef.pageRevisionTimestamp).ToUniversalTime() `
        -and [string]$revision.sha1 -ceq [string]$pageRef.pageMediaWikiSha1 `
        -and $qualityLevel -eq [int]$pageRef.pageTranscriptionQualityLevel `
        -and [string]$pageRef.pageTranscriptionQualityState -ceq "not_proofread"
      if (-not $pageMatches) {
        throw "Live Bazi source-binding candidate audit failed: $($pageRef.pageRefId) Page namespace revision metadata or transcription quality drifted."
      }
      $pageRevisionResults += [ordered]@{
        pageRefId = [string]$pageRef.pageRefId
        pageRevisionId = [int64]$pageRef.pageRevisionId
        pageMediaWikiSha1 = [string]$pageRef.pageMediaWikiSha1
        pageTranscriptionQualityLevel = $qualityLevel
        pageTranscriptionQualityState = "not_proofread"
      }
    }

    $facsimileResults += [ordered]@{
      candidateId = [string]$candidate.candidateId
      anchorId = [string]$anchor.anchorId
      carrierMediaWikiSha1 = [string]$anchor.carrierMediaWikiSha1
      carrierSha256 = [string]$anchor.carrierSha256
      carrierSha256Recomputed = $false
      pageRefCount = @($anchor.pageRefs).Count
      exactCollationStatus = [string]$anchor.exactCollationStatus
      repositoryCarrierFileStored = $false
      repositoryPageImagesStored = $false
    }
  }

  foreach ($collation in $candidate.facsimileCollationCandidates) {
    $anchor = @($candidate.facsimileAnchors | Where-Object {
      [string]$_.anchorId -ceq [string]$collation.anchorId
    })
    $pageRef = @($anchor[0].pageRefs | Where-Object {
      [string]$_.pageRefId -ceq [string]$collation.pageRefId
    })
    $quoteId = [string]$collation.quoteCandidateId
    if ($anchor.Count -ne 1 -or $pageRef.Count -ne 1 -or -not $quoteTextsById.ContainsKey($quoteId) `
      -or -not @($pageRef[0].quoteCandidateIds).Contains($quoteId) `
      -or [string]$anchor[0].carrierSha256 -cne [string]$collation.carrierSha256) {
      throw "Live Bazi source-binding candidate audit failed: $($collation.collationCandidateId) locator binding drifted."
    }
    $quoteText = [string]$quoteTextsById[$quoteId]
    $transcriptionGlyphSequence = $quoteText -replace '[\p{P}\p{Z}\s]', ''
    if ((Get-Utf8Sha256 $quoteText) -cne [string]$collation.transcriptionQuoteSha256 `
      -or (Get-Utf8Sha256 $transcriptionGlyphSequence) -cne [string]$collation.transcriptionGlyphSequenceSha256 `
      -or (Get-Utf8Sha256 $transcriptionGlyphSequence) -cne [string]$collation.normalizedSequenceSha256 `
      -or $transcriptionGlyphSequence.Length -ne [int]$collation.normalizedSequenceCharacters) {
      throw "Live Bazi source-binding candidate audit failed: $($collation.collationCandidateId) transcription normalization drifted."
    }
    $collationResults += [ordered]@{
      collationCandidateId = [string]$collation.collationCandidateId
      carrierSha256 = [string]$collation.carrierSha256
      carrierSha256Recomputed = $false
      transcriptionQuoteSha256 = [string]$collation.transcriptionQuoteSha256
      transcriptionGlyphSequenceSha256 = [string]$collation.transcriptionGlyphSequenceSha256
      normalizedSequenceSha256 = [string]$collation.normalizedSequenceSha256
      carrierGlyphSequenceSha256Recomputed = $false
      comparisonNormalization = [string]$collation.comparisonNormalization
      scriptVariantPairCount = [int]$collation.scriptVariantPairCount
      result = [string]$collation.result
      exactGlyphSequenceEqual = [bool]$collation.exactGlyphSequenceEqual
      bindingFreezeEffect = "none"
    }
  }
}

[ordered]@{
  ok = $true
  access = "public_read_only_unauthenticated"
  requestBatches = [ordered]@{
    sourceRevisions = 1
    facsimileCarriers = 1
    pageRevisions = if ($pageRevisionIds.Count -gt 0) { 1 } else { 0 }
  }
  ledgerDigest = [string]$ledger.ledgerDigest
  bindingFrozenVerified = [int]$ledger.gateSummary.bindingFrozenVerified
  normalizedFacsimileCollationCandidatesObserved = [int]$ledger.gateSummary.normalizedFacsimileCollationCandidatesObserved
  exactGlyphFacsimileCorrespondenceCandidatesObserved = [int]$ledger.gateSummary.exactGlyphFacsimileCorrespondenceCandidatesObserved
  results = $results
  facsimileResults = $facsimileResults
  pageRevisionResults = $pageRevisionResults
  collationResults = $collationResults
} | ConvertTo-Json -Depth 8

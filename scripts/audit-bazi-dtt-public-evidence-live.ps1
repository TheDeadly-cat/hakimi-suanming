$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDirectory
$sourceLedgerPath = Join-Path $workspaceRoot "content\bazi-strength-source-binding-candidates.v1.json"
$sourceLedger = Get-Content -LiteralPath $sourceLedgerPath -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 100 -DateKind String
$candidate = @($sourceLedger.candidates | Where-Object {
    [string]$_.candidateId -ceq "dtt-chanwei-wikisource-r2600158-candidate-v1"
  })
if ($candidate.Count -ne 1 `
  -or [string]$candidate[0].bindingId -cne "binding:dtt:month-command" `
  -or [string]$candidate[0].candidateDigest -cne "26182f43d801dedb7433e53d8e390efc32195ef08555199d933e36a1ed65ca61") {
  throw "Live DTT public-evidence audit failed: source candidate identity drifted."
}
$candidate = $candidate[0]

$headers = @{ "User-Agent" = "HakimiDttPublicEvidenceAudit/1.0 (public read-only; no credentials)" }
$temporaryFiles = [System.Collections.Generic.List[string]]::new()
$captureDirectory = $null

function New-ApiUri([string]$endpoint, [System.Collections.IDictionary]$parameters) {
  $query = ($parameters.GetEnumerator() | ForEach-Object {
      [Uri]::EscapeDataString([string]$_.Key) + "=" + [Uri]::EscapeDataString([string]$_.Value)
    }) -join "&"
  return $endpoint + "?" + $query
}

function Invoke-PublicWeb([string]$uri, [string]$outFile = "") {
  $parsed = [Uri]$uri
  if ($parsed.Scheme -cne "https" -or -not [string]::IsNullOrEmpty($parsed.UserInfo) `
    -or -not $parsed.IsDefaultPort) {
    throw "Live DTT public-evidence audit failed: unsafe public URL."
  }
  $allowedHosts = @("zh.wikisource.org", "commons.wikimedia.org", "upload.wikimedia.org")
  if (-not $allowedHosts.Contains($parsed.IdnHost.ToLowerInvariant())) {
    throw "Live DTT public-evidence audit failed: unexpected public host."
  }
  $delays = @(4, 12)
  for ($attempt = 1; $attempt -le 3; $attempt += 1) {
    try {
      if ([string]::IsNullOrEmpty($outFile)) {
        return Invoke-WebRequest -Uri $uri -Headers $headers -Method Get -MaximumRedirection 5 -TimeoutSec 90
      }
      return Invoke-WebRequest -Uri $uri -Headers $headers -Method Get -MaximumRedirection 5 -TimeoutSec 180 `
        -OutFile $outFile -PassThru
    } catch {
      $rateLimited = [string]$_.Exception.Message -match "too many requests|rate.?limit|\b429\b"
      if (-not $rateLimited -or $attempt -eq 3) { throw }
      Start-Sleep -Seconds $delays[$attempt - 1]
    }
  }
}

function Get-RawResponseBytes([object]$response) {
  $stream = $response.RawContentStream
  if ($null -eq $stream) {
    throw "Live DTT public-evidence audit failed: raw response stream unavailable."
  }
  if ($stream.CanSeek) { $stream.Position = 0 }
  $memory = [IO.MemoryStream]::new()
  try {
    $stream.CopyTo($memory)
    return $memory.ToArray()
  } finally {
    $memory.Dispose()
  }
}

function Get-BytesSha256([byte[]]$bytes) {
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return ([Convert]::ToHexString($algorithm.ComputeHash($bytes))).ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

function Get-Utf8Facts([string]$text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  return [ordered]@{
    characters = $text.Length
    utf8Bytes = $bytes.Length
    sha256 = Get-BytesSha256 $bytes
  }
}

function Get-HeaderValue([object]$response, [string]$name) {
  try {
    $values = $response.Headers[$name]
    if ($null -eq $values) { return $null }
    return [string]::Join(", ", @($values))
  } catch {
    return $null
  }
}

function Get-OccurrenceCount([string]$text, [string]$fragment) {
  $count = 0
  $offset = 0
  while ($offset -le $text.Length - $fragment.Length) {
    $found = $text.IndexOf($fragment, $offset, [StringComparison]::Ordinal)
    if ($found -lt 0) { break }
    $count += 1
    $offset = $found + 1
  }
  return $count
}

function Get-ResponseReceipt([object]$response, [string]$requestedUrl, [string]$startedAt, [string]$completedAt) {
  return [ordered]@{
    requestedUrl = $requestedUrl
    finalResponseUrl = $response.BaseResponse.RequestMessage.RequestUri.AbsoluteUri
    requestStartedAt = $startedAt
    requestCompletedAt = $completedAt
    httpStatus = [int]$response.StatusCode
    contentType = Get-HeaderValue $response "Content-Type"
    contentLength = Get-HeaderValue $response "Content-Length"
    contentEncoding = Get-HeaderValue $response "Content-Encoding"
    etag = Get-HeaderValue $response "ETag"
    lastModified = Get-HeaderValue $response "Last-Modified"
  }
}

function Assert-TemporaryPath([string]$path, [string]$directory) {
  $resolvedDirectory = [IO.Path]::GetFullPath($directory).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $prefix = $resolvedDirectory + [IO.Path]::DirectorySeparatorChar
  $resolvedPath = [IO.Path]::GetFullPath($path)
  if (-not $resolvedPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Live DTT public-evidence audit failed: unsafe temporary path."
  }
  return $resolvedPath
}

try {
  $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $captureDirectory = [IO.Path]::GetFullPath((Join-Path $tempRoot (
        "hakimi-dtt-public-evidence-" + [Guid]::NewGuid().ToString("N")
      )))
  $tempPrefix = $tempRoot + [IO.Path]::DirectorySeparatorChar
  if (-not $captureDirectory.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Live DTT public-evidence audit failed: unsafe temporary directory."
  }
  [IO.Directory]::CreateDirectory($captureDirectory) | Out-Null

  $captureStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

  $revisionUri = New-ApiUri "https://zh.wikisource.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "revisions"
      revids = [string]$candidate.carrierIdentity.revisionId
      rvprop = "ids|timestamp|sha1|contentmodel|content"
      rvslots = "main"
    })
  $revisionStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $revisionResponse = Invoke-PublicWeb $revisionUri
  $revisionCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $revisionBytes = Get-RawResponseBytes $revisionResponse
  $revisionPayload = [Text.Encoding]::UTF8.GetString($revisionBytes) | ConvertFrom-Json -Depth 100 -DateKind String
  $revisionPage = $revisionPayload.query.pages[0]
  $revision = $revisionPage.revisions[0]
  $slot = $revision.slots.main
  $body = [string]$slot.content
  $bodyFacts = Get-Utf8Facts $body
  $carrier = $candidate.carrierIdentity
  if ([int64]$revisionPage.pageid -ne [int64]$carrier.pageId `
    -or [int64]$revision.revid -ne [int64]$carrier.revisionId `
    -or [int64]$revision.parentid -ne [int64]$carrier.parentRevisionId `
    -or [string]$revision.timestamp -cne [string]$carrier.revisionTimestamp `
    -or [string]$revision.sha1 -cne [string]$carrier.mediaWikiSha1 `
    -or [string]$slot.contentmodel -cne [string]$carrier.contentModel `
    -or [string]$slot.contentformat -cne [string]$carrier.contentFormat `
    -or [int]$bodyFacts.characters -ne [int]$carrier.rawWikitextCharacters `
    -or [int]$bodyFacts.utf8Bytes -ne [int]$carrier.rawWikitextUtf8Bytes `
    -or [string]$bodyFacts.sha256 -cne [string]$carrier.rawWikitextSha256) {
    throw "Live DTT public-evidence audit failed: pinned Wikisource revision drifted."
  }
  $quoteResults = @()
  foreach ($quote in @($candidate.quoteCandidates)) {
    $start = [int]$quote.rawCharacterStartZeroBased
    $length = [int]$quote.rawCharacterEndExclusive - $start
    $fragment = $body.Substring($start, $length)
    $fragmentFacts = Get-Utf8Facts $fragment
    $occurrences = Get-OccurrenceCount $body $fragment
    if ([int]$fragmentFacts.characters -ne [int]$quote.quoteCharacters `
      -or [int]$fragmentFacts.utf8Bytes -ne [int]$quote.quoteUtf8Bytes `
      -or [string]$fragmentFacts.sha256 -cne [string]$quote.quoteSha256 `
      -or $occurrences -ne 1) {
      throw "Live DTT public-evidence audit failed: pinned quote locator drifted."
    }
    $quoteResults += [ordered]@{
      quoteCandidateId = [string]$quote.quoteCandidateId
      rawCharacterStartZeroBased = $start
      rawCharacterEndExclusive = [int]$quote.rawCharacterEndExclusive
      quoteCharacters = [int]$fragmentFacts.characters
      quoteUtf8Bytes = [int]$fragmentFacts.utf8Bytes
      quoteSha256 = [string]$fragmentFacts.sha256
      occurrenceCount = $occurrences
      quoteTextStored = $false
    }
  }
  $sourceLiteralPdOldTemplateToken = [regex]::IsMatch($body, "\{\{\s*PD-old(?:\||\}\})", "IgnoreCase")
  if ($sourceLiteralPdOldTemplateToken) {
    throw "Live DTT public-evidence audit failed: pinned oldid unexpectedly contains a literal PD-old token."
  }

  $templateParseUri = New-ApiUri "https://zh.wikisource.org/w/api.php" ([ordered]@{
      action = "parse"
      format = "json"
      formatversion = "2"
      oldid = [string]$carrier.revisionId
      prop = "templates"
    })
  $templateParseStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $templateParseResponse = Invoke-PublicWeb $templateParseUri
  $templateParseCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $templateParseBytes = Get-RawResponseBytes $templateParseResponse
  $templateParsePayload = [Text.Encoding]::UTF8.GetString($templateParseBytes) `
    | ConvertFrom-Json -Depth 100 -DateKind String
  $renderedTemplateTitles = @($templateParsePayload.parse.templates | ForEach-Object { [string]$_.title })
  $requiredRenderedTemplates = @("Template:清朝作品", "Template:PD-old", "Template:License")
  if (@($requiredRenderedTemplates | Where-Object { -not $renderedTemplateTitles.Contains($_) }).Count -ne 0) {
    throw "Live DTT public-evidence audit failed: rendered template dependency observation drifted."
  }

  $dependencyRevisionUri = New-ApiUri "https://zh.wikisource.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "revisions"
      revids = "2636660|2636674|2319541"
      rvprop = "ids|timestamp|sha1|content"
      rvslots = "main"
    })
  $dependencyStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $dependencyResponse = Invoke-PublicWeb $dependencyRevisionUri
  $dependencyCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $dependencyBytes = Get-RawResponseBytes $dependencyResponse
  $dependencyPayload = [Text.Encoding]::UTF8.GetString($dependencyBytes) `
    | ConvertFrom-Json -Depth 100 -DateKind String
  $dependencyLocks = @{
    "Template:License" = [ordered]@{
      pageId = 7980; revisionId = 2319541; parentRevisionId = 2319540
      timestamp = "2023-10-11T02:02:11Z"; mediaWikiSha1 = "f305bdff00d9a651947405734114571cae449c05"
      mainCharacters = 67; mainUtf8Bytes = 67; mainSha256 = "098ae242ed74142f59b2f167e6e2e7f692eba1ccc8e815cdc4a64f1c0d046ab2"
    }
    "Template:PD-old" = [ordered]@{
      pageId = 9559; revisionId = 2636674; parentRevisionId = 2636461
      timestamp = "2025-12-27T10:41:21Z"; mediaWikiSha1 = "c2c6e6c001f87a344f0a326a547342a5e640b477"
      mainCharacters = 558; mainUtf8Bytes = 760; mainSha256 = "6511e0973086c81d1a0b44d174e97c9c4d9ef9d647685d6f7e091d3215b8bbf2"
    }
    "Template:清朝作品" = [ordered]@{
      pageId = 183977; revisionId = 2636660; parentRevisionId = 2456276
      timestamp = "2025-12-27T10:26:34Z"; mediaWikiSha1 = "93659245fc7282b3273f8b4741053c7e38591c32"
      mainCharacters = 97; mainUtf8Bytes = 135; mainSha256 = "d35b76fbe13cd68917a1b1287b56d09d30e3fd8ad4dbd1c1587261f6bce96eaa"
    }
  }
  $dependencyResults = @()
  foreach ($dependencyPage in @($dependencyPayload.query.pages | Sort-Object title)) {
    $dependencyLock = $dependencyLocks[[string]$dependencyPage.title]
    if ($null -eq $dependencyLock) {
      throw "Live DTT public-evidence audit failed: unexpected rendered template dependency."
    }
    $dependencyRevision = $dependencyPage.revisions[0]
    $dependencyText = [string]$dependencyRevision.slots.main.content
    $dependencyFacts = Get-Utf8Facts $dependencyText
    if ([int64]$dependencyPage.pageid -ne [int64]$dependencyLock.pageId `
      -or [int64]$dependencyRevision.revid -ne [int64]$dependencyLock.revisionId `
      -or [int64]$dependencyRevision.parentid -ne [int64]$dependencyLock.parentRevisionId `
      -or [string]$dependencyRevision.timestamp -cne [string]$dependencyLock.timestamp `
      -or [string]$dependencyRevision.sha1 -cne [string]$dependencyLock.mediaWikiSha1 `
      -or [int]$dependencyFacts.characters -ne [int]$dependencyLock.mainCharacters `
      -or [int]$dependencyFacts.utf8Bytes -ne [int]$dependencyLock.mainUtf8Bytes `
      -or [string]$dependencyFacts.sha256 -cne [string]$dependencyLock.mainSha256) {
      throw "Live DTT public-evidence audit failed: rendered template dependency revision drifted."
    }
    $dependencyResults += [ordered]@{
      title = [string]$dependencyPage.title
      pageId = [int64]$dependencyPage.pageid
      revisionId = [int64]$dependencyRevision.revid
      parentRevisionId = [int64]$dependencyRevision.parentid
      timestamp = [string]$dependencyRevision.timestamp
      mediaWikiSha1 = [string]$dependencyRevision.sha1
      mainCharacters = [int]$dependencyFacts.characters
      mainUtf8Bytes = [int]$dependencyFacts.utf8Bytes
      mainSha256 = [string]$dependencyFacts.sha256
      bodyStored = $false
    }
  }

  $facsimileTitles = @($candidate.facsimileAnchors | ForEach-Object { [string]$_.carrierFileTitle })
  $commonsUri = New-ApiUri "https://commons.wikimedia.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "info|imageinfo"
      inprop = "url"
      titles = [string]::Join("|", $facsimileTitles)
      iiprop = "timestamp|user|userid|size|sha1|mime|mediatype|extmetadata|url"
    })
  $commonsStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $commonsResponse = Invoke-PublicWeb $commonsUri
  $commonsCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $commonsBytes = Get-RawResponseBytes $commonsResponse
  $commonsPayload = [Text.Encoding]::UTF8.GetString($commonsBytes) | ConvertFrom-Json -Depth 100 -DateKind String
  $commonsByTitle = @{}
  foreach ($filePage in @($commonsPayload.query.pages)) {
    $commonsByTitle[[string]$filePage.title] = $filePage
  }

  $filePageRevisionUri = New-ApiUri "https://commons.wikimedia.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "revisions"
      revids = "708090379|1104458375"
      rvprop = "ids|timestamp|sha1|content"
      rvslots = "main"
    })
  $filePageStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $filePageResponse = Invoke-PublicWeb $filePageRevisionUri
  $filePageCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $filePageBytes = Get-RawResponseBytes $filePageResponse
  $filePagePayload = [Text.Encoding]::UTF8.GetString($filePageBytes) | ConvertFrom-Json -Depth 100 -DateKind String
  $filePageRevisionById = @{}
  foreach ($filePage in @($filePagePayload.query.pages)) {
    foreach ($filePageRevision in @($filePage.revisions)) {
      $filePageRevisionById[[string]$filePageRevision.revid] = [pscustomobject]@{
        page = $filePage
        revision = $filePageRevision
      }
    }
  }

  $expectedFilePageRevisions = @{
    "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1" = [ordered]@{
      revisionId = 708090379
      notice = "pd_scan_top_level_observed"
      topLevelPattern = "(?m)^\s*\{\{PD-scan(?:\||\}\})"
    }
    "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1" = [ordered]@{
      revisionId = 1104458375
      notice = "pd_old_top_level_observed_without_pd_scan_template"
      topLevelPattern = "(?m)^\s*\{\{PD-old(?:\||\}\})"
    }
  }
  $carrierResults = @()
  foreach ($anchor in @($candidate.facsimileAnchors)) {
    $filePage = $commonsByTitle[[string]$anchor.carrierFileTitle]
    if ($null -eq $filePage) {
      throw "Live DTT public-evidence audit failed: Commons file page missing."
    }
    $imageInfo = $filePage.imageinfo[0]
    $expectedRevision = $expectedFilePageRevisions[[string]$anchor.anchorId]
    $fixedFilePage = $filePageRevisionById[[string]$expectedRevision.revisionId]
    if ($null -eq $fixedFilePage) {
      throw "Live DTT public-evidence audit failed: fixed Commons file-page revision missing."
    }
    $filePageText = [string]$fixedFilePage.revision.slots.main.content
    $filePageTextFacts = Get-Utf8Facts $filePageText
    $pdScanOccurrences = [regex]::Matches($filePageText, "\{\{\s*PD-scan(?:\||\}\})", "IgnoreCase").Count
    $pdOldOccurrences = [regex]::Matches($filePageText, "\{\{\s*PD-old(?:\||\}\})", "IgnoreCase").Count
    $topLevelNoticeMatches = [regex]::IsMatch($filePageText, [string]$expectedRevision.topLevelPattern, "IgnoreCase")
    $noticeShapeMatches = if ([string]$anchor.anchorId -like "*cadal*") {
      $pdOldOccurrences -ge 1 -and $pdScanOccurrences -eq 0
    } else {
      $pdScanOccurrences -ge 1
    }
    if (-not $topLevelNoticeMatches -or -not $noticeShapeMatches `
      -or [int64]$fixedFilePage.page.pageid -ne [int64]$anchor.carrierFilePageId `
      -or [string]$fixedFilePage.page.title -cne [string]$anchor.carrierFileTitle `
      -or [int64]$filePage.pageid -ne [int64]$anchor.carrierFilePageId `
      -or [string]$imageInfo.timestamp -cne [string]$anchor.carrierFileTimestamp `
      -or [string]$imageInfo.sha1 -cne [string]$anchor.carrierMediaWikiSha1 `
      -or [int64]$imageInfo.size -ne [int64]$anchor.carrierBytes `
      -or [string]$imageInfo.mime -cne [string]$anchor.carrierMime) {
      throw "Live DTT public-evidence audit failed: Commons carrier metadata or file-page notice drifted."
    }

    $apiReturnedFileUri = [Uri]([string]$imageInfo.url)
    $directFileUriBuilder = [UriBuilder]::new($apiReturnedFileUri)
    $directFileUriBuilder.Query = ""
    $directFileUriBuilder.Fragment = ""
    $directFileUri = $directFileUriBuilder.Uri.AbsoluteUri
    $suffix = if ([string]$anchor.carrierMime -ceq "application/pdf") { ".pdf" } else { ".djvu" }
    $temporaryPath = Assert-TemporaryPath (Join-Path $captureDirectory (([Guid]::NewGuid().ToString("N")) + $suffix)) $captureDirectory
    $temporaryFiles.Add($temporaryPath)
    $downloadStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $downloadResponse = Invoke-PublicWeb $directFileUri $temporaryPath
    $downloadCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $downloadedFile = [IO.FileInfo]::new($temporaryPath)
    $downloadedSha256 = (Get-FileHash -LiteralPath $temporaryPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($downloadedFile.Length -ne [int64]$anchor.carrierBytes `
      -or $downloadedSha256 -cne [string]$anchor.carrierSha256) {
      throw "Live DTT public-evidence audit failed: downloaded carrier bytes drifted."
    }
    $downloadReceipt = Get-ResponseReceipt $downloadResponse $directFileUri $downloadStartedAt $downloadCompletedAt
    $carrierResults += [ordered]@{
      anchorId = [string]$anchor.anchorId
      carrierFilePageId = [int64]$filePage.pageid
      carrierFileTitle = [string]$filePage.title
      currentFilePageRevisionId = [int64]$filePage.lastrevid
      fixedFilePageRevisionId = [int64]$fixedFilePage.revision.revid
      fixedFilePageRevisionTimestamp = [string]$fixedFilePage.revision.timestamp
      fixedFilePageMediaWikiSha1 = [string]$fixedFilePage.revision.sha1
      fixedFilePageWikitextCharacters = [int]$filePageTextFacts.characters
      fixedFilePageWikitextUtf8Bytes = [int]$filePageTextFacts.utf8Bytes
      fixedFilePageWikitextSha256 = [string]$filePageTextFacts.sha256
      pdScanTemplateOccurrences = $pdScanOccurrences
      pdOldTemplateOccurrences = $pdOldOccurrences
      topLevelNoticeObservation = [string]$expectedRevision.notice
      parentNoticeProjectionReestablished = if ([string]$anchor.anchorId -like "*cadal*") { $false } else { $true }
      imageInfoTimestamp = [string]$imageInfo.timestamp
      imageInfoUploader = [string]$imageInfo.user
      imageInfoUploaderId = [int64]$imageInfo.userid
      imageInfoMediaWikiSha1 = [string]$imageInfo.sha1
      imageInfoBytes = [int64]$imageInfo.size
      imageInfoMime = [string]$imageInfo.mime
      imageInfoMediaType = [string]$imageInfo.mediatype
      apiReturnedTrackingQueryRemovedBeforeDownload = -not [string]::IsNullOrEmpty($apiReturnedFileUri.Query)
      downloadedBytes = [int64]$downloadedFile.Length
      downloadedSha256 = $downloadedSha256
      sha256MatchesParent = $true
      downloadReceipt = $downloadReceipt
      repositoryCarrierFileStored = $false
    }
  }
  $captureCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

  [ordered]@{
    captureClass = "operator_executed_public_unauthenticated_transient_carrier_hash_observation"
    captureStartedAt = $captureStartedAt
    captureCompletedAt = $captureCompletedAt
    credentialsUsed = $false
    loginOrProtectedBackendUsed = $false
    sourceCandidateId = [string]$candidate.candidateId
    sourceCandidateDigest = [string]$candidate.candidateDigest
    wikisource = [ordered]@{
      response = Get-ResponseReceipt $revisionResponse $revisionUri $revisionStartedAt $revisionCompletedAt
      decodedApiBodyBytes = $revisionBytes.Length
      decodedApiBodySha256 = Get-BytesSha256 $revisionBytes
      pageId = [int64]$revisionPage.pageid
      revisionId = [int64]$revision.revid
      parentRevisionId = [int64]$revision.parentid
      timestamp = [string]$revision.timestamp
      mediaWikiSha1 = [string]$revision.sha1
      rawWikitextCharacters = [int]$bodyFacts.characters
      rawWikitextUtf8Bytes = [int]$bodyFacts.utf8Bytes
      rawWikitextSha256 = [string]$bodyFacts.sha256
      quotes = $quoteResults
      sourceLiteralPdOldTemplateToken = $sourceLiteralPdOldTemplateToken
      renderedTemplateDependencyObservation = [ordered]@{
        parseResponse = Get-ResponseReceipt $templateParseResponse $templateParseUri $templateParseStartedAt $templateParseCompletedAt
        parseDecodedApiBodyBytes = $templateParseBytes.Length
        parseDecodedApiBodySha256 = Get-BytesSha256 $templateParseBytes
        requiredRenderedTemplateTitles = $requiredRenderedTemplates
        renderedDependencyPdOldObserved = $true
        dependencyRevisionResponse = Get-ResponseReceipt $dependencyResponse $dependencyRevisionUri $dependencyStartedAt $dependencyCompletedAt
        dependencyDecodedApiBodyBytes = $dependencyBytes.Length
        dependencyDecodedApiBodySha256 = Get-BytesSha256 $dependencyBytes
        dependencyRevisions = $dependencyResults
        dependencyRevisionsPinnedAtCapture = $true
        oldidAlonePinsRenderedNotice = $false
      }
      responseBodyStored = $false
      sourceBodyStored = $false
    }
    commons = [ordered]@{
      imageInfoResponse = Get-ResponseReceipt $commonsResponse $commonsUri $commonsStartedAt $commonsCompletedAt
      imageInfoDecodedApiBodyBytes = $commonsBytes.Length
      imageInfoDecodedApiBodySha256 = Get-BytesSha256 $commonsBytes
      filePageRevisionResponse = Get-ResponseReceipt $filePageResponse $filePageRevisionUri $filePageStartedAt $filePageCompletedAt
      filePageRevisionDecodedApiBodyBytes = $filePageBytes.Length
      filePageRevisionDecodedApiBodySha256 = Get-BytesSha256 $filePageBytes
      sharedHostingAndUploaderUpstreamCount = 1
      distinctCarrierByteIdentities = 2
      carriers = $carrierResults
      responseBodiesStored = 0
      carrierFilesStored = 0
    }
    noticeDiscrepancy = [ordered]@{
      affectedAnchorId = "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1"
      parentNoticeProjectionReestablished = $false
      discrepancyState = "parent_not_mutated_reconciliation_required"
      rightsEffect = "none"
      bindingFreezeEffect = "none"
    }
    temporaryCarrierFilesDeletedAfterHashing = $true
  } | ConvertTo-Json -Depth 100
} finally {
  if ($null -ne $captureDirectory) {
    foreach ($temporaryFile in $temporaryFiles) {
      $resolvedTemporaryFile = Assert-TemporaryPath $temporaryFile $captureDirectory
      if ([IO.File]::Exists($resolvedTemporaryFile)) {
        [IO.File]::Delete($resolvedTemporaryFile)
      }
    }
    $resolvedCaptureDirectory = [IO.Path]::GetFullPath($captureDirectory)
    $resolvedTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $resolvedTempPrefix = $resolvedTempRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedCaptureDirectory.StartsWith($resolvedTempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Live DTT public-evidence audit failed: unsafe cleanup directory."
    }
    if ([IO.Directory]::Exists($resolvedCaptureDirectory)) {
      if ([IO.Directory]::EnumerateFileSystemEntries($resolvedCaptureDirectory).GetEnumerator().MoveNext()) {
        throw "Live DTT public-evidence audit failed: temporary directory was not empty after exact-file cleanup."
      }
      [IO.Directory]::Delete($resolvedCaptureDirectory, $false)
    }
  }
}

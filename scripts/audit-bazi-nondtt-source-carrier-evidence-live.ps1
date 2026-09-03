param(
  [ValidateSet("required", "metadata_only")]
  [string]$CarrierByteVerificationMode = "required"
)

$CarrierByteVerificationMode = $CarrierByteVerificationMode.ToLowerInvariant()
$rawByteVerificationRequired = $CarrierByteVerificationMode -eq "required"
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDirectory
$sourcePath = Join-Path $workspaceRoot "content\bazi-strength-source-binding-candidates.v1.6.0.json"
$rightsPath = Join-Path $workspaceRoot "content\bazi-strength-source-rights-candidates.v1.2.0.json"
$carrierReadinessPath = Join-Path $workspaceRoot "content\system-admission\bazi-source-carrier-record-readiness.v1.json"

$expectedArtifacts = [ordered]@{
  source = [ordered]@{
    bytes = 50427
    sha256 = "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98"
    ledgerId = "hakimi.bazi.strength.source-binding-candidates/1.6.0"
    ledgerDigest = "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
  }
  rights = [ordered]@{
    bytes = 23947
    sha256 = "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a"
    ledgerId = "hakimi.bazi.strength.source-rights-candidates/1.2.0"
    ledgerDigest = "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc"
  }
  carrierReadiness = [ordered]@{
    bytes = 27322
    sha256 = "d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9"
    ledgerId = "hakimi.bazi.source-carrier-record-readiness/1.0.0"
    ledgerDigest = "7b34f976c58b541895747177a2326af82241d76432acba3dbbd8fac2b68ad3c5"
  }
}

$expectedCandidateOrder = @(
  "smt-siku-v10-wikisource-r761703-candidate-v1",
  "smt-v5-wikisource-r2706483-candidate-v1",
  "yhzp-wikisource-r2593607-candidate-v1"
)

$headers = @{ "User-Agent" = "HakimiBaziCarrierEvidenceAudit/1.0 (public read-only; no credentials)" }
$allowedApiHosts = @("zh.wikisource.org", "commons.wikimedia.org")
$allowedDownloadHosts = @("upload.wikimedia.org")
$temporaryFiles = [System.Collections.Generic.List[string]]::new()
$captureDirectory = $null
$script:lastPublicRequestCompletedAt = [DateTimeOffset]::MinValue

function Wait-ForPublicRequestPacing([int]$minimumMilliseconds) {
  $elapsed = ([DateTimeOffset]::UtcNow - $script:lastPublicRequestCompletedAt).TotalMilliseconds
  if ($elapsed -lt $minimumMilliseconds) {
    Start-Sleep -Milliseconds ([int][Math]::Ceiling($minimumMilliseconds - $elapsed))
  }
}

function Get-BytesSha256([byte[]]$bytes) {
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
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

function Read-PinnedJson([string]$path, [int64]$expectedBytes, [string]$expectedSha256) {
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -ne $expectedBytes -or (Get-BytesSha256 $bytes) -cne $expectedSha256) {
    throw "Live non-DTT source/carrier audit failed: pinned local artifact identity drifted: $path"
  }
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xef -and $bytes[1] -eq 0xbb -and $bytes[2] -eq 0xbf) {
    throw "Live non-DTT source/carrier audit failed: BOM is forbidden in pinned JSON: $path"
  }
  $strictUtf8 = [Text.UTF8Encoding]::new($false, $true)
  $text = $strictUtf8.GetString($bytes)
  return $text | ConvertFrom-Json
}

function Assert-Single([object[]]$values, [string]$label) {
  $items = @($values)
  if ($items.Count -ne 1) {
    throw "Live non-DTT source/carrier audit failed: expected exactly one $label, got $($items.Count)."
  }
  return $items[0]
}

function New-ApiUri([string]$endpoint, [System.Collections.IDictionary]$parameters) {
  $query = ($parameters.GetEnumerator() | ForEach-Object {
      [Uri]::EscapeDataString([string]$_.Key) + "=" + [Uri]::EscapeDataString([string]$_.Value)
    }) -join "&"
  return $endpoint + "?" + $query
}

function Assert-PublicUrl([string]$url, [string[]]$allowedHosts, [string]$label) {
  $parsed = [Uri]$url
  if ($parsed.Scheme -cne "https" -or -not [string]::IsNullOrEmpty($parsed.UserInfo) `
    -or -not $parsed.IsDefaultPort -or -not $allowedHosts.Contains($parsed.IdnHost.ToLowerInvariant())) {
    throw "Live non-DTT source/carrier audit failed: unsafe $label URL."
  }
  return $parsed
}

function Get-RawResponseBytes([object]$response) {
  $stream = $response.RawContentStream
  if ($null -eq $stream) {
    throw "Live non-DTT source/carrier audit failed: raw response stream unavailable."
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

function Get-HeaderCollectionValue([object]$headerCollection, [string]$name) {
  if ($null -eq $headerCollection) { return $null }
  try {
    if ($null -ne $headerCollection.PSObject.Methods["GetValues"]) {
      $values = @($headerCollection.GetValues($name))
      if ($values.Count -gt 0) {
        return [string]::Join(", ", $values)
      }
    }
  } catch {
    # Missing headers can throw on HttpResponseHeaders; try legacy collections next.
  }
  try {
    $value = $headerCollection[$name]
    if ($null -eq $value) { return $null }
    return [string]::Join(", ", @($value))
  } catch {
    return $null
  }
}

function Get-HeaderValue([object]$response, [string]$name) {
  $headersProperty = $response.PSObject.Properties["Headers"]
  if ($null -eq $headersProperty) { return $null }
  return Get-HeaderCollectionValue $headersProperty.Value $name
}

function Get-FinalResponseUrl([object]$response) {
  $baseResponseProperty = $response.PSObject.Properties["BaseResponse"]
  if ($null -eq $baseResponseProperty) { return $null }
  $baseResponse = $baseResponseProperty.Value
  if ($null -ne $baseResponse `
    -and $null -ne $baseResponse.PSObject.Properties["RequestMessage"] `
    -and $null -ne $baseResponse.RequestMessage `
    -and $null -ne $baseResponse.RequestMessage.RequestUri) {
    return $baseResponse.RequestMessage.RequestUri.AbsoluteUri
  }
  if ($null -ne $baseResponse `
    -and $null -ne $baseResponse.PSObject.Properties["ResponseUri"] `
    -and $null -ne $baseResponse.ResponseUri) {
    return $baseResponse.ResponseUri.AbsoluteUri
  }
  return $null
}

function Get-HttpErrorResponse([object]$errorRecord) {
  if ($null -eq $errorRecord -or $null -eq $errorRecord.Exception) { return $null }
  $responseProperty = $errorRecord.Exception.PSObject.Properties["Response"]
  if ($null -ne $responseProperty -and $null -ne $responseProperty.Value) {
    return $responseProperty.Value
  }
  return $null
}

function Get-HttpErrorStatusCode([object]$errorRecord) {
  $response = Get-HttpErrorResponse $errorRecord
  if ($null -eq $response) { return $null }
  $statusProperty = $response.PSObject.Properties["StatusCode"]
  if ($null -eq $statusProperty -or $null -eq $statusProperty.Value) { return $null }
  try {
    return [int]$statusProperty.Value
  } catch {
    return $null
  }
}

function Get-HttpErrorHeader([object]$errorRecord, [string]$name) {
  $response = Get-HttpErrorResponse $errorRecord
  if ($null -eq $response) { return $null }
  $headersProperty = $response.PSObject.Properties["Headers"]
  if ($null -eq $headersProperty -or $null -eq $headersProperty.Value) { return $null }
  return Get-HeaderCollectionValue $headersProperty.Value $name
}

function Get-PublicRetryDelaySeconds(
  [object]$errorRecord,
  [int]$fallbackSeconds,
  [int]$maximumSeconds
) {
  $retryAfter = Get-HttpErrorHeader $errorRecord "Retry-After"
  if ([string]::IsNullOrWhiteSpace($retryAfter)) { return $fallbackSeconds }
  [int64]$numericSeconds = 0
  if ([int64]::TryParse($retryAfter, [ref]$numericSeconds)) {
    if ($numericSeconds -lt 0) { return $fallbackSeconds }
    if ($numericSeconds -gt $maximumSeconds) { return -1 }
    return $numericSeconds
  }
  $retryAt = [DateTimeOffset]::MinValue
  if ([DateTimeOffset]::TryParse(
      $retryAfter,
      [Globalization.CultureInfo]::InvariantCulture,
      [Globalization.DateTimeStyles]::AssumeUniversal,
      [ref]$retryAt
    )) {
    $seconds = [int][Math]::Ceiling(($retryAt.ToUniversalTime() - [DateTimeOffset]::UtcNow).TotalSeconds)
    if ($seconds -lt 0) { return 0 }
    if ($seconds -gt $maximumSeconds) { return -1 }
    return $seconds
  }
  return $fallbackSeconds
}

function Test-RetryablePublicRequestError([object]$errorRecord, [object]$statusCode) {
  if ($null -ne $statusCode) {
    return @(408, 429, 500, 502, 503, 504).Contains([int]$statusCode)
  }
  return [string]$errorRecord.Exception.Message -match (
    "timed out|timeout|connection (?:was )?(?:closed|reset|aborted)|temporar(?:y|ily) unavailable|" +
    "too many requests|rate.?limit|\b429\b"
  )
}

function Get-ExtMetadataValue([object]$extMetadata, [string]$name) {
  if ($null -eq $extMetadata) { return "" }
  $property = $extMetadata.PSObject.Properties[$name]
  if ($null -eq $property -or $null -eq $property.Value) { return "" }
  $valueProperty = $property.Value.PSObject.Properties["value"]
  if ($null -eq $valueProperty -or $null -eq $valueProperty.Value) { return "" }
  return [string]$valueProperty.Value
}

function Get-ResponseReceipt(
  [object]$response,
  [string]$requestedUrl,
  [string]$startedAt,
  [string]$completedAt,
  [byte[]]$bodyBytes
) {
  return [ordered]@{
    requestedUrl = $requestedUrl
    finalResponseUrl = Get-FinalResponseUrl $response
    requestStartedAt = $startedAt
    requestCompletedAt = $completedAt
    httpStatus = [int]$response.StatusCode
    contentType = Get-HeaderValue $response "Content-Type"
    contentLength = Get-HeaderValue $response "Content-Length"
    contentEncoding = Get-HeaderValue $response "Content-Encoding"
    etag = Get-HeaderValue $response "ETag"
    lastModified = Get-HeaderValue $response "Last-Modified"
    deliveredBodyBytes = $bodyBytes.Length
    deliveredBodySha256 = Get-BytesSha256 $bodyBytes
  }
}

function Invoke-PublicApi([string]$uri) {
  Assert-PublicUrl $uri $allowedApiHosts "API" | Out-Null
  $delays = @(4, 12)
  for ($attempt = 1; $attempt -le 3; $attempt += 1) {
    try {
      Wait-ForPublicRequestPacing 1800
      $startedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers $headers -Method Get -MaximumRedirection 0 -TimeoutSec 60
      $completedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      $script:lastPublicRequestCompletedAt = [DateTimeOffset]::UtcNow
      $finalUri = Get-FinalResponseUrl $response
      if ([string]::IsNullOrWhiteSpace($finalUri)) {
        throw "Live non-DTT source/carrier audit failed: final API response URL unavailable."
      }
      Assert-PublicUrl $finalUri $allowedApiHosts "final API response" | Out-Null
      $bytes = Get-RawResponseBytes $response
      if ($bytes.Length -gt 4MB) {
        throw "Live non-DTT source/carrier audit failed: API response exceeded 4 MiB."
      }
      $text = [Text.UTF8Encoding]::new($false, $true).GetString($bytes)
      return [pscustomobject]@{
        Payload = ($text | ConvertFrom-Json)
        Receipt = (Get-ResponseReceipt $response $uri $startedAt $completedAt $bytes)
      }
    } catch {
      $errorRecord = $_
      $statusCode = Get-HttpErrorStatusCode $errorRecord
      $script:lastPublicRequestCompletedAt = [DateTimeOffset]::UtcNow
      if (-not (Test-RetryablePublicRequestError $errorRecord $statusCode)) { throw }
      if ($attempt -eq 3) {
        $statusLabel = if ($null -eq $statusCode) { "unavailable" } else { [string]$statusCode }
        throw "Live non-DTT source/carrier audit failed: public API transient HTTP failure after 3 attempts (status $statusLabel)."
      }
      $delaySeconds = Get-PublicRetryDelaySeconds $errorRecord $delays[$attempt - 1] 60
      if ($delaySeconds -lt 0) {
        throw "Live non-DTT source/carrier audit failed: public API Retry-After exceeds the 60-second run limit."
      }
      Start-Sleep -Seconds $delaySeconds
    }
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

function Assert-TemporaryPath([string]$path, [string]$directory) {
  $resolvedDirectory = [IO.Path]::GetFullPath($directory).TrimEnd([IO.Path]::DirectorySeparatorChar)
  $resolvedPath = [IO.Path]::GetFullPath($path)
  $prefix = $resolvedDirectory + [IO.Path]::DirectorySeparatorChar
  if (-not $resolvedPath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Live non-DTT source/carrier audit failed: unsafe temporary path."
  }
  return $resolvedPath
}

function Invoke-PublicDownload(
  [string]$uri,
  [string]$outFile,
  [int64]$expectedBytes,
  [string]$expectedSha256
) {
  Assert-PublicUrl $uri $allowedDownloadHosts "download" | Out-Null
  $safeOutFile = Assert-TemporaryPath $outFile $captureDirectory
  $delays = @(15, 30)
  for ($attempt = 1; $attempt -le 3; $attempt += 1) {
    try {
      Wait-ForPublicRequestPacing 8000
      $startedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers $headers -Method Get -MaximumRedirection 0 `
        -TimeoutSec 180 -OutFile $safeOutFile -PassThru
      $completedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      $script:lastPublicRequestCompletedAt = [DateTimeOffset]::UtcNow
      $finalUri = Get-FinalResponseUrl $response
      if ([string]::IsNullOrWhiteSpace($finalUri)) {
        throw "Live non-DTT source/carrier audit failed: final download response URL unavailable."
      }
      Assert-PublicUrl $finalUri $allowedDownloadHosts "final download" | Out-Null
      $file = Get-Item -LiteralPath $safeOutFile
      if ([int64]$file.Length -ne $expectedBytes) {
        throw "Live non-DTT source/carrier audit failed: downloaded carrier byte count drifted."
      }
      $sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $safeOutFile).Hash.ToLowerInvariant()
      if ($sha256 -cne $expectedSha256) {
        throw "Live non-DTT source/carrier audit failed: downloaded carrier SHA-256 drifted."
      }
      return [ordered]@{
        requestedUrl = $uri
        finalResponseUrl = $finalUri
        requestStartedAt = $startedAt
        requestCompletedAt = $completedAt
        httpStatus = [int]$response.StatusCode
        contentType = Get-HeaderValue $response "Content-Type"
        contentLength = Get-HeaderValue $response "Content-Length"
        etag = Get-HeaderValue $response "ETag"
        lastModified = Get-HeaderValue $response "Last-Modified"
        expectedBytes = $expectedBytes
        expectedSha256 = $expectedSha256
        downloadedBytes = [int64]$file.Length
        downloadedSha256 = $sha256
        expectedIdentityMatched = $true
        rawByteVerificationStatus = "verified"
        temporaryFileDeletedAfterVerification = $false
        cleanupNotApplicable = $false
      }
    } catch {
      if (Test-Path -LiteralPath $safeOutFile -PathType Leaf) {
        Remove-Item -LiteralPath $safeOutFile -Force
      }
      $errorRecord = $_
      $statusCode = Get-HttpErrorStatusCode $errorRecord
      $script:lastPublicRequestCompletedAt = [DateTimeOffset]::UtcNow
      if (-not (Test-RetryablePublicRequestError $errorRecord $statusCode)) { throw }
      if ($attempt -eq 3) {
        $statusLabel = if ($null -eq $statusCode) { "unavailable" } else { [string]$statusCode }
        throw "Live non-DTT source/carrier audit failed: carrier download transient HTTP failure after 3 attempts (status $statusLabel)."
      }
      $delaySeconds = Get-PublicRetryDelaySeconds $errorRecord $delays[$attempt - 1] 120
      if ($delaySeconds -lt 0) {
        throw "Live non-DTT source/carrier audit failed: carrier download Retry-After exceeds the 120-second run limit."
      }
      Start-Sleep -Seconds $delaySeconds
    }
  }
}

function Assert-OfflineParents() {
  $nodeCommand = Get-Command node -ErrorAction Stop
  $commands = @(
    "verify-bazi-dtt-versioned-parent-supersession.mjs",
    "verify-bazi-dtt-version-aware-readiness.mjs",
    "verify-bazi-source-carrier-record-readiness.mjs"
  )
  foreach ($command in $commands) {
    & $nodeCommand.Source (Join-Path $scriptDirectory $command) *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "Live non-DTT source/carrier audit failed: offline parent verifier failed: $command"
    }
  }
}

$outputReceiptJson = $null
try {
  Assert-OfflineParents
  $source = Read-PinnedJson $sourcePath $expectedArtifacts.source.bytes $expectedArtifacts.source.sha256
  $rights = Read-PinnedJson $rightsPath $expectedArtifacts.rights.bytes $expectedArtifacts.rights.sha256
  $carrierReadiness = Read-PinnedJson `
    $carrierReadinessPath `
    $expectedArtifacts.carrierReadiness.bytes `
    $expectedArtifacts.carrierReadiness.sha256

  if ([string]$source.ledgerId -cne $expectedArtifacts.source.ledgerId `
    -or [string]$source.ledgerDigest -cne $expectedArtifacts.source.ledgerDigest `
    -or [string]$rights.ledgerId -cne $expectedArtifacts.rights.ledgerId `
    -or [string]$rights.ledgerDigest -cne $expectedArtifacts.rights.ledgerDigest `
    -or [string]$carrierReadiness.ledgerId -cne $expectedArtifacts.carrierReadiness.ledgerId `
    -or [string]$carrierReadiness.ledgerDigest -cne $expectedArtifacts.carrierReadiness.ledgerDigest) {
    throw "Live non-DTT source/carrier audit failed: pinned local semantic identity drifted."
  }
  if ([int]$carrierReadiness.counts.carrierObservationLayers -ne 5 `
    -or [int]$carrierReadiness.counts.dttCarrierObservationLayers -ne 2 `
    -or [int]$carrierReadiness.counts.formalSourceRightsRecords -ne 0 `
    -or [int]$carrierReadiness.counts.formalSourceCarrierRecords -ne 0 `
    -or [int]$carrierReadiness.counts.sourceBindingsFrozen -ne 0 `
    -or [bool]$carrierReadiness.authorityBoundary.releaseReady `
    -or [bool]$carrierReadiness.authorityBoundary.publicDeploymentAuthorized `
    -or [bool]$carrierReadiness.authorityBoundary.expertClaimsAuthorized) {
    throw "Live non-DTT source/carrier audit failed: carrier readiness red boundary drifted."
  }

  $selectedCandidates = @()
  foreach ($candidateId in $expectedCandidateOrder) {
    $selectedCandidates += Assert-Single @($source.candidates | Where-Object {
        [string]$_.candidateId -ceq $candidateId
      }) "source candidate $candidateId"
  }
  if ($selectedCandidates.Count -ne 3 `
    -or @($selectedCandidates | Where-Object { [string]$_.candidateId -like "dtt-*" }).Count -ne 0) {
    throw "Live non-DTT source/carrier audit failed: non-DTT source selection drifted."
  }

  $captureStartedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  if ($rawByteVerificationRequired) {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $captureDirectory = [IO.Path]::GetFullPath((Join-Path $tempRoot (
          "hakimi-bazi-nondtt-carrier-audit-" + [Guid]::NewGuid().ToString("N")
        )))
    $tempPrefix = $tempRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $captureDirectory.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Live non-DTT source/carrier audit failed: unsafe temporary directory."
    }
    [IO.Directory]::CreateDirectory($captureDirectory) | Out-Null
  }

  $sourceRevisionIds = @($selectedCandidates | ForEach-Object {
      [string]$_.carrierIdentity.revisionId
    })
  $sourceRevisionUri = New-ApiUri "https://zh.wikisource.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "revisions"
      revids = [string]::Join("|", $sourceRevisionIds)
      rvprop = "ids|timestamp|sha1|contentmodel|content"
      rvslots = "main"
    })
  $sourceRevisionBatch = Invoke-PublicApi $sourceRevisionUri
  $sourcePageByRevisionId = @{}
  foreach ($page in @($sourceRevisionBatch.Payload.query.pages)) {
    foreach ($revision in @($page.revisions)) {
      $sourcePageByRevisionId[[string]$revision.revid] = $page
    }
  }

  $carrierTitles = @($selectedCandidates | ForEach-Object {
      [string]$_.facsimileAnchors[0].carrierFileTitle
    })
  $carrierUri = New-ApiUri "https://commons.wikimedia.org/w/api.php" ([ordered]@{
      action = "query"
      format = "json"
      formatversion = "2"
      prop = "imageinfo|revisions"
      titles = [string]::Join("|", $carrierTitles)
      iiprop = "timestamp|url|size|sha1|mime|mediatype|extmetadata"
      rvprop = "ids|timestamp|sha1|contentmodel|content"
      rvslots = "main"
    })
  $carrierBatch = Invoke-PublicApi $carrierUri
  $carrierPageByTitle = @{}
  foreach ($page in @($carrierBatch.Payload.query.pages)) {
    $carrierPageByTitle[[string]$page.title] = $page
  }

  $results = @()
  foreach ($candidate in $selectedCandidates) {
    $sourceCarrier = $candidate.carrierIdentity
    $sourcePage = $sourcePageByRevisionId[[string]$sourceCarrier.revisionId]
    if ($null -eq $sourcePage) {
      throw "Live non-DTT source/carrier audit failed: missing pinned source revision."
    }
    $sourceRevision = $sourcePage.revisions[0]
    $sourceSlot = $sourceRevision.slots.main
    $sourceBody = [string]$sourceSlot.content
    $sourceFacts = Get-Utf8Facts $sourceBody
    if ([int64]$sourcePage.pageid -ne [int64]$sourceCarrier.pageId `
      -or [string]$sourcePage.title -cne [string]$sourceCarrier.pageTitle `
      -or [int64]$sourceRevision.revid -ne [int64]$sourceCarrier.revisionId `
      -or [int64]$sourceRevision.parentid -ne [int64]$sourceCarrier.parentRevisionId `
      -or [string]$sourceRevision.timestamp -cne [string]$sourceCarrier.revisionTimestamp `
      -or [string]$sourceRevision.sha1 -cne [string]$sourceCarrier.mediaWikiSha1 `
      -or [string]$sourceSlot.contentmodel -cne [string]$sourceCarrier.contentModel `
      -or [string]$sourceSlot.contentformat -cne [string]$sourceCarrier.contentFormat `
      -or [int]$sourceFacts.characters -ne [int]$sourceCarrier.rawWikitextCharacters `
      -or [int]$sourceFacts.utf8Bytes -ne [int]$sourceCarrier.rawWikitextUtf8Bytes `
      -or [string]$sourceFacts.sha256 -cne [string]$sourceCarrier.rawWikitextSha256) {
      throw "Live non-DTT source/carrier audit failed: pinned source revision drifted: $($candidate.candidateId)"
    }

    $quoteResults = @()
    foreach ($quote in @($candidate.quoteCandidates)) {
      $start = [int]$quote.rawCharacterStartZeroBased
      $length = [int]$quote.rawCharacterEndExclusive - $start
      $fragment = $sourceBody.Substring($start, $length)
      $fragmentFacts = Get-Utf8Facts $fragment
      $occurrences = Get-OccurrenceCount $sourceBody $fragment
      if ([int]$fragmentFacts.characters -ne [int]$quote.quoteCharacters `
        -or [int]$fragmentFacts.utf8Bytes -ne [int]$quote.quoteUtf8Bytes `
        -or [string]$fragmentFacts.sha256 -cne [string]$quote.quoteSha256 `
        -or $occurrences -ne 1) {
        throw "Live non-DTT source/carrier audit failed: quote locator drifted: $($quote.quoteCandidateId)"
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

    $rightsCandidate = Assert-Single @($rights.candidates | Where-Object {
        [string]$_.sourceCandidateId -ceq [string]$candidate.candidateId
      }) "rights candidate for $($candidate.candidateId)"
    $workParseUri = New-ApiUri "https://zh.wikisource.org/w/api.php" ([ordered]@{
        action = "parse"
        format = "json"
        formatversion = "2"
        oldid = [string]$sourceCarrier.revisionId
        prop = "templates"
      })
    $workParse = Invoke-PublicApi $workParseUri
    $observedWorkTemplates = @($workParse.Payload.parse.templates | ForEach-Object {
        [string]$_.title
      } | Where-Object {
        $_ -match "(^|:)PD|CC|Creative|GFDL"
      } | Sort-Object -Unique)
    $expectedWorkTemplates = @($rightsCandidate.workLayer.observedTemplateNames | ForEach-Object {
        [string]$_
      } | Sort-Object -Unique)
    if ([string]::Join("`n", $observedWorkTemplates) -cne [string]::Join("`n", $expectedWorkTemplates)) {
      throw "Live non-DTT source/carrier audit failed: work notice template projection drifted."
    }

    $anchor = Assert-Single @($candidate.facsimileAnchors) "facsimile anchor for $($candidate.candidateId)"
    $rightsCarrier = Assert-Single @($rightsCandidate.carrierLayers | Where-Object {
        [string]$_.anchorId -ceq [string]$anchor.anchorId
      }) "rights carrier for $($anchor.anchorId)"
    $carrierPage = $carrierPageByTitle[[string]$anchor.carrierFileTitle]
    if ($null -eq $carrierPage) {
      throw "Live non-DTT source/carrier audit failed: missing Commons carrier page."
    }
    $imageInfo = $carrierPage.imageinfo[0]
    $carrierRevision = $carrierPage.revisions[0]
    $carrierSlot = $carrierRevision.slots.main
    $carrierPageBody = [string]$carrierSlot.content
    $carrierPageBodyFacts = Get-Utf8Facts $carrierPageBody
    $metadata = $rightsCarrier.metadataObservation
    $licenseShortName = Get-ExtMetadataValue $imageInfo.extmetadata "LicenseShortName"
    $usageTerms = Get-ExtMetadataValue $imageInfo.extmetadata "UsageTerms"
    $attributionRequired = Get-ExtMetadataValue $imageInfo.extmetadata "AttributionRequired"
    $copyrighted = Get-ExtMetadataValue $imageInfo.extmetadata "Copyrighted"
    $licenseUrl = Get-ExtMetadataValue $imageInfo.extmetadata "LicenseUrl"
    $restrictions = Get-ExtMetadataValue $imageInfo.extmetadata "Restrictions"
    if ([int64]$carrierPage.pageid -ne [int64]$anchor.carrierFilePageId `
      -or [string]$carrierPage.title -cne [string]$anchor.carrierFileTitle `
      -or [string]$imageInfo.timestamp -cne [string]$anchor.carrierFileTimestamp `
      -or [string]$imageInfo.sha1 -cne [string]$anchor.carrierMediaWikiSha1 `
      -or [int64]$imageInfo.size -ne [int64]$anchor.carrierBytes `
      -or [int64]$imageInfo.pagecount -ne [int64]$anchor.carrierPageCount `
      -or [string]$imageInfo.mime -cne [string]$anchor.carrierMime `
      -or $licenseShortName -cne [string]$metadata.licenseShortName `
      -or $usageTerms -cne [string]$metadata.usageTerms `
      -or $attributionRequired -cne [string]$metadata.attributionRequired `
      -or $copyrighted -cne [string]$metadata.copyrighted `
      -or $licenseUrl -cne [string]$metadata.licenseUrl `
      -or $restrictions -cne [string]$metadata.restrictions) {
      throw "Live non-DTT source/carrier audit failed: Commons carrier metadata drifted: $($anchor.anchorId)"
    }

    $carrierParseUri = New-ApiUri "https://commons.wikimedia.org/w/api.php" ([ordered]@{
        action = "parse"
        format = "json"
        formatversion = "2"
        oldid = [string]$carrierRevision.revid
        prop = "templates"
      })
    $carrierParse = Invoke-PublicApi $carrierParseUri
    $carrierTemplates = @($carrierParse.Payload.parse.templates | ForEach-Object {
        [string]$_.title
      } | Where-Object {
        $_ -match "PD|Public|License|Watermark"
      } | Sort-Object -Unique)
    if (-not $carrierTemplates.Contains("Template:PD-scan")) {
      throw "Live non-DTT source/carrier audit failed: expected PD-scan template was not observed."
    }

    $download = [ordered]@{
      requestedUrl = [string]$imageInfo.url
      finalResponseUrl = $null
      requestStartedAt = $null
      requestCompletedAt = $null
      httpStatus = $null
      contentType = $null
      contentLength = $null
      etag = $null
      lastModified = $null
      expectedBytes = [int64]$anchor.carrierBytes
      expectedSha256 = [string]$anchor.carrierSha256
      downloadedBytes = 0
      downloadedSha256 = $null
      expectedIdentityMatched = $false
      rawByteVerificationStatus = if ($rawByteVerificationRequired) {
        "pending_after_metadata_stage"
      } else {
        "not_attempted_explicit_metadata_only"
      }
      temporaryFileCreated = $false
      temporaryFileDeletedAfterVerification = $false
      cleanupNotApplicable = -not $rawByteVerificationRequired
    }

    $results += [ordered]@{
      candidateId = [string]$candidate.candidateId
      bindingId = [string]$candidate.bindingId
      evidenceSubjectId = [string]$candidate.evidenceSubjectId
      sourceRevision = [ordered]@{
        pageId = [int64]$sourceCarrier.pageId
        revisionId = [int64]$sourceCarrier.revisionId
        mediaWikiSha1 = [string]$sourceCarrier.mediaWikiSha1
        rawWikitextCharacters = [int]$sourceFacts.characters
        rawWikitextUtf8Bytes = [int]$sourceFacts.utf8Bytes
        rawWikitextSha256 = [string]$sourceFacts.sha256
        quoteLocatorsVerified = $quoteResults
        sourceBodyStored = $false
        quoteTextsStored = $false
      }
      workNotice = [ordered]@{
        rightsCandidateId = [string]$rightsCandidate.rightsCandidateId
        observedTemplateNames = $observedWorkTemplates
        expectedTemplateProjectionMatched = $true
        pageBodyStored = $false
        legalConclusion = "not_established"
      }
      carrier = [ordered]@{
        anchorId = [string]$anchor.anchorId
        carrierFilePageId = [int64]$anchor.carrierFilePageId
        carrierFileTitle = [string]$anchor.carrierFileTitle
        currentFilePageRevisionId = [int64]$carrierRevision.revid
        currentFilePageParentRevisionId = [int64]$carrierRevision.parentid
        currentFilePageRevisionTimestamp = [string]$carrierRevision.timestamp
        currentFilePageMediaWikiSha1 = [string]$carrierRevision.sha1
        currentFilePageWikitextUtf8Bytes = [int]$carrierPageBodyFacts.utf8Bytes
        currentFilePageWikitextSha256 = [string]$carrierPageBodyFacts.sha256
        relevantTemplatesObserved = $carrierTemplates
        pdScanTemplateObserved = $true
        watermarkTemplateObserved = $carrierTemplates.Contains("Template:Watermark")
        licenseShortNameObserved = $licenseShortName
        usageTermsObserved = $usageTerms
        attributionRequiredObserved = $attributionRequired
        copyrightedObserved = $copyrighted
        noticeState = [string]$rightsCarrier.noticeState
        publicDomainMarkCountsAsLicense = $false
        markerAuthorityAndAccuracyVerified = $false
        noticeApplicabilityEstablished = $false
        carrierIdentityAdjudicated = $false
        workLayerCleared = $false
        editionOrTranscriptionLayerCleared = $false
        carrierLayerCleared = $false
        reproductionAllowed = $false
        quotationAllowed = $false
        redistributionAllowed = $false
        distributionPolicy = "link_only"
        legalConclusion = "not_established"
        filePageBodyStored = $false
        carrierFileStored = $false
        downloadReceipt = $download
      }
      workParseResponse = $workParse.Receipt
      carrierParseResponse = $carrierParse.Receipt
    }
  }

  if ($rawByteVerificationRequired) {
    foreach ($result in $results) {
      $downloadName = ([string]$result.carrier.anchorId -replace "[^a-zA-Z0-9._-]", "_") + ".carrier"
      $downloadPath = Assert-TemporaryPath (Join-Path $captureDirectory $downloadName) $captureDirectory
      $temporaryFiles.Add($downloadPath)
      $download = Invoke-PublicDownload `
        ([string]$result.carrier.downloadReceipt.requestedUrl) `
        $downloadPath `
        ([int64]$result.carrier.downloadReceipt.expectedBytes) `
        ([string]$result.carrier.downloadReceipt.expectedSha256)
      Remove-Item -LiteralPath $downloadPath -Force
      $download.temporaryFileCreated = $true
      $download.temporaryFileDeletedAfterVerification = $true
      $download.cleanupNotApplicable = $false
      $result.carrier.downloadReceipt = $download
    }
  }

  $captureCompletedAt = [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $rawCarrierByteIdentitiesRevalidated = @($results | Where-Object {
      [bool]$_.carrier.downloadReceipt.expectedIdentityMatched
    }).Count
  $rawCarrierBytesDownloaded = [int64](($results | ForEach-Object {
        [int64]$_.carrier.downloadReceipt.downloadedBytes
      } | Measure-Object -Sum).Sum)
  $fullThreeCarrierByteAuditComplete = $rawCarrierByteIdentitiesRevalidated -eq 3
  $doesNotEstablish = @(
    "publisher_authenticity_or_network_provenance",
    "work_edition_transcription_or_carrier_legal_clearance",
    "platform_notice_accuracy_or_jurisdictional_applicability",
    "reproduction_quotation_or_redistribution_permission",
    "formal_source_rights_or_carrier_record",
    "source_body_or_quote_text_storage",
    "content_truth_or_expert_truth",
    "binding_freeze",
    "cross_file_atomic_snapshot_mutation_epoch_interval_mutation_or_aba_exclusion",
    "release_readiness_or_public_release_authorization"
  )
  if (-not $fullThreeCarrierByteAuditComplete) {
    $doesNotEstablish += "original_carrier_raw_byte_identity"
  }
  $outputReceipt = [ordered]@{
    ok = $fullThreeCarrierByteAuditComplete
    recordType = if ($fullThreeCarrierByteAuditComplete) {
      "bazi_nondtt_source_carrier_live_audit_runtime_receipt_v1"
    } else {
      "bazi_nondtt_source_carrier_live_metadata_runtime_receipt_v1"
    }
    status = if ($fullThreeCarrierByteAuditComplete) {
      "public_read_only_point_in_time_three_carrier_bytes_verified_no_rights_adjudication"
    } else {
      "public_read_only_point_in_time_metadata_verified_raw_carrier_bytes_not_attempted_no_rights_adjudication"
    }
    requestedMode = $CarrierByteVerificationMode
    requestedModeCompleted = if ($rawByteVerificationRequired) { $fullThreeCarrierByteAuditComplete } else { $true }
    metadataScopeCompleted = $true
    fullThreeCarrierByteAuditComplete = $fullThreeCarrierByteAuditComplete
    metadataStage = [ordered]@{
      status = "passed"
      sourceRevisionBodiesRevalidatedWithoutStorage = 3
      quoteLocatorsRevalidatedWithoutTextStorage = @($results.sourceRevision.quoteLocatorsVerified).Count
      carrierFilePageRevisionsObserved = 3
    }
    rawByteStage = [ordered]@{
      status = if ($fullThreeCarrierByteAuditComplete) { "passed" } else { "not_evaluated_explicit_metadata_only" }
      attempted = $rawByteVerificationRequired
      verifiedCarrierCount = $rawCarrierByteIdentitiesRevalidated
      expectedCarrierCount = 3
      fullAuditOk = if ($rawByteVerificationRequired) {
        $fullThreeCarrierByteAuditComplete
      } else {
        $null
      }
    }
    captureStartedAt = $captureStartedAt
    captureCompletedAt = $captureCompletedAt
    access = "public_read_only_unauthenticated"
    parentArtifacts = $expectedArtifacts
    releaseGovernance = [ordered]@{
      activeLine = "legacy-v13"
      targetSchema = 13
      migrationId = $null
      mutationEpochAvailable = $false
      mutationEpochReceipt = $null
      publicDeploymentAuthorized = $false
      expertClaimsAuthorized = $false
    }
    requestReceipts = [ordered]@{
      sourceRevisionBatch = $sourceRevisionBatch.Receipt
      carrierMetadataBatch = $carrierBatch.Receipt
    }
    results = $results
    counts = [ordered]@{
      nonDttSourceCandidates = 3
      sourceRevisionBodiesRevalidatedWithoutStorage = 3
      quoteLocatorsRevalidatedWithoutTextStorage = @($results.sourceRevision.quoteLocatorsVerified).Count
      carrierFilePageRevisionsObserved = 3
      carrierRawByteIdentitiesRevalidated = $rawCarrierByteIdentitiesRevalidated
      downloadedCarrierBytes = $rawCarrierBytesDownloaded
      formalKnowledgeDocuments = 0
      formalSourceRightsRecords = 0
      formalSourceCarrierRecords = 0
      materializationsVerified = 0
      rightsAdjudicationReceipts = 0
      verifiedNaturalPersonRightsReviewers = 0
      bindingFrozenVerified = 0
    }
    observationBoundary = [ordered]@{
      operatorRecordedLivePublicResponses = $true
      responseBodyDigestsMechanicallyComputedAtRuntime = $true
      originalCarrierByteDigestsMechanicallyComputedAtRuntime = $fullThreeCarrierByteAuditComplete
      remotePublisherAuthenticityEstablished = $false
      tlsPeerIdentityAttestedIntoReceipt = $false
      wireBytesCaptured = $false
      signedTimestampEstablished = $false
      futureFreshnessEstablished = $false
      crossFileAtomicSnapshot = $false
      intervalMutationExcluded = $false
      abaExcluded = $false
    }
    authorityBoundary = [ordered]@{
      contentTruthEstablished = $false
      expertTruthEstablished = $false
      rightsLegalConclusionEstablished = $false
      sourceBundleComplete = $false
      rightsBundleComplete = $false
      releaseReady = $false
      publicDeploymentAuthorized = $false
      expertClaimsAuthorized = $false
    }
    doesNotEstablish = $doesNotEstablish
  }
  $outputReceiptJson = $outputReceipt | ConvertTo-Json -Depth 20
} finally {
  foreach ($temporaryFile in $temporaryFiles) {
    if ($null -ne $captureDirectory) {
      $safeTemporaryFile = Assert-TemporaryPath $temporaryFile $captureDirectory
      if (Test-Path -LiteralPath $safeTemporaryFile -PathType Leaf) {
        Remove-Item -LiteralPath $safeTemporaryFile -Force
      }
    }
  }
  if ($null -ne $captureDirectory) {
    $resolvedCaptureDirectory = [IO.Path]::GetFullPath($captureDirectory)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $tempPrefix = $tempRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedCaptureDirectory.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Live non-DTT source/carrier audit failed: unsafe cleanup directory."
    }
    if (Test-Path -LiteralPath $resolvedCaptureDirectory -PathType Container) {
      $remainingEntries = @(Get-ChildItem -LiteralPath $resolvedCaptureDirectory -Force)
      if ($remainingEntries.Count -ne 0) {
        throw "Live non-DTT source/carrier audit failed: temporary cleanup directory is not empty."
      }
      [IO.Directory]::Delete($resolvedCaptureDirectory, $false)
    }
  }
}

if ($null -eq $outputReceiptJson) {
  throw "Live non-DTT source/carrier audit failed: output receipt was not constructed."
}
$outputReceiptJson

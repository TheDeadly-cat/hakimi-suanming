$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptDirectory
$rightsSelectorPath = Join-Path $scriptDirectory "resolve-bazi-current-source-rights.mjs"
$sourceSelectorPath = Join-Path $scriptDirectory "resolve-bazi-current-source-binding.mjs"
$rightsSelectorOutput = @(& node $rightsSelectorPath)
if ($LASTEXITCODE -ne 0 -or $rightsSelectorOutput.Count -ne 1) {
  throw "Live Bazi source-rights candidate audit failed: canonical rights current selection unavailable."
}
$sourceSelectorOutput = @(& node $sourceSelectorPath)
if ($LASTEXITCODE -ne 0 -or $sourceSelectorOutput.Count -ne 1) {
  throw "Live Bazi source-rights candidate audit failed: canonical source current selection unavailable."
}
$rightsSelection = $rightsSelectorOutput[0] | ConvertFrom-Json
$sourceSelection = $sourceSelectorOutput[0] | ConvertFrom-Json
if ([string]$rightsSelection.purpose -cne "bazi_source_rights" `
  -or [bool]$rightsSelection.currentAvailable -ne $true `
  -or [string]$rightsSelection.selection.familyKey -cne "content/bazi-strength-source-rights-candidates" `
  -or [string]$sourceSelection.purpose -cne "bazi_source_binding" `
  -or [bool]$sourceSelection.currentAvailable -ne $true `
  -or [string]$sourceSelection.selection.familyKey -cne "content/bazi-strength-source-binding-candidates") {
  throw "Live Bazi source-rights candidate audit failed: canonical current selection shape drifted."
}
$rightsLedgerPath = [string]$rightsSelection.artifact.absolutePath
$sourceLedgerPath = [string]$sourceSelection.artifact.absolutePath
if (-not (Test-Path -LiteralPath $rightsLedgerPath -PathType Leaf) `
  -or -not (Test-Path -LiteralPath $sourceLedgerPath -PathType Leaf)) {
  throw "Live Bazi source-rights candidate audit failed: selected ledger path is unavailable."
}
$rightsLedger = Get-Content -LiteralPath $rightsLedgerPath -Raw -Encoding UTF8 | ConvertFrom-Json
$sourceLedger = Get-Content -LiteralPath $sourceLedgerPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ([string]$rightsLedger.sourceBindingLedger.ledgerDigest -cne [string]$sourceLedger.ledgerDigest) {
  throw "Live Bazi source-rights candidate audit failed: source ledger digest link drifted."
}

$headers = @{ "User-Agent" = "HakimiRightsAudit/1.0 (read-only public metadata verification)" }

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

$policyResults = @()
foreach ($policy in @($rightsLedger.policyEvidence | Where-Object { $null -ne $_.revisionId })) {
  $endpoint = if ([string]$policy.provider -ceq "Wikimedia Foundation Governance Wiki") {
    "https://foundation.wikimedia.org/w/api.php"
  } elseif ([string]$policy.provider -ceq "Wikimedia Commons") {
    "https://commons.wikimedia.org/w/api.php"
  } else {
    throw "Live Bazi source-rights candidate audit failed: unknown MediaWiki policy provider."
  }
  $uri = New-ApiUri $endpoint @{
    action = "query"
    format = "json"
    formatversion = "2"
    prop = "revisions"
    revids = [string]$policy.revisionId
    rvprop = "ids|timestamp|sha1"
    rvslots = "main"
  }
  $page = (Invoke-PublicApi $uri).query.pages[0]
  $revision = $page.revisions[0]
  $matches = (
    [int64]$page.pageid -eq [int64]$policy.pageId -and
    [string]$page.title -ceq [string]$policy.title -and
    [int64]$revision.revid -eq [int64]$policy.revisionId -and
    [int64]$revision.parentid -eq [int64]$policy.parentRevisionId -and
    ([DateTimeOffset]$revision.timestamp).ToUniversalTime() -eq ([DateTimeOffset]$policy.revisionTimestamp).ToUniversalTime() -and
    [string]$revision.sha1 -ceq [string]$policy.mediaWikiSha1
  )
  if (-not $matches) {
    throw "Live Bazi source-rights candidate audit failed: $($policy.policyId) policy revision drifted."
  }
  $policyResults += [ordered]@{
    policyId = [string]$policy.policyId
    revisionId = [int64]$policy.revisionId
    mediaWikiSha1 = [string]$policy.mediaWikiSha1
    legalConclusion = "not_established"
  }
}

$sourceByCandidateId = @{}
foreach ($sourceCandidate in $sourceLedger.candidates) {
  $sourceByCandidateId[[string]$sourceCandidate.candidateId] = $sourceCandidate
}

$carrierTitles = @($rightsLedger.candidates.carrierLayers | ForEach-Object {
    [string]$_.carrierFileTitle
  } | Sort-Object -Unique)
$carrierUri = New-ApiUri "https://commons.wikimedia.org/w/api.php" @{
  action = "query"
  format = "json"
  formatversion = "2"
  prop = "imageinfo"
  titles = [string]::Join("|", $carrierTitles)
  iiprop = "timestamp|size|sha1|mime|extmetadata"
}
$carrierBatch = Invoke-PublicApi $carrierUri
$filePageByTitle = @{}
foreach ($filePage in @($carrierBatch.query.pages)) {
  $filePageByTitle[[string]$filePage.title] = $filePage
}

$candidateResults = @()
foreach ($candidate in $rightsLedger.candidates) {
  $sourceCandidate = $sourceByCandidateId[[string]$candidate.sourceCandidateId]
  if ($null -eq $sourceCandidate) {
    throw "Live Bazi source-rights candidate audit failed: missing linked source candidate."
  }
  $parseUri = New-ApiUri "https://zh.wikisource.org/w/api.php" @{
    action = "parse"
    format = "json"
    formatversion = "2"
    oldid = [string]$sourceCandidate.carrierIdentity.revisionId
    prop = "templates"
  }
  $parsed = Invoke-PublicApi $parseUri
  $observedTemplates = @($parsed.parse.templates | ForEach-Object { [string]$_.title } | Where-Object {
      $_ -match "PD|公有|公版|版权|版權|著作权|著作權|CC|Creative|GFDL"
    } | Sort-Object)
  $expectedTemplates = @($candidate.workLayer.observedTemplateNames | ForEach-Object { [string]$_ } | Sort-Object)
  $separator = [string][char]10
  if ([string]::Join($separator, $observedTemplates) -cne [string]::Join($separator, $expectedTemplates)) {
    throw "Live Bazi source-rights candidate audit failed: $($candidate.rightsCandidateId) page notice templates drifted."
  }

  $carrierResults = @()
  foreach ($carrier in @($candidate.carrierLayers)) {
    $filePage = $filePageByTitle[[string]$carrier.carrierFileTitle]
    if ($null -eq $filePage) {
      throw "Live Bazi source-rights candidate audit failed: missing batched Commons metadata for $($carrier.anchorId)."
    }
    $imageInfo = $filePage.imageinfo[0]
    $metadata = $carrier.metadataObservation
    $metadataMatches = (
      [int64]$filePage.pageid -eq [int64]$carrier.carrierFilePageId -and
      [string]$imageInfo.sha1 -ceq [string]$carrier.carrierMediaWikiSha1 -and
      [string]$imageInfo.extmetadata.LicenseShortName.value -ceq [string]$metadata.licenseShortName -and
      [string]$imageInfo.extmetadata.UsageTerms.value -ceq [string]$metadata.usageTerms -and
      [string]$imageInfo.extmetadata.AttributionRequired.value -ceq [string]$metadata.attributionRequired -and
      [string]$imageInfo.extmetadata.Copyrighted.value -ceq [string]$metadata.copyrighted -and
      [string]$imageInfo.extmetadata.LicenseUrl.value -ceq [string]$metadata.licenseUrl -and
      [string]$imageInfo.extmetadata.Restrictions.value -ceq [string]$metadata.restrictions
    )
    if (-not $metadataMatches) {
      throw "Live Bazi source-rights candidate audit failed: $($candidate.rightsCandidateId)/$($carrier.anchorId) Commons rights metadata drifted."
    }
    $carrierResults += [ordered]@{
      anchorId = [string]$carrier.anchorId
      commonsLicenseShortName = [string]$metadata.licenseShortName
      commonsMetadataOnlyNotLegalConclusion = $true
      formalSourceCarrierRecordCreated = $false
      distributionPolicy = "link_only"
      legalConclusion = "not_established"
    }
  }

  $candidateResults += [ordered]@{
    rightsCandidateId = [string]$candidate.rightsCandidateId
    pageSpecificNoticeObservation = [string]$candidate.workLayer.pageSpecificNoticeObservation
    observedTemplateCount = $observedTemplates.Count
    carrierLayerCount = @($candidate.carrierLayers).Count
    carrierResults = $carrierResults
    formalSourceRightsRecordCreated = $false
    distributionPolicy = "link_only"
    legalConclusion = "not_established"
  }
}

[ordered]@{
  ok = $true
  access = "public_read_only_unauthenticated"
  requestBatches = [ordered]@{
    policyRevisions = @($rightsLedger.policyEvidence | Where-Object { $null -ne $_.revisionId }).Count
    pageNoticeParses = @($rightsLedger.candidates).Count
    carrierMetadata = 1
  }
  ledgerDigest = [string]$rightsLedger.ledgerDigest
  policyRevisionResults = $policyResults
  nonMediaWikiPolicyEvidenceCount = @($rightsLedger.policyEvidence | Where-Object { $null -eq $_.revisionId }).Count
  candidateResults = $candidateResults
  redistributableSources = [int]$rightsLedger.gateSummary.redistributableSources
  rightsBundleComplete = [bool]$rightsLedger.gateSummary.rightsBundleComplete
  publicDeploymentAuthorized = [bool]$rightsLedger.gateSummary.publicDeploymentAuthorized
  expertClaimsAuthorized = [bool]$rightsLedger.gateSummary.expertClaimsAuthorized
} | ConvertTo-Json -Depth 8

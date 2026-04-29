param(
  [string]$Repo = "michelpronkk-oss/rtrim"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[runtrim] $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[runtrim] $Message" -ForegroundColor Yellow
}

Write-Step "Checking GitHub CLI availability"
try {
  $null = gh --version
} catch {
  Write-Warn "GitHub CLI is not installed. Install from https://cli.github.com/ and rerun this script."
  exit 1
}

Write-Step "Checking GitHub authentication status"
$authOutput = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Warn "GitHub CLI is not authenticated. Run: gh auth login"
  Write-Host $authOutput
  exit 1
}

Write-Step "Applying repository description and homepage"
gh repo edit $Repo --description "Local-first control layer for AI coding agents." --homepage "https://www.runtrim.com"

Write-Step "Applying repository topics"
$topics = @(
  "ai",
  "cli",
  "developer-tools",
  "claude",
  "codex",
  "cursor",
  "typescript",
  "local-first",
  "ai-agents"
)

foreach ($topic in $topics) {
  gh repo edit $Repo --add-topic $topic
}

Write-Step "Repository metadata updated"
Write-Host ""
Write-Host "Manual follow-ups:" -ForegroundColor Green
Write-Host "1. Rename repo rtrim -> runtrim (if available)."
Write-Host "2. Update profile avatar to RunTrim mark."
Write-Host "3. Pin only RunTrim repository."
Write-Host "4. Make unrelated product repositories private manually."
Write-Host ""
Write-Host "Safety note: this script does not change repository visibility."

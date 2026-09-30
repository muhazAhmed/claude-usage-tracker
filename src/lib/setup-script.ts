// PowerShell scripts served by /api/setup. Kept free of backticks and "${"
// so they can live in String.raw templates; placeholders are filled per request.

const COMMON = String.raw`
$ErrorActionPreference = "Stop"
$Endpoint = "__ENDPOINT__"
$Token = "__TOKEN__"
$dir = Join-Path $env:USERPROFILE ".claude"
$file = Join-Path $dir "settings.json"
$keys = @("CLAUDE_CODE_ENABLE_TELEMETRY", "OTEL_LOGS_EXPORTER", "OTEL_EXPORTER_OTLP_PROTOCOL", "OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS", "OTEL_RESOURCE_ATTRIBUTES")

function Read-Settings {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  if (Test-Path $file) {
    $text = [IO.File]::ReadAllText($file)
    Copy-Item $file ($file + ".bak") -Force
    if ($text.Trim()) { return ($text | ConvertFrom-Json) }
  }
  return [pscustomobject]@{}
}

function Write-Settings($settings) {
  $json = $settings | ConvertTo-Json -Depth 32
  [IO.File]::WriteAllText($file, $json, (New-Object System.Text.UTF8Encoding($false)))
}
`;

const INSTALL = String.raw`
Write-Host ""
Write-Host "Claude usage tracker setup" -ForegroundColor Cyan
Write-Host "From now on, Claude Code on this PC reports usage (model, tokens, cost) plus the"
Write-Host "computer name, Windows username and IP address to the team usage dashboard."
Write-Host "Prompt text and code are NOT sent."
Write-Host ""
$label = Read-Host "Your name or a nickname for this PC (optional, press Enter to skip)"

$settings = Read-Settings
if (-not $settings.PSObject.Properties["env"]) {
  $settings | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{})
}

function Enc($s) { [uri]::EscapeDataString($s) }
$attrs = "host.name=" + (Enc $env:COMPUTERNAME) + ",os.user=" + (Enc $env:USERNAME) + ",os.type=windows"
if ($label -and $label.Trim()) { $attrs += ",device.label=" + (Enc $label.Trim()) }

$vars = [ordered]@{
  CLAUDE_CODE_ENABLE_TELEMETRY = "1"
  OTEL_LOGS_EXPORTER = "otlp"
  OTEL_EXPORTER_OTLP_PROTOCOL = "http/json"
  OTEL_EXPORTER_OTLP_ENDPOINT = $Endpoint
  OTEL_EXPORTER_OTLP_HEADERS = "x-ingest-key=" + $Token
  OTEL_RESOURCE_ATTRIBUTES = $attrs
}
foreach ($k in $vars.Keys) {
  $settings.env | Add-Member -NotePropertyName $k -NotePropertyValue $vars[$k] -Force
}
Write-Settings $settings
Write-Host "Updated $file (backup saved as settings.json.bak)" -ForegroundColor Green

# Register this PC right away so it shows up on the dashboard.
$nanos = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() * 1000000).ToString()
$res = @(
  @{ key = "host.name"; value = @{ stringValue = $env:COMPUTERNAME } },
  @{ key = "os.user"; value = @{ stringValue = $env:USERNAME } },
  @{ key = "os.type"; value = @{ stringValue = "windows" } }
)
if ($label -and $label.Trim()) { $res += @{ key = "device.label"; value = @{ stringValue = $label.Trim() } } }
$record = @{ timeUnixNano = $nanos; body = @{ stringValue = "claude_code.tracker_setup" }; attributes = @(@{ key = "event.name"; value = @{ stringValue = "tracker_setup" } }) }
$payload = @{ resourceLogs = @(@{ resource = @{ attributes = $res }; scopeLogs = @(@{ logRecords = @($record) }) }) } | ConvertTo-Json -Depth 12
try {
  Invoke-RestMethod -Method Post -Uri ($Endpoint + "/v1/logs") -Headers @{ "x-ingest-key" = $Token } -ContentType "application/json" -Body $payload | Out-Null
  Write-Host "This PC is registered on the dashboard." -ForegroundColor Green
} catch {
  Write-Host ("Could not reach the dashboard: " + $_.Exception.Message) -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Done. Restart Claude Code (close terminals and reload VS Code) for tracking to start." -ForegroundColor Cyan
`;

const REMOVE = String.raw`
$settings = Read-Settings
if ($settings.PSObject.Properties["env"]) {
  foreach ($k in $keys) { $settings.env.PSObject.Properties.Remove($k) }
}
Write-Settings $settings
Write-Host "Usage tracking removed from $file. Restart Claude Code to apply." -ForegroundColor Green
`;

export function setupScript(opts: { endpoint: string; token: string; remove: boolean }) {
  return (COMMON + (opts.remove ? REMOVE : INSTALL))
    .replace("__ENDPOINT__", opts.endpoint)
    .replace("__TOKEN__", opts.token);
}

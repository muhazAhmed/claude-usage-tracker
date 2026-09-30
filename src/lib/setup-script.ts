// Setup scripts served by /api/setup. Kept free of backticks and "${" so they
// can live in String.raw templates; placeholders are filled per request.

const WINDOWS = String.raw`
$ErrorActionPreference = "Stop"
$Endpoint = "__ENDPOINT__"
$Token = "__TOKEN__"
$dir = Join-Path $env:USERPROFILE ".claude"
$file = Join-Path $dir "settings.json"

Write-Host ""
Write-Host "Claude usage tracker setup" -ForegroundColor Cyan
Write-Host "From now on, Claude Code on this PC reports usage (model, tokens, cost) plus the"
Write-Host "computer name, Windows username and IP address to the team usage dashboard."
Write-Host "Prompt text and code are NOT sent."
Write-Host ""
$label = Read-Host "Your name or a nickname for this PC (optional, press Enter to skip)"

if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$settings = [pscustomobject]@{}
if (Test-Path $file) {
  $text = [IO.File]::ReadAllText($file)
  Copy-Item $file ($file + ".bak") -Force
  if ($text.Trim()) { $settings = $text | ConvertFrom-Json }
}
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
$json = $settings | ConvertTo-Json -Depth 32
[IO.File]::WriteAllText($file, $json, (New-Object System.Text.UTF8Encoding($false)))
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

// macOS (and Linux). The settings file is merged with JavaScript for
// Automation, which ships with every Mac; Linux falls back to python3.
const UNIX = String.raw`#!/bin/bash
set -e
ENDPOINT="__ENDPOINT__"
TOKEN="__TOKEN__"

echo ""
echo "Claude usage tracker setup"
echo "From now on, Claude Code on this computer reports usage (model, tokens, cost) plus the"
echo "computer name, username and IP address to the team usage dashboard."
echo "Prompt text and code are NOT sent."
echo ""
printf "Your name or a nickname for this computer (optional, press Enter to skip): "
LABEL=""
{ read -r LABEL < /dev/tty; } 2>/dev/null || echo ""

if [ "$(uname -s)" = "Darwin" ]; then
  CUT_OS="darwin"
  CUT_HOST="$(scutil --get ComputerName 2>/dev/null || hostname -s)"
else
  CUT_OS="linux"
  CUT_HOST="$(hostname)"
fi
mkdir -p "$HOME/.claude"
CUT_FILE="$HOME/.claude/settings.json"
CUT_PAYLOAD="$(mktemp)"
if [ -f "$CUT_FILE" ]; then cp "$CUT_FILE" "$CUT_FILE.bak"; fi
CUT_LABEL="$LABEL"
CUT_USER="$(id -un)"
CUT_ENDPOINT="$ENDPOINT"
CUT_TOKEN="$TOKEN"
export CUT_FILE CUT_PAYLOAD CUT_OS CUT_HOST CUT_LABEL CUT_USER CUT_ENDPOINT CUT_TOKEN

if command -v osascript >/dev/null 2>&1; then
osascript -l JavaScript >/dev/null <<'JS'
ObjC.import("Foundation");
var env = $.NSProcessInfo.processInfo.environment;
function get(k) { return ObjC.unwrap(env.objectForKey(k)) || ""; }
function readText(p) {
  if (!$.NSFileManager.defaultManager.fileExistsAtPath(p)) return "";
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null)) || "";
}
function writeText(p, t) { $(t).writeToFileAtomicallyEncodingError(p, true, $.NSUTF8StringEncoding, null); }
var file = get("CUT_FILE"), label = get("CUT_LABEL").trim();
var text = readText(file);
var s = text.trim() ? JSON.parse(text) : {};
var attrs = "host.name=" + encodeURIComponent(get("CUT_HOST")) + ",os.user=" + encodeURIComponent(get("CUT_USER")) + ",os.type=" + get("CUT_OS");
if (label) attrs += ",device.label=" + encodeURIComponent(label);
s.env = s.env || {};
s.env.CLAUDE_CODE_ENABLE_TELEMETRY = "1";
s.env.OTEL_LOGS_EXPORTER = "otlp";
s.env.OTEL_EXPORTER_OTLP_PROTOCOL = "http/json";
s.env.OTEL_EXPORTER_OTLP_ENDPOINT = get("CUT_ENDPOINT");
s.env.OTEL_EXPORTER_OTLP_HEADERS = "x-ingest-key=" + get("CUT_TOKEN");
s.env.OTEL_RESOURCE_ATTRIBUTES = attrs;
writeText(file, JSON.stringify(s, null, 2) + "\n");
var res = [["host.name", get("CUT_HOST")], ["os.user", get("CUT_USER")], ["os.type", get("CUT_OS")]];
if (label) res.push(["device.label", label]);
var payload = { resourceLogs: [{
  resource: { attributes: res.map(function (r) { return { key: r[0], value: { stringValue: r[1] } }; }) },
  scopeLogs: [{ logRecords: [{
    timeUnixNano: String(Date.now()) + "000000",
    body: { stringValue: "claude_code.tracker_setup" },
    attributes: [{ key: "event.name", value: { stringValue: "tracker_setup" } }]
  }] }]
}] };
writeText(get("CUT_PAYLOAD"), JSON.stringify(payload));
JS
elif command -v python3 >/dev/null 2>&1; then
python3 - <<'PY'
import json, os, time, urllib.parse
g = os.environ.get
file, label = g("CUT_FILE"), (g("CUT_LABEL") or "").strip()
s = {}
if os.path.exists(file):
    text = open(file, encoding="utf-8").read()
    if text.strip():
        s = json.loads(text)
q = lambda v: urllib.parse.quote(v, safe="")
attrs = "host.name=" + q(g("CUT_HOST")) + ",os.user=" + q(g("CUT_USER")) + ",os.type=" + g("CUT_OS")
if label:
    attrs += ",device.label=" + q(label)
env = s.setdefault("env", {})
env.update({
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_ENDPOINT": g("CUT_ENDPOINT"),
    "OTEL_EXPORTER_OTLP_HEADERS": "x-ingest-key=" + g("CUT_TOKEN"),
    "OTEL_RESOURCE_ATTRIBUTES": attrs,
})
with open(file, "w", encoding="utf-8") as f:
    json.dump(s, f, indent=2)
    f.write("\n")
res = [("host.name", g("CUT_HOST")), ("os.user", g("CUT_USER")), ("os.type", g("CUT_OS"))]
if label:
    res.append(("device.label", label))
payload = {"resourceLogs": [{
    "resource": {"attributes": [{"key": k, "value": {"stringValue": v}} for k, v in res]},
    "scopeLogs": [{"logRecords": [{
        "timeUnixNano": str(int(time.time() * 1000) * 1000000),
        "body": {"stringValue": "claude_code.tracker_setup"},
        "attributes": [{"key": "event.name", "value": {"stringValue": "tracker_setup"}}],
    }]}],
}]}
open(g("CUT_PAYLOAD"), "w").write(json.dumps(payload))
PY
else
  echo "Needs osascript (macOS) or python3 to update the settings file." >&2
  exit 1
fi
echo "Updated $CUT_FILE (backup saved as settings.json.bak)"

# Register this computer right away so it shows up on the dashboard.
if curl -fsS -X POST "$ENDPOINT/v1/logs" -H "content-type: application/json" -H "x-ingest-key: $TOKEN" --data-binary "@$CUT_PAYLOAD" >/dev/null; then
  echo "This computer is registered on the dashboard."
else
  echo "Could not reach the dashboard."
fi
rm -f "$CUT_PAYLOAD"
echo ""
echo "Done. Restart Claude Code (close terminals and restart VS Code) for tracking to start."
`;

export type SetupOs = "windows" | "mac";

export function setupScript(opts: { endpoint: string; token: string; os: SetupOs }) {
  return (opts.os === "mac" ? UNIX : WINDOWS).replace("__ENDPOINT__", opts.endpoint).replace("__TOKEN__", opts.token);
}

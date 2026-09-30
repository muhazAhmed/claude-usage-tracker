# Claude Usage Tracker

A dashboard for one shared Claude account. It shows which PC used Claude Code, when, where from (IP and city), with which model, and how many tokens and dollars.

Each PC runs a one-time PowerShell command. It turns on Claude Code's built-in OpenTelemetry export and tags the PC with its computer name, Windows username and an optional nickname. Claude Code then sends an event for every API request to `/api/otel/v1/logs`. The app stores each event in MongoDB and adds the sender's IP and location, which come from Vercel's geo headers.

Prompt text and code are never sent. Claude Code only sends prompt length unless `OTEL_LOG_USER_PROMPTS` is set, and the setup script doesn't set it.

## What it can't see

- Claude Code on PCs that haven't run the setup command.
- claude.ai in the browser, and the desktop and mobile apps. They don't send telemetry.

## Setup

1. **MongoDB**: any MongoDB works, for example an Atlas cluster. On Atlas, allow access from anywhere (`0.0.0.0/0`), because Vercel doesn't use fixed IPs.
2. **Deploy to Vercel**: import this repo and set these environment variables:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | your connection string |
   | `MONGODB_DB` | `claude_usage` (optional) |
   | `DASHBOARD_PASSWORD` | password for the dashboard |
   | `INGEST_TOKEN` | random secret, e.g. `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |
   | `DASHBOARD_TZ` | `Asia/Dubai` (optional, the default) |
   | `ACCOUNT_LABEL` | name shown in the sidebar (optional) |

3. **Add PCs**: open the dashboard, sign in, and copy the command under **Add a PC**. Paste it into PowerShell on each PC, then restart Claude Code (close terminals and reload VS Code). The PC shows up right away as "Active now".

   The command looks like `irm "https://<app>/api/setup?key=<INGEST_TOKEN>" | iex`. It edits `~/.claude/settings.json`, adds only the tracking variables to its `env` block, and saves a backup as `settings.json.bak`. The dashboard also shows a matching command that removes tracking from a PC.

## Local development

```
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

## Data

- `events`: one document per Claude Code event (`api_request`, `user_prompt`, `tool_result`, …) with device, IP, location, model, tokens and cost.
- `devices`: one document per PC and Windows user, with its last IP, location and when it was first and last seen.

**Export CSV** downloads the raw requests for the current filters.
